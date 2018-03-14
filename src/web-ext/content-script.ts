import { Message } from '../common/client';

const clientScript = document.createElement('script');
clientScript.src = browser.extension.getURL('client.js');

(document.head || document.documentElement).appendChild(clientScript);

const backgroundPageConnection = browser.runtime.connect(undefined, { name: 'CasiumDevToolsContentScript' });

/**
 * Whenever a message is received from the DevTools Client via `window.postMessage`,
 * relay it to the background script via `backgroundPageConnection`.
 */
window.addEventListener('message', ({ data }: { data: Message }) => {
  if (data.source && data.source.startsWith('CasiumDevTools')) {
    backgroundPageConnection.postMessage(data);
  }
});

/**
 * Whenever a message is received from the background script via
 * `backgroundPageConnection`, relay it to the DevTools Client via
 * `window.postMessage`.
 */
backgroundPageConnection.onMessage.addListener((message: any) => {
  window.postMessage(message, '*');
})
