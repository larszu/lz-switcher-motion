import { app, BrowserWindow, ipcMain, shell } from 'electron'
import type { Server } from 'node:http'
import path from 'node:path'
import type { Dve, DvePreset, MoveOptions, SsBox, SsPreset } from '../shared/model'
import { Control } from './control'
import { startHttp } from './http'
import { Store } from './store'

const DEV_URL = process.env.VITE_DEV_SERVER_URL

let win: BrowserWindow | null = null
let httpServer: Server | null = null
const store = new Store(app.getPath('userData'))
const control = new Control(store)

/** Snapshots go out at most every 33 ms; a move at 50 fps would flood IPC. */
let pending: NodeJS.Timeout | null = null
function pushSnapshot() {
  if (pending) return
  pending = setTimeout(() => {
    pending = null
    win?.webContents.send('snapshot', control.snapshot())
  }, 33)
}
control.on('change', pushSnapshot)
control.on('presets', () => win?.webContents.send('presets', store.data.presets))

function applyHttp(port: number) {
  httpServer?.close()
  httpServer = null
  if (port > 0) {
    httpServer = startHttp(control, port)
    httpServer.on('error', (e) => win?.webContents.send('log', `HTTP: ${String(e)}`))
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#132040',
    title: 'LZ Switcher Motion',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
    },
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  if (DEV_URL) void win.loadURL(DEV_URL)
  else void win.loadFile(path.join(__dirname, '../../renderer/index.html'))
}

ipcMain.handle('init', () => ({
  snapshot: control.snapshot(),
  presets: store.data.presets,
  settings: store.data.settings,
  version: app.getVersion(),
}))
ipcMain.handle('connect', (_e, host: string) => control.connect(host))
ipcMain.handle('disconnect', () => control.disconnect())
ipcMain.handle('setBox', (_e, ssrc: number, box: number, p: Partial<SsBox>) => control.setBox(ssrc, box, p))
ipcMain.handle('setDve', (_e, me: number, keyer: number, p: Partial<Dve>) => control.setDve(me, keyer, p))
ipcMain.handle('moveSuperSource', (_e, ssrc: number, boxes: SsBox[], opt?: MoveOptions) =>
  control.moveSuperSource(ssrc, boxes, opt),
)
ipcMain.handle('moveDve', (_e, me: number, keyer: number, dve: Dve, opt?: MoveOptions) =>
  control.moveDve(me, keyer, dve, opt),
)
ipcMain.handle('savePreset', (_e, p: SsPreset | DvePreset) => control.savePreset(p))
ipcMain.handle('deletePreset', (_e, id: string) => control.deletePreset(id))
ipcMain.handle('setMove', (_e, m: MoveOptions) => control.setMove(m))
ipcMain.handle('setHttpPort', (_e, port: number) => {
  store.data.settings.httpPort = port
  void store.save()
  applyHttp(port)
})

app.whenReady().then(async () => {
  await store.load()
  createWindow()
  applyHttp(store.data.settings.httpPort)
  const host = store.data.settings.host
  if (host) void control.connect(host)
})

app.on('window-all-closed', () => {
  void control.disconnect()
  app.quit()
})
