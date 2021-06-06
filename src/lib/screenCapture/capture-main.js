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

let captureInstance = false

const fixedWindows = []

let freeWindow = null

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

  captureInstance.on('closed', (e) => {
    captureInstance = false
    globalShortcut.unregister('Esc')
  })

  captureInstance.setAlwaysOnTop(true, 'screen-saver', 2);
  captureInstance.setVisibleOnAllWorkspaces(true)
  captureInstance.setFullScreenable(false)
  captureInstance.loadFile('../src/lib/screenCapture/capture.html').then(() => {
    console.log('start-capture');
    if (!freeWindow) {
      freeWindow = new BrowserWindow({
        width: 1000,
        height: 1000,
        frame: false,
        transparent: true,
        hasShadow: false,
        show: false,
        webPreferences: {
          preload: path.join(__dirname, '../src/lib/screenCapture/fixedPreload.js')
        }
      })
    }
  })

  globalShortcut.register('Esc', () => {
    console.log('close')
    captureInstance.close()
  })
  return captureInstance
}

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
  console.time('fixed-start')
  const fixedImageInstance = freeWindow;
  freeWindow = null;
  fixedImageInstance.loadFile('../src/lib/screenCapture/fixedImage.html').then(() => {
    console.log('load end')
    fixedImageInstance.setSize(screenShotInfo.w, screenShotInfo.h)
    fixedImageInstance.setPosition(screenShotInfo.x, screenShotInfo.y)
    fixedImageInstance.setAlwaysOnTop(true, 'screen-saver', 1)
    fixedImageInstance.setVisibleOnAllWorkspaces(true)
    fixedImageInstance.setFullScreenable(false)
    fixedImageInstance.setMovable(true)
    fixedImageInstance.webContents.send('fixedImage-message', screenShotInfo)
    fixedWindows.push(fixedImageInstance)
    captureInstance.close()
    fixedImageInstance.show()
    console.timeEnd('fixed-start')
    fixedImageInstance.on('closed', (event) => {
      const index = fixedWindows.indexOf(event);
      fixedWindows.splice(index, 1)
    })
  })
})

ipcMain.on('window-move-open', (events, canMoving) => {
  let win = null;
  fixedWindows.forEach(item => {
    if (item.isFocused()) {
      win = item;
    }
  });
  if (canMoving) {
    // 读取原位置
    const winPosition = win.getPosition()
    win.winStartPosition = {
      x: winPosition[0],
      y: winPosition[1]
    }
    win.mouseStartPosition = screen.getCursorScreenPoint()
    // 清除
    if (win.movingInterval) {
      clearInterval(win.movingInterval)
    }
    // 新开
    win.movingInterval = setInterval(() => {
      // 实时更新位置
      const cursorPosition = screen.getCursorScreenPoint()
      const x = win.winStartPosition.x + cursorPosition.x - win.mouseStartPosition.x
      const y = win.winStartPosition.y + cursorPosition.y - win.mouseStartPosition.y
      win.setPosition(x, y, true)
      // win.mouseStartPosition = cursorPosition;
    }, 1)
  } else {
    clearInterval(win.movingInterval)
    win.movingInterval = null
  }
})

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

exports.useCapture = useCapture
exports.captureSceen = captureScreen
