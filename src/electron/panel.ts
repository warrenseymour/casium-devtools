import { render } from 'react-dom';
import { createElement } from 'react';

import { Connect } from './Connect';
import { App } from '../common/App';

const container = document.getElementById('app');

render(createElement(Connect), container);

window.MESSAGE_BUS.onConnect = () => {
  render(createElement(App), container);
}

window.MESSAGE_BUS.onDisconnect = () => {
  render(createElement(Connect, { disconnected: true }), container);
}
