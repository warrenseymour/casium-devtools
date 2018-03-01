import { ElectronBus } from './messaging';

declare global {
  interface Window {
    MESSAGE_BUS: ElectronBus;
  }
}
