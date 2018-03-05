import { app, BrowserWindow, ipcMain } from 'electron';
import { resolve } from 'path';

import { Server } from './server';

let mainWindow: BrowserWindow;
let server: Server;

if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname);
}

const port = process.env.CASIUM_DEVTOOLS_PORT || '8080';

app.on('ready', () => {
  mainWindow = new BrowserWindow({ width: 800, height: 600, icon: resolve(__dirname, './icon.png') });
  mainWindow.loadURL(`file://${__dirname}/panel.html`);

  mainWindow.on('closed', () => {
    server.stop();
    (mainWindow as any) = undefined;
  });

  server = new Server({
    port,
    onMessage: data => {
      mainWindow.webContents.send('bus-message', data);
    },
    onConnect: () => {
      mainWindow.webContents.send('bus-ready');
    },
    onDisconnect: () => {
      mainWindow.webContents.send('bus-disconnect');
    }
  })

  ipcMain.on('bus-message', (event: any, data: {}) => {
    server.send(data);
  });
});

app.on('window-all-closed', () => {
  server.stop();
  app.quit();
});
