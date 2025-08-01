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

/**
 * 测试ComfyUI连接
 */
export function testComfyUIConnection(serverUrl, timeout = 10000) {
  return request({
    url: '/admin/config/test',
    method: 'post',
    data: {
      config_group: 'comfyui',
      serverUrl,
      timeout
    }
  })
}

/**
 * 批量测试多个ComfyUI服务器
 */
export function testMultipleServers(servers, timeout = 10000) {
  return request({
    url: '/admin/config/test-multiple',
    method: 'post',
    data: {
      servers,
      timeout
    }
  })
}
