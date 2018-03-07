import * as http from 'http';
import * as ws from 'ws';
import { readFile } from 'fs';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { resolve } from 'path';

const readFileAsync = promisify(readFile);

export class Server extends EventEmitter {
  protected _httpServer: http.Server;
  protected _wsServer: ws.Server;
  protected _activeSocket: ws | undefined;

  constructor() {
    super();

    const port = process.env.CASIUM_DEVTOOLS_PORT || '8080';

    this._httpServer = http.createServer();
    this._wsServer = new ws.Server({
      server: this._httpServer
    });

    this._httpServer.on('request', async (req, res) => {
      const script = await readFileAsync(resolve(__dirname, 'client.js'));
      res.end(`${script.toString().replace('%PORT%', port)}`);
    });

    this._wsServer.on('connection', socket => this._initializeSocket(socket))

    this._httpServer.listen(port);
  }

  protected _initializeSocket(socket: ws) {
    console.info('Incoming WebSocket connection');

    if (this._activeSocket) {
      console.warn('A WebSocket connection is already active; closing existing connection');
      this._activeSocket.close();
    }

    this._activeSocket = socket;

    this._activeSocket.onmessage = e => {
      this.emit('message', JSON.parse(e.data.toString()));
    }

    this._activeSocket.onclose = e => {
      console.info('Active WebSocket connection closed');
      this._activeSocket = undefined;
      this.emit('disconnect');
    }

    this._activeSocket.onerror = err => {
      // @todo: reconnect logic
      console.error('Active WebSocket connection error', err);
    }

    this.emit('connect');
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
