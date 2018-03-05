import { Bus } from '../common/message';
import { ipcRenderer } from 'electron';

export class ElectronBus extends Bus {
  protected _seen: string[] = [];

  protected _init() {
    /**
     * @todo: Refactor 'web-ext/content-script' message parsing and de-duplication into base `Bus` class
     */
    ipcRenderer.on('bus-message', (event: any, payload: string) => {
      const data = JSON.parse(payload);

      if (!data.id || data.from !== 'Arch') {
        return;
      }

      if (this._seen.includes(data.id)) {
        return;
      }

      this._seen.push(data.id);
      this._receiveMessage(data);
    });

    ipcRenderer.on('bus-ready', () => {
      this._onConnect();
    })

    ipcRenderer.on('bus-disconnect', () => {
      this._onDisconnect();
    })
  }

  send(data: {}) {
    ipcRenderer.send('bus-message', Object.assign({
      from: 'CasiumDevToolsPanel',
    }, data));
  }
}

window.MESSAGE_BUS = new ElectronBus();
