import { onMessage, withStateManager, OnMessageCallback, StateManagerCallback } from 'casium/instrumentation';
import { safeStringify, safeParse } from 'casium/util';
import { GenericObject, Container } from 'casium/core';
import StateManager from 'casium/runtime/state_manager';
import ExecContext, { cmdName } from 'casium/runtime/exec_context';
import { filter, flatten, identity, is, lensPath, map, pipe, set } from 'ramda';
import { MessageConstructor } from 'casium/message';

export const INSTRUMENTER_KEY = '__CASIUM_DEV_TOOLS_INSTRUMENTER__';

/**
 * Used to retain the connectivity state and pending message queue for multiple
 * Backends
 */
export type BackendState = {
  connected: boolean;
  onMessage: (msg: OutboundMessage) => void;
  queue: SerializedMessage[];
}

/**
 * A Backend defines the in- and out-bound behaviour for interacting with the
 * DevTools instrumenter. A Backend is defined as a function which accepts a
 * `spec` object. This Spec contains the `connect`, `disconnect` and `send`
 * functions, which allows the Backend to update its connectivity state stored
 * within the Instrumenter.
 *
 * The Backend should return a function which will be called with a serialized
 * form of a Message on every dispatch.
 */
export type Backend = (spec: {
  connect: () => void;
  disconnect: () => void;
  send: (msg: any) => void;
}) => (msg: OutboundMessage) => void;

export type SerializedCommand = [string, GenericObject];

export type SerializedMessage = {
  id: string;
  name: string;
  context: string;
  ts: number;
  prev: any;
  next: any;
  from: string;
  relay: any;
  message: string;
  data: {} | null;
  path: string[];
  commands?: SerializedCommand[];
}

/**
 * Inbound messages that require an associated response should contain a
 * `requestId` property to correct association.
 */
export type RequestId = { requestId: number };

/**
 * Sent and received by Backends regarding connection state.
 *
 * Currently, only `initialized` is supported, which represents that the
 * DevTools panel UI is ready to process queued messages.
 */
export type ConnectionState = { state: string };

/**
 * Sent by a Backend when using the 'time travel' feature, which should set the
 * application state to that represented by the 'selected' Message.
 */
export type TimeTravel = { selected: SerializedMessage };

/**
 * Sent by a Backend to manually construct and dispatch a Message using
 * string-based identifiers (mandated by traversing network and browser context
 * boundaries).
 */
export type DispatchMessage = {
  dispatch: {
    // The `name` property of the container to dispatch a Message to
    name: string;
    // The `name` property of the Message constructor to use
    message: string;
    // Data to pass to the Message constructor
    data: GenericObject;
  }
}

/**
 * Sent by a Backend to request a list of Container names that handle a Message
 * with a specific name
 */
export type ContainersHandlingRequest = { containersHandling: string; }

/**
 * Sent by a Backend to request a list of Message names that begin with a given
 * substring
 */
export type MessageNamesRequest = { messageNames: string; }

/**
 * Messages received FROM a Backend
 */
export type InboundMessage =
  ConnectionState |
  TimeTravel |
  DispatchMessage |
  RequestId & ContainersHandlingRequest |
  RequestId & MessageNamesRequest;

/**
 * Sent to a Backend in response to a `ContainersHandlingRequest`
 */
export type ContainersHandlingResponse = { containers: string[] }

/**
 * Sent to a Backend in response to a `MessageNamesRequest`.
 */
export type MessageNamesResponse = {
  /**
   * Hash of query results - keys are full message names that begin with the
   * requested substring. Value is an array of container names which contain
   * this message.
   */
  messageNames: {
    [message: string]: string[]
  }
}

/**
 * Messages sent TO a Backend
 */
export type OutboundMessage =
  ConnectionState |
  SerializedMessage |
  RequestId & ContainersHandlingResponse |
  RequestId & MessageNamesResponse

/**
 * Convenience alias for Execution Contexts which are definitely associated to a
 * Container
 */
export type ContextWithContainer = ExecContext<any> & {
  container: Container<any>
}

const serialize = map<GenericObject, GenericObject>(pipe(safeStringify, safeParse)) as any;

const serializeCmds: (cmds: any[]) => SerializedCommand[] =
  pipe(flatten as any, filter(is(Object)), map<any, SerializedCommand[]>(cmd => [cmdName(cmd), cmd.data]));

const findUpdater = (container: Container<any>, name: string) =>
  Array.from(container.update.keys())
    .find(ctor => ctor.name === name);

/**
 * The DevTools Instrumenter runs in the same context as the Inspected Page, and
 * provides a pluggable 'backend' mechanism to allow multiple DevTools instances
 * to connect simultaneously.
 */
export class Instrumenter {
  public stateManager?: StateManager;

  public contexts: { [id: string]: ExecContext<any> } = {};

  protected _backendStates: { [name: string]: BackendState } = {};

  protected _session = Date.now() + Math.random().toString(36).substr(2);

  protected _messageCounter = 0;

