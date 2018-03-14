import { Message } from './client';

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
  send: msg => {
    send({ source: 'CasiumDevToolsPanel', ...msg })
  },

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
