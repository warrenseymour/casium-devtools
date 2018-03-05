import { render } from 'react-dom';
import { createElement } from 'react';

import { Panel } from '../common/Panel';
import { ConnectionInstructions } from './ConnectionInstructions';
import { WebExtBus } from './messaging';

render(createElement(Panel, { ConnectionInstructions, messageBus: WebExtBus }), document.getElementById('app'));
