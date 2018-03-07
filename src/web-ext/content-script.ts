import { PostedMessage } from '../common/client-interface';

const clientScript = document.createElement('script');
clientScript.src = browser.extension.getURL('client.js');

(document.head || document.documentElement).appendChild(clientScript);

const backgroundPageConnection = browser.runtime.connect(undefined, { name: 'CasiumDevToolsContentScript' });

/**
 * Whenever a message is sent from the messaging script via
 * `window.postMessage`, relay it to the background script via
 * `backgroundPageConnection`. This will allow it to be forwarded on to the
 * DevTools UI.
 */

window.addEventListener('message', ({ data }: PostedMessage) => {
  if (data.source !== 'CasiumDevToolsPanel') {
    return;
  }

  backgroundPageConnection.postMessage(data);
});
