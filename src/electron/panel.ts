import { render } from 'react-dom';
import { createElement } from 'react';

import { Panel } from '../common/Panel';
import { ConnectionInstructions } from './ConnectionInstructions';
import { ElectronBus } from './messaging';

render(createElement(Panel, { ConnectionInstructions, messageBus: ElectronBus }), document.getElementById('app'));
