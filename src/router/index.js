import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'index',
    component: require('../views/Index').default
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
