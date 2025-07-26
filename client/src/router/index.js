import { createRouter, createWebHistory } from 'vue-router'

// 使用动态导入避免循环依赖
const HomePage = () => import('../views/HomePage.vue')
const ClothesSwap = () => import('../views/ClothesSwap.vue')

const FaceSwap = () => import('../views/FaceSwap.vue')
const Profile = () => import('../views/Profile.vue')




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
    path: '/face-swap',
    name: 'FaceSwap',
    component: FaceSwap,
    meta: {
      title: '极速换脸 - Imagic'
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: {
      title: '个人中心 - Imagic'
    }
  },

]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
