const {
  contextBridge,
  ipcRenderer
} = require('electron')

function windowMove (canMove = false) {
  ipcRenderer.send('window-move-open', canMove)
}

ipcRenderer.on('fixedImage-message', (event, screenShotInfo) => {
  document.getElementById('js-bg').style.backgroundImage = `url(${screenShotInfo.imageData})`
})

contextBridge.exposeInMainWorld('api', { windowMove })
