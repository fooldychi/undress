// 数据库迁移脚本：为 point_logs 表添加 image_url 字段
const { query } = require('../config/database');

async function addImageUrlToPointLogs() {
  try {
    console.log('🔧 开始为 point_logs 表添加 image_url 字段...');

    // 1. 检查当前 point_logs 表结构
    console.log('\n📊 检查当前 point_logs 表结构...');
    
    try {
      const tableStructure = await query('DESCRIBE point_logs');
      console.log('当前 point_logs 表结构:');
      console.table(tableStructure);
      
      // 检查 image_url 字段是否已存在
      const imageUrlField = tableStructure.find(field => field.Field === 'image_url');
      if (imageUrlField) {
        console.log('✅ image_url 字段已存在，无需添加');
        return;
      }
    } catch (error) {
      console.log('⚠️ point_logs 表不存在，需要先创建表');
      
      // 创建 point_logs 表（如果不存在）
      await query(`
        CREATE TABLE IF NOT EXISTS point_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          action_type ENUM('consume', 'bind', 'gift') NOT NULL COMMENT '操作类型：消费、绑定、赠送',
          points_amount INT NOT NULL COMMENT '积分数量',
          description VARCHAR(255) NOT NULL COMMENT '操作描述',
          image_url VARCHAR(500) NULL COMMENT '生成的图片URL',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_action_type (action_type),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分操作记录表'
      `);
      console.log('✅ point_logs 表创建成功（包含 image_url 字段）');
      return;
    }

    // 2. 添加 image_url 字段
    console.log('\n🔧 添加 image_url 字段...');
    
    await query(`
      ALTER TABLE point_logs 
      ADD COLUMN image_url VARCHAR(500) NULL COMMENT '生成的图片URL' 
      AFTER description
    `);
    
    console.log('✅ image_url 字段添加成功');

    // 3. 验证字段添加结果
    console.log('\n📊 验证字段添加结果...');
    const updatedStructure = await query('DESCRIBE point_logs');
    console.log('更新后的 point_logs 表结构:');
    console.table(updatedStructure);

    // 4. 检查表中的数据
    console.log('\n📈 检查表中的数据统计...');
    const dataStats = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN action_type = 'consume' THEN 1 END) as consume_records,
        COUNT(CASE WHEN action_type = 'bind' THEN 1 END) as bind_records,
        COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as records_with_image
      FROM point_logs
    `);
    
    console.log('数据统计:');
    console.table(dataStats);

    // 5. 显示最近的几条记录作为示例
    console.log('\n📝 最近的积分记录示例:');
    const recentRecords = await query(`
      SELECT id, user_id, action_type, points_amount, description, image_url, created_at
      FROM point_logs 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (recentRecords.length > 0) {
      console.table(recentRecords);
    } else {
      console.log('暂无积分记录');
    }

    console.log('\n🎉 image_url 字段添加完成！');
    console.log('📝 字段说明:');
    console.log('   - 字段名: image_url');
    console.log('   - 类型: VARCHAR(500)');
    console.log('   - 允许空值: YES');
    console.log('   - 用途: 存储用户消费积分时生成的图片URL');
    console.log('   - 位置: description 字段之后');

  } catch (error) {
    console.error('❌ 添加 image_url 字段失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addImageUrlToPointLogs()
    .then(() => {
      console.log('✅ 迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移失败:', error);
      process.exit(1);
    });
}

module.exports = { addImageUrlToPointLogs };
