import { render } from 'react-dom';
import { createElement } from 'react';
import { ipcRenderer } from 'electron';
import { propEq } from 'ramda';

import { Panel } from '../common/Panel';
import { ConnectionInstructions } from './ConnectionInstructions';
import { createClientInterface, Listener } from '../common/client-interface';

/**
 * The callback supplied to `ipcRender.addListener` has a different signature to
 * the one expected by `clientInterface.addListener`, so it needs to be wrapped
 * in another function which is then stored locally so that it may be correctly
 * detached when using `ipcRender.removeListener`.
 */
const listeners: Array<{
  original: Listener;
  wrapped: (event: any, msg: any) => void;
}> = [];

/**
 * Defines a Client Interface that is usable in the Electron Renderer context;
 * uses the integrated WebSocket server to send messages and register event
 * listeners via IPC with the Electron main process.
 */
const clientInterface = createClientInterface({
  send: msg => {
    ipcRenderer.send('message', msg);
  },

  addListener: original => {
    const wrapped = (event: any, msg: any) => {
      original(msg);
    };

    listeners.push({ original, wrapped });
    ipcRenderer.addListener('message', wrapped);
  },

  removeListener: original => {
    const listener = listeners.find(propEq('original', original));
    listener && ipcRenderer.removeListener('message', listener.wrapped);
  }
});

render(
  createElement(Panel, { ConnectionInstructions, clientInterface }),
  document.getElementById('app')
);
