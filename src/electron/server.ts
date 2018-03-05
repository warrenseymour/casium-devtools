import * as http from 'http';
import * as ws from 'ws';

interface Options {
  port: string;
  onMessage: (message: {}) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export class Server {
  protected _httpServer: http.Server;
  protected _wsServer: ws.Server;
  protected _activeSocket: ws | undefined;

  constructor(protected _options: Options) {
    this._httpServer = http.createServer();
    this._wsServer = new ws.Server({
      server: this._httpServer
    });

    this._httpServer.listen(_options.port);

    this._wsServer.on('connection', socket => this._initializeSocket(socket))
  }

  protected _initializeSocket(socket: ws) {
    console.info('Incoming WebSocket connection');

    if (this._activeSocket) {
      console.warn('A WebSocket connection is already active; closing existing connection');
      this._activeSocket.close();
    }

    this._activeSocket = socket;

    this._activeSocket.onmessage = e => {
      this._options.onMessage(e.data);
    }

    this._activeSocket.onclose = e => {
      console.info('Active WebSocket connection closed');
      this._activeSocket = undefined;
      this._options.onDisconnect();
    }

    this._activeSocket.onerror = err => {
      // @todo: reconnect logic
      console.error('Active WebSocket connection error', err);
    }

    this._options.onConnect();
  }

  send(message: {}) {
    if (!this._activeSocket) {
      console.error('Tried to send WebSocket message when no connection active');
      return;
    }

    this._activeSocket.send(JSON.stringify(message));
  }

  stop() {
    this._httpServer.close();
    this._wsServer.close();
  }
}
