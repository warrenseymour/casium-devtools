// This creates and maintains the communication channel between
// the inspectedPage and the dev tools panel.
//
// In this example, messages are JSON objects
// {
//   action: ['code'|'script'|'message'], // What action to perform on the inspected page
//   content: [String|Path to script|Object], // data to be passed through
//   tabId: [Automatically added]
// }

import { Message, Command } from '../common/message';

export type Command = [string, {}];

export type Listener = (msg: Message) => any;

(function createChannel() {

  window.MESSAGES = [];
  window.LISTENERS = []

  let queue: Message[] = [];

  window.FLUSH_QUEUE = () => {
    queue.forEach(msg => window.LISTENERS.forEach(processMsg(msg)));
    queue = [];
  };

  const processMsg = (msg: Message) =>
    ([predicate, ...listeners]: Listener[]) => predicate(msg) && listeners.map(l => l(msg));

  const backgroundPageConnection = browser.runtime.connect(undefined, { name: 'CasiumDevToolsPanel' });

  backgroundPageConnection.onMessage.addListener((message: any) => {
    window.LISTENERS.length ? window.LISTENERS.forEach(processMsg(message)) : queue.push(message);
  });

  window.messageClient = (data) => {
    backgroundPageConnection.postMessage(Object.assign({
      from: "CasiumDevToolsPanel",
      tabId: browser.devtools.inspectedWindow.tabId,
    }, data));
  }

  window.messageClient({ state: 'initialized' });
}());
