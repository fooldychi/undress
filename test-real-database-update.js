const fetch = require('node-fetch');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testRealDatabaseUpdate() {
  let connection;
  try {
    console.log('🧪 测试真实数据库更新...');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'aimagic',
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功');

    // 1. 记录更新前的状态
    console.log('\n📊 记录更新前的状态...');
    const [beforeUpdate] = await connection.execute(`
      SELECT workflow_type, node_key, node_id, updated_at
      FROM workflow_configs
      WHERE workflow_type = 'faceswap' AND node_key = 'face_photo_1'
    `);
    
    console.log('更新前状态:', beforeUpdate[0]);

    // 2. 先登录获取token
    console.log('\n🔑 登录获取管理员token...');
    const loginResponse = await fetch('http://localhost:3007/api/admin-auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      throw new Error('登录失败: ' + loginData.message);
    }
    
    const token = loginData.data.token;
    console.log('✅ 登录成功，获取到token');

    // 3. 发送批量更新请求
    console.log('\n📝 发送批量更新请求...');
    const testNodeId = '999'; // 使用一个测试值
    const updateData = {
      workflows: {
        faceswap: {
          name: 'Face Swap 2.0 - 测试更新',
          description: '测试更新描述',
          enabled: true,
          inputNodes: {
            face_photo_1: testNodeId,
            face_photo_2: '662',
            target_image: '737'
          },
          outputNodes: [
            { key: 'primary', nodeId: '812', order: 1 },
            { key: 'secondary_1', nodeId: '813', order: 2 }
          ]
        }
      }
    };

    console.log('发送的数据:', JSON.stringify(updateData, null, 2));

    const updateResponse = await fetch('http://localhost:3007/api/workflow-config/batch-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const updateResult = await updateResponse.json();
    console.log('API响应:', updateResult);

    if (!updateResult.success) {
      throw new Error('批量更新失败: ' + updateResult.message);
    }

    // 4. 等待一下，然后检查数据库
    console.log('\n⏳ 等待2秒后检查数据库...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. 验证数据库是否真的更新了
    console.log('\n🔍 验证数据库更新结果...');
    const [afterUpdate] = await connection.execute(`
      SELECT workflow_type, node_key, node_id, updated_at
      FROM workflow_configs
      WHERE workflow_type = 'faceswap' AND node_key = 'face_photo_1'
    `);
    
    console.log('更新后状态:', afterUpdate[0]);

    // 6. 检查工作流基础信息是否更新
    const [workflowInfo] = await connection.execute(`
      SELECT workflow_name, description, updated_at
      FROM workflow_info
      WHERE workflow_type = 'faceswap'
    `);
    
    console.log('工作流基础信息:', workflowInfo[0]);

    // 7. 比较更新前后的差异
    console.log('\n📈 更新结果分析:');
    
    if (beforeUpdate[0].node_id !== afterUpdate[0].node_id) {
      console.log(`✅ 节点ID已更新: ${beforeUpdate[0].node_id} -> ${afterUpdate[0].node_id}`);
    } else {
      console.log(`❌ 节点ID未更新: 仍然是 ${afterUpdate[0].node_id}`);
    }
    
    if (beforeUpdate[0].updated_at !== afterUpdate[0].updated_at) {
      console.log(`✅ 更新时间已变化: ${beforeUpdate[0].updated_at} -> ${afterUpdate[0].updated_at}`);
    } else {
      console.log(`❌ 更新时间未变化: 仍然是 ${afterUpdate[0].updated_at}`);
    }

    // 8. 检查是否真的更新到了我们发送的值
    if (afterUpdate[0].node_id === testNodeId) {
      console.log(`🎉 数据库真实更新成功！节点ID已更新为测试值: ${testNodeId}`);
      return true;
    } else {
      console.log(`❌ 数据库未真实更新！期望值: ${testNodeId}，实际值: ${afterUpdate[0].node_id}`);
      return false;
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testRealDatabaseUpdate().then(success => {
  if (success) {
    console.log('\n🎉 真实数据库更新测试成功！');
  } else {
    console.log('\n❌ 真实数据库更新测试失败！');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ 测试过程失败:', error);
  process.exit(1);
});
