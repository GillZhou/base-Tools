const Event = require('events')

const CREATE_RECT = 1
const MOVING_RECT = 2
const RESIZE = 3
const ENLARGE_RATE = 6

const ANCHORS = [
  {
    row: 'x',
    col: 'y',
    cursor: 'nwse-resize'
  },
  {
    row: '',
    col: 'y',
    cursor: 'ns-resize'
  },
  {
    row: 'r',
    col: 'y',
    cursor: 'nesw-resize'
  },

  {
    row: 'x',
    col: '',
    cursor: 'ew-resize'
  },
  {
    row: 'r',
    col: '',
    cursor: 'ew-resize'
  },

  {
    row: 'x',
    col: 'b',
    cursor: 'nesw-resize'
  },
  {
    row: '',
    col: 'b',
    cursor: 'ns-resize'
  },
  {
    row: 'r',
    col: 'b',
    cursor: 'nwse-resize'
  }
]

class CaptureEditor extends Event {
  constructor ($canvas, $bg, imageSrc, selectArea, fixedImage, currentScreen) {
    super()
    this.$canvas = $canvas
    this.imageSrc = imageSrc
    this.disabled = false
    this.$selectArea = selectArea
    this.$fixedImage = fixedImage
    this.scaleFactor = currentScreen.scaleFactor
    this.screenWidth = currentScreen.bounds.width
    this.screenHeight = currentScreen.bounds.height
    this.showEnlarge = false;
    this.enlargeArea = document.getElementById('enlarge-area')
    this.enlargePageX = document.getElementById('enlarge-pageX')
    this.enlargePageY = document.getElementById('enlarge-pageY')
    this.enlargeImage = document.getElementById('enlarge-image-value')
    this.enlargeColor = document.getElementById('enlarge-color-value')
    this.enlargeColorTemp = document.getElementById('enlarge-color-temp')
    this.colorHEX = false
    this.$bg = $bg
    this.$bg.style.backgroundImage = `url(${imageSrc})`
    this.ctx = $canvas.getContext('2d')

    this.onMouseDown = this.onMouseDown.bind(this)
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onMouseUp = this.onMouseUp.bind(this)

    this.init().then(() => {
      this.enlargeImage.src = imageSrc
      const baseImg = new Image()
      baseImg.src = imageSrc
      this.enlargeImage.style.width = `${baseImg.width * ENLARGE_RATE}px`
      this.enlargeImage.style.height = `${baseImg.height * ENLARGE_RATE}px`
      this.$canvas.addEventListener('mouseover', (e) => {
        this.showEnlarge = true
        this.enlargeArea.style.display = 'block'
      }, false)
      this.$canvas.addEventListener('mouseout', (e) => {
        this.showEnlarge = false
        this.enlargeArea.style.display = 'none'
      }, false)
      this.$canvas.addEventListener('mousemove', (e) => {
        const {
          pageX,
          pageY
        } = e
        this.enlargePageX.innerHTML = pageX
        this.enlargePageY.innerHTML = pageY
        this.enlargeArea.style.left = `${pageX + 20}px`
        this.enlargeArea.style.top = `${pageY + 20}px`
        this.enlargeImage.style.left = `-${pageX * ENLARGE_RATE - 90}px`
        this.enlargeImage.style.top = `-${pageY * ENLARGE_RATE - 60}px`
        const color = this.bgCtx.getImageData(pageX, pageY, 1, 1).data
        this.pixelColor = color;
        this.toggleColor();
        this.enlargeColorTemp.style.background = `rgb(${color[0]},${color[1]},${color[2]})`
      })
    })
  }

  toggleColor () {
    const color = this.pixelColor;
    if (this.colorHEX) {
      this.enlargeColor.innerHTML = this.colorRGB2Hex(color[0], color[1], color[2])
    } else {
      this.enlargeColor.innerHTML = `(${color[0]},${color[1]},${color[2]})`
    }
  }

  // 将rgb颜色转成hex  输入(24,12,255)
  colorRGB2Hex (r, g, b) {
    const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
    return hex.toUpperCase()
  }

  async init () {
    // this.$bg.style.backgroundImage = `url(${this.imageSrc})`
    this.$bg.style.backgroundSize = `${this.screenWidth}px ${this.screenHeight}px`
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = await new Promise((resolve) => {
      const img = new Image()
      img.src = this.imageSrc
      if (img.complete) {
        resolve(img)
      } else {
        img.onload = () => resolve(img)
      }
    })
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    this.bgCtx = ctx

    document.addEventListener('mousedown', this.onMouseDown)
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mouseup', this.onMouseUp)
  }

