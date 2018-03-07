import { render } from 'react-dom';
import { createElement } from 'react';

import { Panel } from '../common/Panel';
import { ConnectionInstructions } from './ConnectionInstructions';
import { createClientInterface } from '../common/client-interface';

const backgroundPageConnection = browser.runtime.connect(undefined, { name: 'CasiumDevToolsPanel' });

/**
 * Defines a Client Interface that is usable in the WebExtension context; uses
 * the background page connection to send messages and register event listeners.
 */
const clientInterface = createClientInterface({
  send: msg => {
    backgroundPageConnection.postMessage(msg);
  },

  addListener: listener => {
    backgroundPageConnection.onMessage.addListener(listener);
  },

  removeListener: listener => {
    (backgroundPageConnection as any).onMessage.removeListener(listener);
  }
});

render(
  createElement(Panel, { ConnectionInstructions, clientInterface }),
  document.getElementById('app')
);
