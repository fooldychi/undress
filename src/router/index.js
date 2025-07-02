import { createRouter, createWebHistory } from 'vue-router'

// 使用动态导入避免循环依赖
const HomePage = () => import('../views/HomePage.vue')
const ClothesSwap = () => import('../views/ClothesSwap.vue')
const TextToImage = () => import('../views/TextToImage.vue')
const FaceSwap = () => import('../views/FaceSwap.vue')
const DebugPage = () => import('../views/DebugPage.vue')
const ApiTestPage = () => import('../views/ApiTestPage.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
    meta: {
      title: '首页 - Imagic AI图像处理'
    }
  },
  {
    path: '/clothes-swap',
    name: 'ClothesSwap',
    component: ClothesSwap,
    meta: {
      title: '一键换衣 - Imagic'
    }
  },
  {
    path: '/text-to-image',
    name: 'TextToImage',
    component: TextToImage,
    meta: {
      title: '文生图 - Imagic'
    }
  },
  {
    path: '/face-swap',
    name: 'FaceSwap',
    component: FaceSwap,
    meta: {
      title: '极速换脸 - Imagic'
    }
  },
  {
    path: '/debug',
    name: 'Debug',
    component: DebugPage,
    meta: {
      title: 'ComfyUI调试 - Imagic'
    }
  },
  {
    path: '/api-test',
    name: 'ApiTest',
    component: ApiTestPage,
    meta: {
      title: 'API测试 - Imagic'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫，更新页面标题
router.beforeEach((to, _from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

export default router
