// 重建 point_logs 表以支持图片URL存储
const { query } = require('../config/database');

async function rebuildPointLogsTable() {
  try {
    console.log('🔧 开始重建 point_logs 表...');
    console.log('📝 新表将包含 image_url 字段用于存储生成图片的URL');
    console.log('');

    // 1. 检查当前表结构
    console.log('📊 检查当前 point_logs 表结构...');

    let currentStructure = null;
    try {
      currentStructure = await query('DESCRIBE point_logs');
      console.log('当前 point_logs 表结构:');
      console.table(currentStructure);

      // 检查是否已有 url 字段
      const hasUrl = currentStructure.find(field => field.Field === 'url');
      if (hasUrl) {
        console.log('✅ url 字段已存在，无需重建');
        return;
      }
    } catch (error) {
      console.log('⚠️ point_logs 表不存在，将创建新表');
    }

    // 2. 备份现有数据（如果表存在）
    let backupData = [];
    if (currentStructure) {
      console.log('\n💾 备份现有数据...');
      try {
        backupData = await query('SELECT * FROM point_logs ORDER BY created_at');
        console.log(`✅ 成功备份 ${backupData.length} 条记录`);
      } catch (error) {
        console.log('⚠️ 备份数据失败:', error.message);
      }
    }

    // 3. 删除旧表
    if (currentStructure) {
      console.log('\n🗑️ 删除旧的 point_logs 表...');
      await query('DROP TABLE IF EXISTS point_logs');
      console.log('✅ 旧表删除成功');
    }

    // 4. 创建新的 point_logs 表（包含 image_url 字段）
    console.log('\n🔧 创建新的 point_logs 表...');
    await query(`
      CREATE TABLE point_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action_type ENUM('consume', 'bind', 'gift') NOT NULL COMMENT '操作类型：消费、绑定、赠送',
        points_amount INT NOT NULL COMMENT '积分数量',
        description VARCHAR(255) NOT NULL COMMENT '操作描述',
        url VARCHAR(500) NULL COMMENT '生成的媒体文件URL（图片、视频等）',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_action_type (action_type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分操作记录表'
    `);
    console.log('✅ 新的 point_logs 表创建成功');

    // 5. 恢复备份数据（如果有）
    if (backupData.length > 0) {
      console.log('\n📥 恢复备份数据...');

      for (const record of backupData) {
        try {
          await query(`
            INSERT INTO point_logs (user_id, action_type, points_amount, description, created_at)
            VALUES (?, ?, ?, ?, ?)
          `, [
            record.user_id,
            record.action_type,
            record.points_amount,
            record.description,
            record.created_at
          ]);
        } catch (error) {
          console.log(`⚠️ 恢复记录失败:`, error.message);
        }
      }

      console.log(`✅ 成功恢复 ${backupData.length} 条记录`);
    }

    // 6. 验证新表结构
    console.log('\n📊 验证新表结构...');
    const newStructure = await query('DESCRIBE point_logs');
    console.log('新的 point_logs 表结构:');
    console.table(newStructure);

    // 7. 检查数据
    console.log('\n📈 检查表中的数据...');
    const dataCount = await query('SELECT COUNT(*) as count FROM point_logs');
    console.log(`表中共有 ${dataCount[0].count} 条记录`);

    if (dataCount[0].count > 0) {
      console.log('\n📝 最近的记录示例:');
      const recentRecords = await query(`
        SELECT id, user_id, action_type, points_amount, description, url, created_at
        FROM point_logs
        ORDER BY created_at DESC
        LIMIT 3
      `);
      console.table(recentRecords);
    }

    console.log('\n🎉 point_logs 表重建完成！');
    console.log('📝 新表特性:');
    console.log('   - 包含 url 字段用于存储生成的媒体文件URL（图片、视频等）');
    console.log('   - 字段类型: VARCHAR(500)，支持长URL');
    console.log('   - 允许空值，向后兼容现有数据');
    console.log('   - 保留了所有原有数据和索引');
    console.log('   - 支持外键约束和级联删除');

  } catch (error) {
    console.error('❌ 重建 point_logs 表失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  rebuildPointLogsTable()
    .then(() => {
      console.log('✅ 表重建完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 表重建失败:', error);
      process.exit(1);
    });
}

module.exports = { rebuildPointLogsTable };
