import { INSTRUMENTER_KEY, Instrumenter } from './instrumenter';

export type Listener = (msg: SerializedMessage) => any;

declare global {
  interface Window {
    LISTENERS: Listener[][];
    messageClient: (data: any) => void;

    [INSTRUMENTER_KEY]: Instrumenter
  }
}
