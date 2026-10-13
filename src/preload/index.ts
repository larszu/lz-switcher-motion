import { contextBridge, ipcRenderer } from 'electron'

const invoke =
  (ch: string) =>
  (...args: unknown[]) =>
    ipcRenderer.invoke(ch, ...args)

function on(ch: string) {
  return (fn: (v: unknown) => void) => {
    const h = (_e: unknown, v: unknown) => fn(v)
    ipcRenderer.on(ch, h)
    return () => ipcRenderer.removeListener(ch, h)
  }
}

contextBridge.exposeInMainWorld('lzsm', {
  init: invoke('init'),
  connect: invoke('connect'),
  disconnect: invoke('disconnect'),
  setBox: invoke('setBox'),
  setDve: invoke('setDve'),
  moveSuperSource: invoke('moveSuperSource'),
  moveDve: invoke('moveDve'),
  savePreset: invoke('savePreset'),
  deletePreset: invoke('deletePreset'),
  setMove: invoke('setMove'),
  setHttpPort: invoke('setHttpPort'),
  onSnapshot: on('snapshot'),
  onPresets: on('presets'),
  onLog: on('log'),
})
