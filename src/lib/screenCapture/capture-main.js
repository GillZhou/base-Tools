const {
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  dialog
} = require('electron')
const os = require('os')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')
const store = new Store()

let captureInstance = false

const fixedWindows = []

const captureScreen = (e, args) => {
  captureInstance = new BrowserWindow({
    fullscreen: os.platform() === 'win32' || undefined,
    width: 600,
    height: 600,
    x: 200,
    y: 200,
    transparent: true,
    frame: false,
    movable: false,
    resizable: false,
    enableLargerThanScreen: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '../src/lib/screenCapture/preload.js')
    }
  })

  captureInstance.on('close', (e) => {
    captureInstance = false
  })

  // captureInstance.setAlwaysOnTop(true, 'screen-saver');
  captureInstance.setVisibleOnAllWorkspaces(true)
  captureInstance.setFullScreenable(false)
  captureInstance.loadFile('../src/lib/screenCapture/capture.html').then(() => {
    console.log('start-capture')
  })

  globalShortcut.register('Esc', () => {
    console.log('close')
    captureInstance.close()
  })

  ipcMain.on('savePicture-message', (event, data) => {
    dialog.showSaveDialog({
      filters: [{
        name: 'Images',
        extensions: ['png', 'jpg', 'gif']
      }]
    }).then((res) => {
      if (!res.canceled) {
        fs.writeFile(res.filePath, Buffer.from(data.url.replace('data:image/png;base64,', '')), (err) => {
          if (err) return console.log(err)
        })
      }
      captureInstance.close()
    })
  })

  ipcMain.on('showFixedImage-capture', (event, screenShotInfo) => {
    const fixedImageInstance = new BrowserWindow({
      width: screenShotInfo.w,
      height: screenShotInfo.h,
      x: screenShotInfo.x,
      y: screenShotInfo.y,
      // transparent: true,
      frame: false,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, '../src/lib/screenCapture/fixedPreload.js')
      }
    })
    const lastScreenShot = store.has('lastScreenShot') ? store.get('lastScreenShot') : []
    lastScreenShot.push(screenShotInfo)
    store.set('lastScreenShot', lastScreenShot)
    // fixedImageInstance.setAlwaysOnTop(true, 'screen-saver')
    fixedImageInstance.setVisibleOnAllWorkspaces(true)
    fixedImageInstance.setFullScreenable(false)
    fixedImageInstance.setMovable(true)
    fixedImageInstance.loadFile('../src/lib/screenCapture/fixedImage.html').then((r) => {
      captureInstance.close()
      windowMove(fixedImageInstance)
      fixedWindows.push(fixedImageInstance)
    })
  })
  return captureInstance
}

const useCapture = () => {
  globalShortcut.register('CmdOrCtrl+Shift+O', function () {
    if (!captureInstance) {
      captureScreen()
    }
  })

  ipcMain.on('startScreenCapture', () => {
    captureScreen()
  })

  ipcMain.on('hideWindow-capture', () => {
    BrowserWindow.getFocusedWindow().hide()
  })

  ipcMain.on('startCapture-message', (event) => {
    const {
      x,
      y
    } = BrowserWindow.getFocusedWindow().getBounds()
    const replyData = screen.getAllDisplays().filter(d => d.bounds.x === x && d.bounds.y === y)[0]
    event.reply('startCapture-reply', replyData)
  })
}

function windowMove (win) {
  let winStartPosition = {
    x: 0,
    y: 0
  }
  let mouseStartPosition = {
    x: 0,
    y: 0
  }
  let movingInterval = null

  /**
   * 窗口移动事件
   */
  ipcMain.on('window-move-open', (events, canMoving) => {
    if (canMoving) {
      // 读取原位置
      const winPosition = win.getPosition()
      winStartPosition = {
        x: winPosition[0],
        y: winPosition[1]
      }
      mouseStartPosition = screen.getCursorScreenPoint()
      // 清除
      if (movingInterval) {
        clearInterval(movingInterval)
      }
      // 新开
      movingInterval = setInterval(() => {
        // 实时更新位置
        const cursorPosition = screen.getCursorScreenPoint()
        const x = winStartPosition.x + cursorPosition.x - mouseStartPosition.x
        const y = winStartPosition.y + cursorPosition.y - mouseStartPosition.y
        win.setPosition(x, y, true)
      }, 20)
    } else {
      clearInterval(movingInterval)
      movingInterval = null
    }
  })
}

exports.windowMove = windowMove

exports.useCapture = useCapture
exports.captureSceen = captureScreen
