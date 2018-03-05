export type Command = [string, {}];

export interface Message {
  id: string;
  name: string;
  context: string;
  ts: number;
  prev: any;
  next: any;
  from: string;
  relay: any;
  message: string;
  data: any;
  path: string[];
  commands?: Command[];
}

export type Listener = (msg: Message) => any;

interface Options {
  onConnect: () => void;
  onDisconnect: () => void;
}

export type BusConstructor = {
  new(_options: Options): Bus;
}

export abstract class Bus {
  public messages: Message[] = [];
  public listeners: Listener[][] = [];

  public onConnect?: () => void;
  public onDisconnect?: () => void;

  protected _queue: Message[] = [];

  constructor(protected _options: Options) {
    this._init();
  }

  public flush() {
    this._queue.forEach(this._dispatchMessage);
    this._queue = [];
  }

  protected _onConnect() {
    this.send({
      from: 'CasiumDevToolsPageScript',
      state: 'initialized'
    })

    this._options.onConnect();
  }

  protected _onDisconnect() {
    this._options.onDisconnect();
  }

  protected _receiveMessage(msg: Message) {
    this.listeners.length ?
      this.listeners.forEach(this._dispatchMessage(msg)) :
      this._queue.push(msg);
  }

  protected _dispatchMessage(msg: Message) {
    return ([predicate, ...listeners]: Listener[]) => predicate(msg) && listeners.map(l => l(msg));
  }

  public abstract send(data: {}): void;

  protected abstract _init(): void;
}