  onMouseDown (e) {
    if (this.disabled) {
      return
    }
    this.mouseDown = true
    const {
      pageX,
      pageY
    } = e
    if (this.selectRect) {
      const {
        w,
        h,
        x,
        y,
        r,
        b
      } = this.selectRect
      if (this.selectAnchorIndex !== -1) {
        this.startPoint = {
          x: pageX,
          y: pageY,
          moved: false,
          selectRect: {
            w,
            h,
            x,
            y,
            r,
            b
          },
          rawRect: {
            w,
            h,
            x,
            y,
            r,
            b
          }
        }
        this.action = RESIZE
        return
      }
      this.startPoint = {
        x: e.pageX,
        y: e.pageY,
        moved: false
      }
      if (pageX > x && pageX < r && pageY > y && pageY < b) {
        this.action = MOVING_RECT
        this.startDragRect = {
          x: pageX,
          y: pageY,
          selectRect: {
            x,
            y,
            w,
            h,
            r,
            b
          }
        }
      } else {
        this.action = CREATE_RECT
      }
    } else {
      this.action = CREATE_RECT
      this.startPoint = {
        x: e.pageX,
        y: e.pageY,
        moved: false
      }
      e.stopPropagation()
      e.preventDefault()
    }
  }

  onMouseDrag (e) {
    if (this.disabled) {
      return
    }
    e.stopPropagation()
    e.preventDefault()
    const {
      pageX,
      pageY
    } = e
    let startDragging
    let selectRect = this.selectRect
    if (!this.startPoint.moved) {
      if (Math.abs(this.startPoint.x - pageX) > 10 || Math.abs(this.startPoint.y - pageY) > 10) {
        this.startPoint.moved = true
        startDragging = true
      }
    }
    if (!this.startPoint.moved) {
      return
    }

    if (this.action === MOVING_RECT) {
      // 移动选区
      if (startDragging) {
        this.emit('start-dragging', selectRect)
      }
      this.emit('dragging', selectRect)
      const {
        w,
        h
      } = selectRect
      const {
        x: startX,
        y: startY
      } = this.startPoint
      let newX = this.startDragRect.selectRect.x + pageX - startX
      let newY = this.startDragRect.selectRect.y + pageY - startY
      let newR = newX + w
      let newB = newY + h
      if (newX < 0) {
        newX = 0
        newR = w
      } else if (newR > this.screenWidth) {
        newR = this.screenWidth
        newX = newR - w
      }
      if (newY < 0) {
        newY = 0
        newB = h
      } else if (newB > this.screenHeight) {
        newB = this.screenHeight
        newY = newB - h
      }
      this.selectRect = {
        w,
        h,
        x: newX,
        y: newY,
        r: newR,
        b: newB
      }
      this.drawRect()
    } else if (this.action === RESIZE) {
      this.emit('dragging', selectRect)
      const {
        row,
        col
      } = ANCHORS[this.selectAnchorIndex]
      if (row) {
        this.startPoint.rawRect[row] = this.startPoint.selectRect[row] + pageX - this.startPoint.x
        selectRect.x = this.startPoint.rawRect.x
        selectRect.r = this.startPoint.rawRect.r
        if (selectRect.x > selectRect.r) {
          const x = selectRect.r
          selectRect.r = selectRect.x
          selectRect.x = x
        }
        selectRect.w = selectRect.r - selectRect.x
        this.startPoint.rawRect.w = selectRect.w
      }
      if (col) {
        this.startPoint.rawRect[col] = this.startPoint.selectRect[col] + pageY - this.startPoint.y
        selectRect.y = this.startPoint.rawRect.y
        selectRect.b = this.startPoint.rawRect.b

        if (selectRect.y > selectRect.b) {
          const y = selectRect.b
          selectRect.b = selectRect.y
          selectRect.y = y
        }
        selectRect.h = selectRect.b - selectRect.y
        this.startPoint.rawRect.h = selectRect.h
      }
      this.drawRect()
    } else {
      // 生成选区
      const {
        pageX,
        pageY
      } = e
      let x, y, w, h, r, b
      if (this.startPoint.x > pageX) {
        x = pageX
        r = this.startPoint.x
      } else {
        r = pageX
        x = this.startPoint.x
      }
      if (this.startPoint.y > pageY) {
        y = pageY
        b = this.startPoint.y
      } else {
        b = pageY
        y = this.startPoint.y
      }
      w = r - x
      h = b - y

      this.selectRect = {
        x,
        y,
        w,
        h,
        r,
        b
      }
      selectRect = this.selectRect
      if (startDragging) {
        this.emit('start-dragging', selectRect)
      }
      this.emit('dragging', selectRect)
      this.drawRect(x, y, w, h)
    }
  }

