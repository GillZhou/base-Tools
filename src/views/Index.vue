<template>
  <div class="container">
    <button @click="startScreenCapture">屏幕截取</button>
  </div>
</template>

<script>
const { ipcRenderer } = require('electron');

export default {
  name: 'index',
  data() {
    return {};
  },
  methods: {
    startScreenCapture() {
      ipcRenderer.send('startScreenCapture');
    }
  }
};
</script>
