import { app, BrowserWindow } from 'electron';
import { resolve } from 'path';

let mainWindow: BrowserWindow | undefined;

if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname);
}

app.on('ready', () => {
  mainWindow = new BrowserWindow({ width: 800, height: 600, icon: resolve(__dirname, './icon.png') });
  mainWindow.loadURL(`file://${__dirname}/panel.html`);

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  })
});

app.on('window-all-closed', () => {
  app.quit();
});
