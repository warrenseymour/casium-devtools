import * as http from 'http';
import * as ws from 'ws';
import { EventEmitter } from 'events';
import { readFile } from 'fs';
import { promisify } from 'util';
import { omit } from 'ramda';

import { InboundMessage, OutboundMessage } from './instrumenter';

const readFileAsync = promisify(readFile);

const PORT_REGEX = /%PORT%/g;
const PID_REGEX = /%PID%/g;

type ResponseQueue = {
  [id: string]: (response: any) => void;
}

type WebSocketEvent = {
  target: ws,
  data: ws.Data,
  type: string
};

export enum Error {
  NoConnection
}

export type Options = {
  pid: number;
  port: number;
  scriptPath: string;
}

/**
 * Implements a very basic HTTP and WebSocket server that allows interaction
 * with a remote Casium application by serving an injectable JavaScript file
 * over HTTP that creates a simple communication channel using a WebSocket.
 *
 * It is intended that a Server by used by the Electron (and eventually) REPL
 * versions of the DevTools.
 *
 * This implementation only supports a single active WebSocket connection at a
 * time; the current connection will be terminated when a new client attempts to
 * connect.
 */
export class Server extends EventEmitter {
  /**
   * The Response Queue is a hash of `resolve` functions, keyed by request ID.
   *
   * The outbound message handler should create a new Promise and push its
   * `resolve` function into this object. Then, the inbound message handler may
   * call it when it receives the corresponding message in response.
   */
  protected _responseQueue: ResponseQueue = {};

  protected _http: http.Server;
  protected _ws: ws.Server;
  protected _activeSocket?: ws;

  constructor(protected _options: Options) {
    super();

    this._http = http.createServer();
    this._ws = new ws.Server({
      server: this._http
    });

    this._http.on('request', this._serveInjectedScript);
    this._ws.on('connection', this._initializeSocket);

    this._http.listen(_options.port);
  }

  /**
   * A simple HTTP request handler that *always* serves a file called
   * `injected-script.js` from the same directory as this script.
   */
  protected _serveInjectedScript = async (req: http.ServerRequest, res: http.ServerResponse) => {
    const script = await readFileAsync(this._options.scriptPath);
    const response = script.toString()
      .replace(PORT_REGEX, this._options.port.toString())
      .replace(PID_REGEX, this._options.pid.toString());

    res.end(response);
  }

  protected _log(level: 'info' | 'error' | 'warn', ...args: any[]) {
    this.emit('log', level, ...args);
  }

  /**
   * Handles new incoming WebSocket connections; currently, only one active
   * connection at a time is allowed, so any existing connection will be
   * terminated.
   */
  protected _initializeSocket = (socket: ws) => {
    this._log('info', 'Incoming WebSocket connection.');

    if (this._activeSocket) {
      this._log('warn', 'An existing WebSocket connection is already active; closing existing connection.');
      this._activeSocket.close();
    }

    this._activeSocket = socket;

    this._activeSocket.onmessage = this._handleMessage;

    this._activeSocket.onclose = e => {
      this._log('info', 'Active WebSocket connection closed.');
      this._activeSocket = undefined;
      this.emit('disconnect');
    }

    this._activeSocket.onerror = err => {
      // @todo: Error handling/retry logic
      this._log('error', 'Active WebSocket error', err);
    }

    this.emit('connect');
  }

  /**
   * Handles incoming WebSocket messages; if the message was a simple 'fire and
   * forget' message (ie, it does not contain a `requestId` property), then
   * re-emit it via the `message` event.
   *
   * If the message contains a `requestId` property, then fire the appropriate
   * queued resolver function so that the original requester may obtain the
   * response.
   */
  protected _handleMessage = (e: WebSocketEvent) => {
    const payload = JSON.parse(e.data.toString());
    // @todo: Validate incoming message

    if (!payload.requestId) {
      return this.emit('message', payload);
    }

    const resolve = this._responseQueue[payload.requestId];
    resolve(omit(['requestId'], payload));
    delete this._responseQueue[payload.requestId];
  }

  public send(message: {}) {
    if (!this._activeSocket) {
      return this._log('error', 'Tried to send WebSocket message when no connection is active');
    }

    this._activeSocket.send(JSON.stringify(message));
  }

  /**
   * Sends a Message that is designed to wait for a response; returns a Promise
   * that will be resolved to the message that the client sent in response.
   */
  public request(message: Partial<InboundMessage>): Promise<OutboundMessage> {
    if (!this._activeSocket) {
      return Promise.reject(Error.NoConnection);
    }

    const requestId = Date.now();

    const p = new Promise<OutboundMessage>(resolve => {
      this._responseQueue[requestId] = resolve;
    });

    const payload = JSON.stringify(Object.assign({ requestId }, message));
    this._activeSocket.send(payload);

    return p;
  }

  public stop() {
    this._http.close();
    this._ws.close();
    this._responseQueue = {};
  }
}
