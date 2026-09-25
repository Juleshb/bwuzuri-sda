import { app, BrowserWindow, ipcMain, net, protocol, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, '../../web/dist');
const icon = path.resolve(here, '../build/icon.png');
const devUrl = process.env.BWUZURI_DEV_URL;

protocol.registerSchemesAsPrivileged([
  { scheme: 'bwuzuri', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

function serveDist(request: Request) {
  let relative = 'index.html';
  try {
    relative = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '') || 'index.html';
  } catch {
    return new Response('Bad path', { status: 400 });
  }
  const filePath = path.resolve(distDir, relative);
  if (filePath !== distDir && !filePath.startsWith(distDir + path.sep)) return new Response('Not found', { status: 404 });
  return net.fetch(pathToFileURL(filePath).href);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#f5f5f5',
    icon,
    title: "SYSTEM Y'INTARA YA BWUZURI",
    show: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      allowRunningInsecureContent: !devUrl,
      devTools: Boolean(devUrl)
    }
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error(`Desktop could not load ${url}: ${description} (${code})`);
  });
  if (devUrl) win.loadURL(devUrl);
  else win.loadURL('bwuzuri://app/');
  win.center();
  win.show();
  win.focus();
  app.focus({ steal: true });
}

ipcMain.handle('bwuzuri:platform', () => ({ desktop: true, platform: process.platform }));
app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.setIcon(icon);
  if (!devUrl) protocol.handle('bwuzuri', serveDist);
  createWindow();
  console.log(devUrl ? `Desktop window opened ${devUrl}` : 'Desktop window opened');
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
