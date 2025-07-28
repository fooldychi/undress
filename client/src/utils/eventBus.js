/**
 * 事件总线 - 用于组件间通信
 * 主要用于积分更新、用户状态变化等全局事件
 */

class EventBus {
  constructor() {
    this.events = {}
  }

  /**
   * 监听事件
   * @param {string} event - 事件名称
   * @param {function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  /**
   * 移除事件监听
   * @param {string} event - 事件名称
   * @param {function} callback - 回调函数
   */
  off(event, callback) {
    if (!this.events[event]) return
    
    const index = this.events[event].indexOf(callback)
    if (index > -1) {
      this.events[event].splice(index, 1)
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    if (!this.events[event]) return
    
    this.events[event].forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`事件处理器执行失败 [${event}]:`, error)
      }
    })
  }

  /**
   * 只监听一次事件
   * @param {string} event - 事件名称
   * @param {function} callback - 回调函数
   */
  once(event, callback) {
    const onceCallback = (data) => {
      callback(data)
      this.off(event, onceCallback)
    }
    this.on(event, onceCallback)
  }

  /**
   * 清除所有事件监听
   */
  clear() {
    this.events = {}
  }

  /**
   * 获取事件监听器数量
   * @param {string} event - 事件名称
   * @returns {number} 监听器数量
   */
  listenerCount(event) {
    return this.events[event] ? this.events[event].length : 0
  }
}

// 创建全局事件总线实例
const eventBus = new EventBus()

// 定义事件常量
export const EVENTS = {
  // 积分相关事件
  POINTS_UPDATED: 'points:updated',           // 积分更新
  POINTS_CONSUMED: 'points:consumed',         // 积分消耗
  POINTS_RECHARGED: 'points:recharged',       // 积分充值
  
  // 用户相关事件
  USER_LOGIN: 'user:login',                   // 用户登录
  USER_LOGOUT: 'user:logout',                 // 用户登出
  USER_INFO_UPDATED: 'user:info_updated',     // 用户信息更新
  
  // AI处理相关事件
  AI_PROCESS_START: 'ai:process_start',       // AI处理开始
  AI_PROCESS_COMPLETE: 'ai:process_complete', // AI处理完成
  AI_PROCESS_ERROR: 'ai:process_error',       // AI处理错误
  
  // 系统相关事件
  NETWORK_STATUS: 'system:network_status',   // 网络状态变化
  CONFIG_UPDATED: 'system:config_updated'    // 配置更新
}

export default eventBus
