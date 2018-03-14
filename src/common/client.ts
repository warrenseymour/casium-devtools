import StateManager from 'casium/runtime/state_manager';
import ExecContext, { cmdName } from 'casium/runtime/exec_context';
import { Container, GenericObject } from 'casium';
import { Client as DevToolsClient, NotifyMessage } from 'casium/dev_tools';
import { contains, filter, flatten, is, map, merge, pipe, when } from 'ramda';
import { safeStringify, safeParse } from 'casium/util';

declare global {
  interface Window {
    __CASIUM_DEVTOOLS_GLOBAL_CLIENT__: Client;
  }
}

export type SerializedCommand = [string, GenericObject];

/**
 * Describes the serialized form of a Message that is emitted by the 'message'
 * event.
 */
export type SerializedMessage = {
  context: string;
  id: string;
  ts: number;
  name: string;
  prev: GenericObject;
  next: GenericObject;
  path: string[];
  relay: GenericObject;
  message: string;
  data?: GenericObject;
  commands: SerializedCommand[];
}

/**
 * A ClientInterface implementation should broadcast this message when the DevTools
 * Client and DevTools UI have both connected.
 */
export type ConnectedMessage = { type: 'connected' };

/**
 * A ClientInterface implementation should broadcast this message when either the
 * DevTools Client or DevTools UI have disconnected.
 */
export type DisconnectedMessage = { type: 'disconnected' };

/**
 * A ClientInterface implementation should send this message to the DevTools UI
 * when the DevTools client receives a new Casium message.
 */
export type NewMessage = {
  type: 'message',
  message: SerializedMessage
};

/**
 * A ClientInterface implementation should send this message to the DevTools
 * Client when the DevTools UI requests the application state be reset to the
 * result of a specific Message.
 */
export type TimeTravelMessage = {
  type: 'timeTravel',
  to: SerializedMessage
};

/**
 * A ClientInterface implementation should send this message to the DevTools
 * Client when the DevTools UI requests a dependency trace for a specific
 * Message.
 */
export type DependencyTraceMessage = {
  type: 'dependencyTrace',
  messages: SerializedMessage[]
};

/**
 * A ClientInterface implementation should send this message to the DevTools UI
 * when the DevTools client has completed a dependency trace.
 */
export type DependencyTraceResultMessage = {
  type: 'dependencyTraceResult',
  result: DependencyTraceResult[]
};

/**
 * Any message sent to/from the Client should be one of the preceeding types,
 * plus a `source` property.
 */
export type Message = Partial<{ source: string } & (
  ConnectedMessage | DisconnectedMessage | NewMessage | TimeTravelMessage | DependencyTraceMessage | DependencyTraceResult
)>;

/**
 * Contains the paths on `model`, `message` and `relay` that were accessed by an
 * Updater function
 */
export type DependencyTraceResult = {
  model: string[][];
  message: string[][];
  relay: string[][];
}

const serialize = map<GenericObject, SerializedMessage>(pipe(safeStringify, safeParse));

const setSource = merge({ source: 'CasiumDevToolsClient' });

export const appendUniquePath = (paths: string[][]) => when<string[], void>(
  path => !contains(path, paths),
  path => paths.push(path)
)

/**
 * Wraps `obj` in a Proxy that calls `onRead` every time a property is accessed.
 * If the value of the property is also an object, then a child Proxy will be
 * created which will also log property accesses to `onRead`.
 */
export const deepGetProxy = <T extends GenericObject>(obj: T, onRead: (path: string[]) => void, parents: string[] = []): T =>
  new Proxy(obj, {
    get<K extends keyof T>(target: T, key: K) {
      const value = target[key];
      const fullPath = parents.concat(key);
      onRead(fullPath);

      return is(Object, value) ?
        deepGetProxy(value, onRead, fullPath) :
        value;
    },

    ownKeys<K extends keyof T>(target: T) {
      const keys = Reflect.ownKeys(target) as K[];

      keys.forEach(key => onRead(parents.concat(key)));

      return keys;
    }
  });


