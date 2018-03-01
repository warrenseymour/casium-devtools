import { runtime } from 'chrome';

import { Bus } from './message';

declare global {
  interface Window {
    MESSAGE_BUS: Bus;

    PORTS: {
      [key: string]: runtime.Port
    };

    QUEUES: {
      [key: string]: typeof runtime.Port.postmessage
    };

    messageClient: (data: any) => void;

    _ARCH_DEV_TOOLS_STATE: {
      contexts: {
        [id: string]: {
          container: {
            update: Map<{ name: string }, (model: {}, message?: {}, relay?: {}) => void>
          }
        }
      }
    }
  }
}
