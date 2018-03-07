import { DevToolsClient } from 'casium/dist/dev_tools';

let panelCreated = false;

const PAGE_HAS_CASIUM_EVAL = `!!(
  Object.keys(window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__.contexts).length
)`;

/**
 * Adds an listener to the DevTools client (which exists in the context of the
 * inspected page) that uses `window.postMessage` to relay the event to the
 * Content Script (via the Background Script).
 *
 * If the evaluated script fails (typically because the Client has not been
 * initialized yet) then schedule another attempt.
 */
const sendMessageToContentScript = () => {
  (window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__ as DevToolsClient).on('message', message => {
    window.postMessage({
      source: 'CasiumDevToolsPanel',
      type: 'message',
      message
    }, '*');
  })
}

const addClientListener = () => {
  browser.devtools.inspectedWindow.eval(`(${sendMessageToContentScript.toString()})()`)
    .then(result => {
      if (result && result[1]) {
        console.warn('Failed to create DevTools client event listener, retry scheduled', result);
        setImmediate(addClientListener);
        return;
      }

      console.log('Created event listener on DevTools client');
    });
}

const createPanelIfCasiumLoaded = () => {
  if (panelCreated) {
    return;
  }

  browser.devtools.inspectedWindow.eval(PAGE_HAS_CASIUM_EVAL)
    .then(result => {
      if (result && result[1]) {
        console.warn('Failed to detect if Casium is loaded, retry scheduled');
        return;
      }

      if (result[0] === false || panelCreated) {
        return;
      }

      clearInterval(loadCheckInterval);
      chrome.devtools.panels.create('Casium', 'icon.png', 'panel.html', () => { });
      panelCreated = true;
    });
}

chrome.devtools.network.onNavigated.addListener(createPanelIfCasiumLoaded);
chrome.devtools.network.onNavigated.addListener(addClientListener);

const loadCheckInterval = setInterval(createPanelIfCasiumLoaded, 1000);

createPanelIfCasiumLoaded();
addClientListener();

declare global {
  interface Window {
    PORT: browser.runtime.Port;
  }
}
