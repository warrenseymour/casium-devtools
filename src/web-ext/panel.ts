import { render } from 'react-dom';
import { createElement } from 'react';

import { Panel } from '../common/Panel';
import { ConnectionInstructions } from './ConnectionInstructions';

render(createElement(Panel, { ConnectionInstructions }), document.getElementById('app'));