  drawRect () {
    if (this.disabled) {
      return
    }
    if (!this.selectRect) {
      this.$canvas.style.display = 'none'
      return
    }
    const {
      x,
      y,
      w,
      h
    } = this.selectRect

    const scaleFactor = this.scaleFactor
    const margin = 0
    const radius = 2
    this.$canvas.style.left = `${x - margin}px`
    this.$canvas.style.top = `${y - margin}px`
    this.$canvas.style.width = `${w + margin * 2}px`
    this.$canvas.style.height = `${h + margin * 2}px`
    this.$canvas.style.display = 'block'
    this.$canvas.width = (w + margin * 2) * scaleFactor
    this.$canvas.height = (h + margin * 2) * scaleFactor

    // if (w && h) {
    //     let imageData = this.bgCtx.getImageData(x * scaleFactor, y * scaleFactor, w * scaleFactor, h * scaleFactor)
    //     this.ctx.putImageData(imageData, margin * scaleFactor, margin * scaleFactor)
    // }
    this.$selectArea.style.left = `${x - margin}px`
    this.$selectArea.style.top = `${y - margin}px`
    this.$selectArea.style.width = `${w + margin * 2}px`
    this.$selectArea.style.height = `${h + margin * 2}px`
    this.$selectArea.style.display = 'block'
    this.$selectArea.width = (w + margin * 2) * scaleFactor
    this.$selectArea.height = (h + margin * 2) * scaleFactor
    this.$selectArea.background = 'rgba(0, 0, 0, 0)'
    this.ctx.fillStyle = '#ffffff'
    this.ctx.strokeStyle = '#67bade'
    this.ctx.lineWidth = 2 * this.scaleFactor

    this.ctx.strokeRect(margin * scaleFactor, margin * scaleFactor, w * scaleFactor, h * scaleFactor)
    this.drawAnchors(w, h, margin, scaleFactor, radius)
  }

  drawAnchors (w, h, margin, scaleFactor, radius) {
    if (this.disabled) {
      return
    }
    if (this.mouseDown && this.action === CREATE_RECT) {
      this.anchors = null
      return
    }
    this.ctx.beginPath()
    const anchors = [
      [0, 0],
      [w * this.scaleFactor / 2, 0],
      [w * this.scaleFactor, 0],

      [0, h * this.scaleFactor / 2],
      [w * this.scaleFactor, h * this.scaleFactor / 2],

      [0, h * this.scaleFactor],
      [w * this.scaleFactor / 2, h * this.scaleFactor],
      [w * this.scaleFactor, h * this.scaleFactor]
    ]
    this.anchors = anchors.map(([x, y]) => [this.selectRect.x + x / scaleFactor, this.selectRect.y + y / scaleFactor])
    anchors.forEach(([x, y], i) => {
      this.ctx.arc(x + margin * scaleFactor, y + margin * scaleFactor, radius * scaleFactor, 0, 2 * Math.PI)
      const next = anchors[(i + 1) % anchors.length]
      this.ctx.moveTo(next[0] + margin * scaleFactor + radius * scaleFactor, next[1] + margin * scaleFactor)
    })
    this.ctx.closePath()
    this.ctx.fill()
    this.ctx.stroke()
  }

  onMouseMove (e) {
    if (this.disabled) {
      return
    }
    if (this.mouseDown) {
      this.onMouseDrag(e)
      return
    }
    this.selectAnchorIndex = -1
    if (this.selectRect) {
      const {
        pageX,
        pageY
      } = e
      const {
        x,
        y,
        r,
        b
      } = this.selectRect
      let selectAnchor
      let selectIndex = -1
      if (this.anchors) {
        this.anchors.forEach(([x, y], i) => {
          if (Math.abs(pageX - x) <= 10 && Math.abs(pageY - y) <= 10) {
            selectAnchor = [x, y]
            selectIndex = i
          }
        })
      }
      if (selectAnchor) {
        this.selectAnchorIndex = selectIndex
        document.body.style.cursor = ANCHORS[selectIndex].cursor
        this.emit('moving')
        return
      }
      if (pageX > x && pageX < r && pageY > y && pageY < b) {
        document.body.style.cursor = 'move'
      } else {
        document.body.style.cursor = 'auto'
      }
      this.emit('moving')
    }
  }

  onMouseUp (e) {
    if (this.disabled) {
      return
    }
    if (!this.mouseDown) {
      return
    }
    this.mouseDown = false
    e.stopPropagation()
    e.preventDefault()
    this.emit('mouse-up')
    if (!this.startPoint.moved) {
      this.emit('end-moving')
      return
    }
    this.emit('end-dragging')
    this.drawRect()
    this.startPoint = null
  }

  getImageUrl () {
    const {
      x,
      y,
      w,
      h
    } = this.selectRect
    if (w && h) {
      const imageData = this.bgCtx.getImageData(x, y, w, h)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.putImageData(imageData, 0, 0)
      return canvas.toDataURL()
    }
    return ''
  }

  disable () {
    this.disabled = true
  }

  enable () {
    this.disabled = false
  }

  reset () {
    this.anchors = null
    this.startPoint = null
    this.selectRect = null
    this.startDragRect = null
    this.selectAnchorIndex = -1
    this.$selectArea.style.width = '0'
    this.$selectArea.style.height = '0'
    this.drawRect()
    this.emit('reset')
  }
}

exports.CaptureEditor = CaptureEditor
exports.CREATE_RECT = CREATE_RECT
exports.MOVING_RECT = MOVING_RECT
exports.RESIZE = RESIZE