/**
 * The DevTools Client is responsible for all communication between the
 * application being inspected and the DevTools UI. This interface is exposed as
 * `window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__` in the context of inspected page.
 *
 * A DevTools UI instance can subscribe to new messages using the `subscribe`
 * method, and release this subscription using `unsubscribe`. Multiple
 * subscribers should distinguish themselves providing a unique ID, making it
 * possible (although rare) for multiple DevTools instances to interact with the
 * same Client.
 *
 * The Client also implements a simple message queueing mechanism; if there are
 * no subscribers attached when a message is emitted, it is appended to
 * `_queue`. When the subscriber is attached, it will be called with each
 * message present in `_queue` and the queue will then be cleared.
 */
export class Client implements DevToolsClient {
  protected _session = Date.now() + Math.random().toString(36).substr(2);
  protected _messageCounter = 0;

  protected _queues: { [id: string]: Message[] } = {};
  protected _subscribers: { [id: string]: (msg: Message) => void } = {};

  public contexts: { [id: string]: ExecContext<any> } = {};
  public root?: StateManager;
  public containers: Container<any>[] = [];

  /**
   * Called by the Casium runtime whenever a message is dispatched by the
   * inspected application. Serializes the message so that it may reliably
   * transmitted across boundaries such as `window.postMessage` or a WebSocket
   * payload.
   */
  public notify(message: NotifyMessage) {
    const { context, msg, prev, next, path, cmds } = message;
    const { container } = context;
    const name = container ? container.name : 'Unknown';

    const serialized = serialize({
      context: context.id,
      id: this._session + this._nextId(),
      ts: Date.now(),
      name,
      prev,
      next,
      path,
      relay: context.relay(),
      message: msg && msg.constructor && msg.constructor.name || `Init (${name})`,
      data: msg && msg.data,
      commands: pipe(flatten as any, filter(is(Object)), (map as any)((cmd: any) => [cmdName(cmd), cmd.data]))(cmds),
    });

    this.contexts[context.id] = context;
    container && (this.containers.includes(container) || this.containers.push(container));
    this._emit({
      type: 'message',
      message: serialized
    });
  }

  /**
   * Called By the Casium runtime when the root container element is created
   */
  public intercept(stateManager: StateManager) {
    this.root = stateManager;
    return stateManager;
  }

  public createQueue(id: string) {
    this._queues[id] = [];
  }

  public subscribe(id: string, fn: (msg: Message) => void) {
    this._subscribers[id] = fn;

    const queue = this._queues[id];
    if (queue && queue.length) {
      queue.forEach(msg => fn(setSource(msg)));
      this.createQueue(id);
    }
  }

  public unsubscribe(id: string) {
    delete this._subscribers[id];
    this.createQueue(id);
  }

  public dependencyTrace(messages: SerializedMessage[]) {
    return messages.map(msg => {
      const updater = this.getUpdater(msg);

      const result: DependencyTraceResult = {
        model: [],
        message: [],
        relay: []
      };

      const model = deepGetProxy(msg.prev, appendUniquePath(result.model));
      const message = deepGetProxy(msg.data || {}, appendUniquePath(result.message));
      const relay = deepGetProxy(msg.relay, appendUniquePath(result.relay));

      updater(model, message, relay);

      return result;
    })
  }

  /**
   * Retrieves the Updater function that was used to process a specific Message
   */
  public getUpdater(msg: SerializedMessage) {
    const context = this.contexts[msg.context];
    if (!context) {
      throw Error(`Context '${msg.context}' does not exist`);
    }

    if (!context.container) {
      throw Error(`Context '${msg.context}' does not have a container`);
    }

    const key = Array.from(context.container.update.keys())
      .find(updater => updater.name === msg.message);

    if (!key) {
      throw Error(`Context '${msg.context}' does not contain an Updater of type '${msg.message}'`);
    }

    const updater = context.container.update.get(key);

    if (!updater) {
      throw Error(`Context '${msg.context}' containers an Updater of type '${key}', but it could not be retrieved`);
    }

    return updater;
  }

  protected _nextId() {
    return ++this._messageCounter;
  }

  protected _emit(message: Message) {
    Object.keys(this._queues).forEach(id => {
      const subscriber = this._subscribers[id];

      if (!subscriber) {
        return this._queues[id].push(message);
      }

      subscriber(setSource(message));
    })
  }
}

export const install = () => {
  if (typeof window === undefined) {
    throw Error('Client may not be installed in this context; window does not exist');
  }

  if (window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__) {
    return window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__;
  }

  const client = new Client();
  window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__ = client;
  return client;
}
