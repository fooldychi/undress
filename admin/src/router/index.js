import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/auth'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// 配置NProgress
NProgress.configure({ showSpinner: false })

// 路由配置
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: {
      title: '登录 - iComfy管理系统',
      requiresAuth: false
    }
  },
  {
    path: '/',
    redirect: '/dashboard',
    component: () => import('@/views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: {
          title: '仪表盘 - iComfy管理系统',
          icon: 'DataBoard'
        }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/Users.vue'),
        meta: {
          title: '用户管理 - iComfy管理系统',
          icon: 'User'
        }
      },
      {
        path: 'users/:id',
        name: 'UserDetail',
        component: () => import('@/views/UserDetail.vue'),
        meta: {
          title: '用户详情 - iComfy管理系统',
          hidden: true
        }
      },
      {
        path: 'cards',
        name: 'Cards',
        component: () => import('@/views/Cards.vue'),
        meta: {
          title: '等级卡管理 - iComfy管理系统',
          icon: 'CreditCard'
        }
      },
      {
        path: 'points',
        name: 'Points',
        component: () => import('@/views/Points.vue'),
        meta: {
          title: '积分记录 - iComfy管理系统',
          icon: 'Coin'
        }
      },
      {
        path: 'config',
        name: 'Config',
        component: () => import('@/views/Config.vue'),
        meta: {
          title: '系统配置 - iComfy管理系统',
          icon: 'Setting'
        }
      },
      {
        path: 'workflow-config',
        name: 'WorkflowConfig',
        component: () => import('@/views/WorkflowConfig.vue'),
        meta: {
          title: '工作流配置 - iComfy管理系统',
          icon: 'Operation'
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面不存在 - iComfy管理系统'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  NProgress.start()

  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title
  }

  // 检查认证
  const token = getToken()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false)

  if (requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

router.afterEach(() => {
  NProgress.done()
})

export default router
