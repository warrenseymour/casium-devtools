import StateManager from 'casium/dist/runtime/state_manager';
import ExecContext, { cmdName } from 'casium/dist/runtime/exec_context';
import { EventEmitter } from 'events';
import { Container, GenericObject } from 'casium';
import { DevToolsClient, NotifyMessage } from 'casium/dist/dev_tools';
import { contains, filter, flatten, is, map, pipe, when } from 'ramda';
import { safeStringify, safeParse } from 'casium/dist/util';

const serialize = map<GenericObject, SerializedMessage>(pipe(safeStringify, safeParse));

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
 * Contains the paths on `model`, `message` and `relay` that were accessed by an
 * Updater function
 */
export type DependencyTraceResult = {
  model: string[][];
  message: string[][];
  relay: string[][];
}

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
 * A DevTools panel can be notified of new messages by listening to the
 * 'message' event.
 *
 * The Client also implements a simple message queueing mechanism; if there are
 * no event listeners attached when a message is emitted, it is appended to
 * `_queue`. When the first event listener is attached, it will be called with
 * each message present in `_queue` and the queue will then be cleared.
 */
export class Client extends EventEmitter implements DevToolsClient {
  protected _session = Date.now() + Math.random().toString(36).substr(2);
  protected _messageCounter = 0;

  protected _queue: { [type: string]: any[] } = {};

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
    this.queue('message', serialized);
  }

  public queue(event: string, msg: any) {
    if (this.listenerCount(event) > 0) {
      this.emit(event, msg);
      return;
    }

    if (!this._queue[event]) {
      this._queue[event] = [];
    }

    this._queue[event].push(msg);
  }

  public on(event: string | symbol, listener: (...args: any[]) => void) {
    if (this._queue[event]) {
      this._queue[event].forEach(msg => listener(msg));
      this._queue[event] = [];
    }

    return super.on(event, listener);
  }

  public addListener(event: string | symbol, listener: (...args: any[]) => void) {
    return this.on(event as any, listener);
  }

  /**
   * Called By the Casium runtime when the root container element is created
   */
  public intercept(stateManager: StateManager) {
    this.root = stateManager;
  }

  public dependencyTrace(msg: SerializedMessage) {
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
}

typeof window !== 'undefined' && (window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__ = new Client());
