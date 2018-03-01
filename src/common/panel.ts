import { render } from 'react-dom';
import { createElement } from 'react';

import { App } from '../common/App';

render(createElement(App), document.getElementById('app'));
