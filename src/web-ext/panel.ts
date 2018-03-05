import { render } from 'react-dom';
import { createElement } from 'react';

import { App } from '../common/App';

window.MESSAGE_BUS.onConnect = () => {
  render(createElement(App), document.getElementById('app'));
}
