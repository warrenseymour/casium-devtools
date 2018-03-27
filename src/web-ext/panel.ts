import { render } from 'react-dom';
import { createElement } from 'react';

import { App } from '../common/App';
import { Notifier } from '../common/Notifier';

import { SerializedMessage } from '../common/instrumenter';
import { Listener } from '../common/global';

window.LISTENERS = []

const processMsg = (msg: SerializedMessage) =>
  ([predicate, ...listeners]: Listener[]) => predicate(msg) && listeners.map(l => l(msg));

const backgroundPageConnection = browser.runtime.connect(undefined, { name: 'CasiumDevToolsPanel' });

backgroundPageConnection.onMessage.addListener((message: any) => {
  window.LISTENERS.forEach(processMsg(message));
});

window.messageClient = (data) => {
  backgroundPageConnection.postMessage(Object.assign({
    from: "CasiumDevToolsPanel",
    tabId: browser.devtools.inspectedWindow.tabId,
  }, data));
}

render(createElement(App), document.getElementById('app'));
render(createElement(Notifier), document.getElementById('notifier'));
