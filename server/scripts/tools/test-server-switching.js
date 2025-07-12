// 测试ComfyUI服务器切换功能
import { getComfyUIConfig } from './client/src/services/config.js'
import serverManager from './client/src/services/serverManager.js'

async function testServerSwitching() {
  console.log('🧪 测试ComfyUI服务器切换功能...\n')
  
  try {
    // 1. 初始化服务器管理器
    console.log('📋 1. 初始化服务器管理器...')
    await serverManager.initialize()
    
    // 2. 获取配置
    console.log('\n📋 2. 获取ComfyUI配置...')
    const config = await getComfyUIConfig()
    console.log('配置信息:')
    console.log(`   主服务器: ${config.COMFYUI_SERVER_URL}`)
    console.log(`   备用服务器: ${config.BACKUP_SERVERS.join(', ')}`)
    console.log(`   自动切换: ${config.AUTO_SWITCH}`)
    console.log(`   健康检查超时: ${config.HEALTH_CHECK_TIMEOUT}ms`)
    console.log(`   重试次数: ${config.RETRY_ATTEMPTS}`)
    console.log(`   切换阈值: ${config.SWITCH_THRESHOLD}`)
    
    // 3. 获取当前服务器信息
    console.log('\n📋 3. 当前服务器信息...')
    const currentInfo = serverManager.getCurrentServerInfo()
    console.log(`   当前服务器: ${currentInfo.url}`)
    console.log(`   服务器索引: ${currentInfo.index}`)
    console.log(`   是否主服务器: ${currentInfo.isMainServer}`)
    console.log(`   失败次数: ${currentInfo.failureCount}`)
    console.log(`   总服务器数: ${currentInfo.totalServers}`)
    
    // 4. 检查所有服务器状态
    console.log('\n📋 4. 检查所有服务器状态...')
    const allStatuses = await serverManager.getAllServersStatus()
    allStatuses.forEach((server, index) => {
      console.log(`   服务器${index + 1}: ${server.url}`)
      console.log(`      状态: ${server.healthy ? '✅ 健康' : '❌ 不健康'}`)
      console.log(`      HTTP状态: ${server.status}`)
      console.log(`      消息: ${server.message}`)
      console.log(`      是否当前: ${server.isActive ? '是' : '否'}`)
      console.log(`      是否主服务器: ${server.isMain ? '是' : '否'}`)
      console.log(`      失败次数: ${server.failureCount}`)
      console.log('')
    })
    
    // 5. 模拟服务器失败
    console.log('📋 5. 模拟服务器失败...')
    console.log('记录第一次失败...')
    const switched1 = await serverManager.recordFailure()
    console.log(`切换结果: ${switched1 ? '已切换' : '未切换'}`)
    
    const newInfo1 = serverManager.getCurrentServerInfo()
    console.log(`当前服务器: ${newInfo1.url} (索引: ${newInfo1.index})`)
    
    // 6. 测试手动切换
    if (serverManager.servers.length > 1) {
      console.log('\n📋 6. 测试手动切换到备用服务器...')
      const targetIndex = serverManager.currentServerIndex === 0 ? 1 : 0
      console.log(`尝试切换到服务器${targetIndex + 1}: ${serverManager.servers[targetIndex]}`)
      
      const manualSwitch = await serverManager.switchToServer(targetIndex)
      console.log(`手动切换结果: ${manualSwitch ? '成功' : '失败'}`)
      
      const newInfo2 = serverManager.getCurrentServerInfo()
      console.log(`当前服务器: ${newInfo2.url} (索引: ${newInfo2.index})`)
    }
    
    // 7. 测试回到主服务器
    console.log('\n📋 7. 测试回到主服务器...')
    const returnToMain = await serverManager.tryReturnToMainServer()
    console.log(`回到主服务器结果: ${returnToMain ? '成功' : '失败'}`)
    
    const finalInfo = serverManager.getCurrentServerInfo()
    console.log(`最终服务器: ${finalInfo.url} (索引: ${finalInfo.index})`)
    console.log(`是否主服务器: ${finalInfo.isMainServer}`)
    
    // 8. 重置失败计数
    console.log('\n📋 8. 重置失败计数...')
    serverManager.resetFailureCount()
    console.log('失败计数已重置')
    
    console.log('\n🎉 服务器切换功能测试完成！')
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
    console.error('错误详情:', error.stack)
  }
}

// 运行测试
testServerSwitching()
