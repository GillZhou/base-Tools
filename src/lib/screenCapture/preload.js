const {
  contextBridge,
  ipcRenderer,
  desktopCapturer,
  nativeImage,
  clipboard
} = require('electron')
const { CaptureEditor } = require('./capture-editor')
let editorReady = true

ipcRenderer.on('startCapture-reply', (event, currentScreen) => {
  const thumbSize = determineScreenShotSize()
  const options = {
    types: ['screen'],
    thumbnailSize: thumbSize
  }
  const $canvas = document.getElementById('js-canvas')
  const $bg = document.getElementById('js-bg')
  const $sizeInfo = document.getElementById('js-size-info')
  const $toolbar = document.getElementById('js-toolbar')
  // const $pointPixel = document.getElementById('js-point-pixel');
  const $selectArea = document.getElementById('js-select-area')
  const $fixedImage = document.getElementById('js-fixed-image')

  const $btnFixed = document.getElementById('js-tool-fixed')
  const $btnClose = document.getElementById('js-tool-close')
  const $btnOk = document.getElementById('js-tool-ok')
  const $btnSave = document.getElementById('js-tool-save')
  const $btnReset = document.getElementById('js-tool-reset')

  const audio = new Audio()
  audio.src = './assets/audio/capture.mp3'
  desktopCapturer.getSources(options).then((sources) => {
    sources.forEach(source => {
      if (source.name === 'Entire Screen') {
        const imgSrc = source.thumbnail.toDataURL()
        $selectArea.style.display = 'block'
        const capture = new CaptureEditor($canvas, $bg, imgSrc, $selectArea, $fixedImage, currentScreen)
        const onDrag = (selectRect) => {
          $toolbar.style.display = 'none'
          $sizeInfo.style.display = 'block'
          $sizeInfo.innerText = `${selectRect.w} * ${selectRect.h}`
          if (selectRect.y > 30) {
            $sizeInfo.style.top = '-30px'
          } else {
            $sizeInfo.style.top = '0px'
          }
        }
        capture.on('start-dragging', onDrag)
        capture.on('dragging', onDrag)

        const onDragEnd = () => {
          if (capture.selectRect) {
            // ipcRenderer.send('capture-screen', {
            //     type: 'select',
            //     screenId: currentScreen.id,
            // })
            const {
              h,
              y
            } = capture.selectRect
            $toolbar.style.display = 'flex'
            if ((window.screen.height - y - h) < 30) {
              $toolbar.style.bottom = '0'
            } else {
              $toolbar.style.bottom = '-30px'
            }
            // $toolbar.style.top = `${b + 15}px`
            // $toolbar.style.right = `${window.screen.width - r}px`
          }
        }
        capture.on('end-dragging', onDragEnd)

        document.addEventListener('keydown', (e) => {
          switch (e.keyCode) {
          case 37:
            if (capture.selectRect.x <= 0) return
            capture.selectRect.x -= 1
            capture.drawRect()
            break
          case 38:
            if (capture.selectRect.y <= 0) return
            capture.selectRect.y -= 1
            capture.drawRect()
            break
          case 39:
            if ((capture.selectRect.x + capture.selectRect.w) >= capture.screenWidth) return
            capture.selectRect.x += 1
            capture.drawRect()
            break
          case 40:
            if ((capture.selectRect.y + capture.selectRect.h) >= capture.screenHeight) return
            capture.selectRect.y += 1
            capture.drawRect()
            break
          case 16:
            if (!capture.showEnlarge) return
            capture.colorHEX = !capture.colorHEX
            capture.toggleColor();
            break
          case 67:
            if (!capture.showEnlarge) return
            clipboard.writeText(capture.pixelColor)
            hideWindow()
            break
          case 13:
            selectCapture()
            break
          }
        })

        capture.on('reset', () => {
          $toolbar.style.display = 'none'
          $sizeInfo.style.display = 'none'
        })

        // 关闭事件
        $btnClose.addEventListener('click', () => {
          ipcRenderer.send('capture-screen', {
            type: 'close'
          })
          window.close()
        })

        // 重置事件
        $btnReset.addEventListener('click', () => {
          capture.reset()
        })

        const selectCapture = () => {
          if (!capture.selectRect) {
            return
          }
          const url = capture.getImageUrl()
          hideWindow()

          audio.play().then(function (e) {
            console.log('audio start')
          })
          audio.onended = () => {
            window.close()
          }
          const resImg = nativeImage.createFromDataURL(url)
          console.log(resImg)
          clipboard.writeImage(resImg)
          ipcRenderer.send('capture-screen', {
            type: 'complete',
            url
          })
        }

        // 复制到粘贴板事件
        $btnOk.addEventListener('click', selectCapture)

        // 保存按钮
        $btnSave.addEventListener('click', () => {
          if (!editorReady) return
          editorReady = false
          const url = capture.getImageUrl()
          savePicture(url)
          hideWindow()
        })

        // 固定到桌面事件
        $btnFixed.addEventListener('click', () => {
          if (!editorReady) return;
          editorReady = false;
          const {
            x,
            y,
            w,
            h
          } = capture.selectRect
          const imageData = capture.getImageUrl()
          const screenShotInfo = {
            x,
            y,
            w,
            h,
            imageData
          }
          showFixed(screenShotInfo)
        })
      }
    })
  })

  function determineScreenShotSize () {
    return {
      width: window.screen.width,
      height: window.screen.height
    }
  }
})

function hideWindow () {
  ipcRenderer.send('hideWindow-capture')
}

function showFixed(screenShotInfo) {
  ipcRenderer.send('showFixedImage-capture', screenShotInfo);
}

function savePicture (url) {
  ipcRenderer.send('savePicture-message', { url })
}

contextBridge.exposeInMainWorld('api', {
  startCapture () {
    ipcRenderer.send('startCapture-message')
  }
})
