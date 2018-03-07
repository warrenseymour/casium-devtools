import { SerializedMessage } from './client';

/**
 * A ClientInterface implementation should broadcast this message when the DevTools
 * Client and DevTools UI have both connected.
 */
export type Connected = { type: 'connected' };

/**
 * A ClientInterface implementation should broadcast this message when either the
 * DevTools Client or DevTools UI have disconnected.
 */
export type Disconnected = {
  type: 'disconnected'
};

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
export type TimeTravel = {
  type: 'timeTravel',
  to: SerializedMessage
};

/**
 * Any message sent to/from the Client should be one of the preceeding types,
 * plus a `source` property.
 */
export type Message = Partial<{ source: string } & (
  Connected | Disconnected | NewMessage | TimeTravel
)>;

export type PostedMessage = {
  data: Message
}

/**
 * A listener function can be a 'predicate' or 'listener' function. Both are
 * called with the message that was received by the DevTools Client; if the
 * predicate returns `true`, then complimentary 'listener' functions should also
 * be called regardless of their return value.
 */
export type Listener = (msg: Message) => boolean | void;

/**
 * An abstract interface that allows the DevTools UI to subscribe to events and
 * send messages to the DevTools client. This interface should be defined
 * outside of the scope of the React application, and presented to it as a Prop.
 */
export type ClientInterface = {
  send: (msg: Message) => void;
  /**
   * Register multiple event listeners using the form:
   * `[[predicateFn, ...listenerFns], ...]`
   *
   * Whenever a message is received, predicateFn will be called with the
   * message; if predicateFn returns truthy, then each `listenerFn` will also be
   * called with the message.
   */
  subscribe: (listeners: Listener[][]) => () => void;
}

type CreateClientInterfaceOptions = {
  send: (msg: Message) => void;
  addListener: (listener: Listener) => void;
  removeListener: (listener: Listener) => void;
}

/**
 * A convenience function to allow a Client Interface to be created by supplying
 * `send`, `addListener` and `removeListener` functions. It is assumed that the
 * WebExtension and Electron implementation provide their own specific logic
 * inside these functions.
 */
export const createClientInterface = ({ send, addListener, removeListener }: CreateClientInterfaceOptions): ClientInterface => ({
  send,

  subscribe: subs => {
    const listenerFns = subs.map(([predicate, ...handlers]) => (msg: Message) => {
      predicate(msg) && handlers.forEach(handler => handler(msg));
    });

    listenerFns.forEach(addListener);

    return () => {
      listenerFns.forEach(removeListener);
    }
  }
})
