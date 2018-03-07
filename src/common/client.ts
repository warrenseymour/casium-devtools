import StateManager from 'casium/dist/runtime/state_manager';
import ExecContext, { cmdName } from 'casium/dist/runtime/exec_context';
import { EventEmitter } from 'events';
import { Container, GenericObject } from 'casium';
import { DevToolsClient, NotifyMessage } from 'casium/dist/dev_tools';
import { filter, flatten, is, map, pipe } from 'ramda';
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
class Client extends EventEmitter implements DevToolsClient {
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

  protected _nextId() {
    return ++this._messageCounter;
  }
}

window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__ = new Client();
