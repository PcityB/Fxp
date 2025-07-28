import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: {
      title: 'Dashboard',
      icon: 'dashboard'
    }
  },
  {
    path: '/discovery',
    name: 'PatternDiscovery',
    component: () => import('@/views/PatternDiscovery.vue'),
    meta: {
      title: 'Pattern Discovery',
      icon: 'search'
    }
  },
  {
    path: '/analysis',
    name: 'PatternAnalysis',
    component: () => import('@/views/PatternAnalysis.vue'),
    meta: {
      title: 'Pattern Analysis',
      icon: 'analytics'
    }
  },
  {
    path: '/admin',
    name: 'AdminConsole',
    component: () => import('@/views/AdminConsole.vue'),
    meta: {
      title: 'Admin Console',
      icon: 'settings'
    }
  }
]
