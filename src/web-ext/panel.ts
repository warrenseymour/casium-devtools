import { render } from 'react-dom';
import { createElement } from 'react';

import { App } from '../common/App';
import { Notifier } from '../common/Notifier';

render(createElement(App), document.getElementById('app'));
render(createElement(Notifier), document.getElementById('notifier'));
