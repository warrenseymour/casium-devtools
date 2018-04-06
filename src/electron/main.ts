import { app, BrowserWindow, ipcMain } from 'electron';
import { resolve } from 'path';

import { Server } from '../common/server';

let server: Server;

if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname);
}

app
  .on('ready', () => {
    const mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      title: 'Casium Developer Tools',
      icon: resolve(__dirname, './icon.png')
    });

    mainWindow.loadURL(`file://${__dirname}/panel.html`);

    server = new Server({
      pid: process.pid,
      port: 8081,
      scriptPath: resolve(__dirname, 'injected-script.js')
    });

    server
      .on('message', msg => {
        mainWindow.webContents.send('message', msg);
      })
      .on('connect', msg => {
        //mainWindow.webContents.send('message', { type: 'connected' });
      })
      .on('disconnect', msg => {
        //mainWindow.webContents.send('message', { type: 'disconnected' });
      });

    ipcMain.on('message', (event: any, msg: {}) => {
      server.send(msg);
    });

    mainWindow.on('closed', () => {
      server.stop();
    });
  })
  .on('window-all-closed', () => {
    server.stop();
    app.quit();
  });
