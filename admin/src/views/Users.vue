<template>
  <div class="users-page">
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
      <div class="page-actions">
        <el-button type="primary" @click="loadUsers">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="用户名">
          <el-input
            v-model="searchForm.username"
            placeholder="请输入用户名"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input
            v-model="searchForm.email"
            placeholder="请输入邮箱"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="全部" value="" />
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="userList"
        class="admin-table"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="id" label="ID" width="80" sortable="custom" />

        <el-table-column prop="username" label="用户名" min-width="120">
          <template #default="{ row }">
            <el-link type="primary" @click="viewUserDetail(row.id)">
              {{ row.username }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column prop="email" label="邮箱" min-width="180" />

        <el-table-column prop="points" label="积分" width="100" sortable="custom">
          <template #default="{ row }">
            <el-tag type="warning">{{ row.points || 0 }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="注册时间" width="180" sortable="custom">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column prop="last_login" label="最后登录" width="180">
          <template #default="{ row }">
            {{ row.last_login ? formatDate(row.last_login) : '从未登录' }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              type="text"
              size="small"
              @click="viewUserDetail(row.id)"
            >
              查看
            </el-button>
            <el-button
              type="text"
              size="small"
              :class="row.status === 'active' ? 'danger' : 'success'"
              @click="toggleUserStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList, updateUserStatus } from '@/api/users'

const router = useRouter()
const loading = ref(false)

// 搜索表单
const searchForm = reactive({
  username: '',
  email: '',
  status: ''
})

// 分页信息
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 排序信息
const sortInfo = reactive({
  prop: '',
  order: ''
})

// 用户列表
const userList = ref([])

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString()
}

// 加载用户列表
const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.size,
      search: searchForm.username || searchForm.email,
      status: searchForm.status
    }
    const response = await getUserList(params)
    if (response.success) {
      userList.value = response.data.items.map(user => ({
        ...user,
        points: user.total_points || 0
      }))
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadUsers()
}

// 重置搜索
const resetSearch = () => {
  Object.assign(searchForm, {
    username: '',
    email: '',
    status: ''
  })
  pagination.page = 1
  loadUsers()
}

// 排序变化
const handleSortChange = ({ prop, order }) => {
  sortInfo.prop = prop
  sortInfo.order = order
  loadUsers()
}

// 分页大小变化
const handleSizeChange = (size) => {
  pagination.size = size
  pagination.page = 1
  loadUsers()
}

// 当前页变化
const handleCurrentChange = (page) => {
  pagination.page = page
  loadUsers()
}

// 查看用户详情
const viewUserDetail = (id) => {
  router.push(`/users/${id}`)
}

// 切换用户状态
const toggleUserStatus = async (user) => {
  const action = user.status === 'active' ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定要${action}用户 "${user.username}" 吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const newStatus = user.status === 'active' ? 'banned' : 'active'
    await updateUserStatus(user.id, newStatus)

    // 更新本地状态
    user.status = newStatus

    ElMessage.success(`${action}成功`)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新用户状态失败:', error)
      ElMessage.error(`${action}失败`)
    }
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.search-card {
  margin-bottom: 20px;
}

.table-card {
  .el-table {
    margin-bottom: 20px;
  }
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.el-button.danger {
  color: #f56c6c;
}

.el-button.success {
  color: #67c23a;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .el-form--inline .el-form-item {
    display: block;
    margin-right: 0;
    margin-bottom: 16px;
  }
}
</style>

