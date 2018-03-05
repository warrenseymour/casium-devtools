import { Bus, Message } from '../common/message';

export class WebExtBus extends Bus {
  protected _backgroundPageConnection: browser.runtime.Port | undefined;

  protected _init() {
    this._backgroundPageConnection = browser.runtime.connect(undefined, { name: 'CasiumDevToolsPanel' });
    this._backgroundPageConnection.onMessage.addListener(msg => this._receiveMessage(msg as Message));
    this._onConnect();
  }

  send(data: {}) {
    if (!this._backgroundPageConnection) {
      throw Error('Tried to send a message when background page connection is not ready.');
    }

    this._backgroundPageConnection.postMessage(Object.assign({
      from: 'CasiumDevToolsPanel',
      tabId: browser.devtools.inspectedWindow.tabId
    }, data));
  }
}
