const {
  contextBridge,
  ipcRenderer
} = require('electron')
const Store = require('electron-store')
const store = new Store()

function getLastScreenShot () {
  const lastScreenShot = store.has('lastScreenShot') ? store.get('lastScreenShot') : []
  console.log(lastScreenShot)
  return lastScreenShot.pop().imageData
}

function windowMove (canMove = false) {
  ipcRenderer.send('window-move-open', canMove)
}

contextBridge.exposeInMainWorld('api', { getLastScreenShot, windowMove })