  /**
  * This class acts as a Singleton; upon construction, it searches for an
  * existing instance at `window[INSTRUMENTER_KEY]` and returns it if it already
  * exists. Otherwise, a new instance is created and stored there.
  *
  * Uses the Instrumentation API to register an `onMessage` and
  * `withStateManager` handler.
  */
  constructor() {
    if (window[INSTRUMENTER_KEY]) {
      return window[INSTRUMENTER_KEY];
    }

    window[INSTRUMENTER_KEY] = this;
    onMessage(this._instrumenterFn);
    withStateManager(this._setRoot);
  }

  /**
   * Whenever a Message is dispatched by Casium, turn it into a serializable
   * form and send it to all connected backends.
   */
  protected _instrumenterFn: OnMessageCallback = ({ context, msg, prev, next, path, cmds }) => {
    const name = context.container && context.container.name || '{Anonymous Container}';

    const serialized: SerializedMessage = serialize({
      from: 'CasiumDevToolsInstrumenter',
      context: context.id,
      id: this._session + this._nextId(),
      ts: Date.now(),
      relay: context.relay(),
      message: msg && msg.constructor && msg.constructor.name || `Init (${name})`,
      data: msg && msg.data,
      commands: serializeCmds(cmds),
      name,
      prev,
      next,
      path,
    });

    this.contexts[context.id] = context;

    for (const name in this._backendStates) {
      const { connected, queue, onMessage } = this._backendStates[name];
      connected ? onMessage(serialized) : queue.push(serialized);
    }
  };

  /**
   * Stores the root State Manager once the inspected page has initialized
   */
  protected _setRoot: StateManagerCallback = stateManager => {
    this.stateManager = stateManager;
  }

  protected _nextId() {
    return ++this._messageCounter;
  }

  /**
   * Registers a Backend against the Instrumenter. By default, the backend will
   * be set to the `disconnected` state; the implementer must explcitly maintain
   * connection state using `connect()` and `disconnect()`.
   *
   * Once the Backend has been registered a `{state: initialized}` message is
   * emitted, which may be used for ensuring that downstream components are also
   * initialized once the Instrumenter and Backend are ready.
   */
  public addBackend(name: string, backend: Backend) {
    const onMessage = backend({
      connect: () => {
        state.connected = true;
        state.queue.forEach(onMessage);
        state.queue = [];
      },

      disconnect: () => state.connected = false,

      send: (msg: InboundMessage) => {
        if ('selected' in msg) {
          const sel = msg.selected;
          const newState = set(lensPath(sel.path), sel.next, sel.prev);

          return withStateManager(stateManager => stateManager.set(newState));
        }

        if ('dispatch' in msg) {
          const { name, message, data } = msg.dispatch;

          const context = this.getContainerContext(name);
          const MessageConstructor = this.getMessageConstructor(context, message);

          return context.dispatch(new MessageConstructor(data));
        }

        if ('containersHandling' in msg) {
          return onMessage({
            requestId: msg.requestId as number,
            containers: this.containersHandling(msg.containersHandling)
          });
        }

        if ('messageNames' in msg) {
          return onMessage({
            requestId: msg.requestId as number,
            messageNames: this.messageNames(msg.messageNames)
          })
        }

        if ('state' in msg) {
          return console.info(`Casium Instrumenter: Backend '${name}' state is '${msg.state}'`);
        }

        console.error('Invalid message received', msg);
      }
    });

    const state = {
      connected: false,
      queue: [],
      onMessage
    };

    this._backendStates[name] = state;

    onMessage({
      from: 'CasiumDevToolsInstrumenter',
      state: 'initialized'
    });
  }

  /**
   * Returns an array of Executions Contexts that have a Container associated
   */
  public containerContexts() {
    return Object.keys(this.contexts)
      .map(id => {
        const context = this.contexts[id];
        return context.container ? context : undefined;
      })
      .filter(identity) as ContextWithContainer[]
  }

  /**
   * Locates the Execution Context that owns a Container with `name`
   */
  public getContainerContext(container: string): ExecContext<any> {
    const match = this.containerContexts()
      .find(context => context.container.name === container);

    if (!match) {
      throw Error(`Container '${container}' does not exist`);
    }

    return match;
  }

  /**
   * Locates the constructor function for a Message with `name` that is handled
   * by a Container owned by Execution Context `context`.
   */
  public getMessageConstructor(context: ExecContext<any>, name: string): MessageConstructor {
    if (!context.container) {
      throw Error(`Context '${context.id}' does not have a container`);
    }

    const match = findUpdater(context.container, name);
    if (!match) {
      throw Error(`Container '${context.container.name}' does not handle Messages of type '${name}'`);
    }

    return match;
  }

  /**
   * Returns a list of Container names that respond to a Message with `name`
   */
  public containersHandling(name: string) {
    return this.containerContexts()
      .map(({ container }) => findUpdater(container, name) ? container.name : undefined)
      .filter(identity) as string[];
  }

  /**
   * Returns an array of objects containing Messages that begin with `name` and
   * the name of the Container that handles them.
   */
  public messageNames(name = '') {
    let result: { [message: string]: string[] } = {};

    this.containerContexts().forEach(({ container }) => {
      const messages = Array.from(container.update.keys())
        .filter(ctor => ctor.name.startsWith(name))
        .map(ctor => ctor.name);

      messages.forEach(message => {
        result[message] ?
          result[message].push(container.name) :
          result[message] = [container.name];
      });
    })

    return result;
  }
}
