import { render } from 'react-dom';
import { createElement } from 'react';
import { ipcRenderer } from 'electron';

import { App } from '../common/App';
import { Notifier } from '../common/Notifier';

import { SerializedMessage } from '../common/instrumenter';
import { Listener } from '../common/global';

window.LISTENERS = [];

const processMsg = (msg: SerializedMessage) =>
  ([predicate, ...listeners]: Listener[]) => predicate(msg) && listeners.map(l => l(msg));

ipcRenderer.on('message', (event: any, message: any) => {
  window.LISTENERS.forEach(processMsg(message));
});

window.messageClient = data => {
  ipcRenderer.send('message', data);
}

render(createElement(App), document.getElementById('app'));
render(createElement(Notifier), document.getElementById('notifier'));
