import request from '@/utils/request'

/**
 * 获取系统配置
 */
export function getSystemConfig() {
  return request({
    url: '/admin/config',
    method: 'get'
  })
}

/**
 * 保存系统配置
 */
export function saveSystemConfig(configs) {
  return request({
    url: '/admin/config',
    method: 'post',
    data: { configs }
  })
}

/**
 * 测试数据库连接
 */
export function testDatabase() {
  return request({
    url: '/admin/test-database',
    method: 'post'
  })
}
