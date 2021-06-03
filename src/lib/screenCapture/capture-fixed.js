
const $bg = document.getElementById('js-bg');
const Store = require('electron-store');
const store = new Store();

const lastScreenShotInfo = store.has('lastScreenShotInfo') ? store.get('lastScreenShotInfo') : [];
$bg.style.backgroundImage = lastScreenShotInfo.pop().imageData.buffer();
