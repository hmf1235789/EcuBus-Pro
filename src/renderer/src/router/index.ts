import { createRouter, createMemoryHistory, RouteRecordRaw } from 'vue-router'
import HomeView from '@r/views/home/home.vue'
import UdsView from '@r/views/uds/uds.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/uds',
    name: 'uds',
    component: UdsView
  }
]

const router = createRouter({
  history: createMemoryHistory(),
  routes: routes,
})

export default router
