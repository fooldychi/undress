const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixConfig() {
  let connection;
  try {
    // 直接创建连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功');

    const updates = [
      ['workflow.faceswap.input_nodes.face_photo_1', '670'],
      ['workflow.faceswap.input_nodes.face_photo_2', '662'],
      ['workflow.faceswap.input_nodes.face_photo_3', '658'],
      ['workflow.faceswap.input_nodes.face_photo_4', '655'],
      ['workflow.faceswap.input_nodes.target_image', '737'],
      ['workflow.faceswap.output_nodes.primary', '812'],
      ['workflow.faceswap.output_nodes.secondary', '813,746,710'],
      ['workflow.faceswap.description', '高质量人脸替换工作流'],
      ['workflow.faceswap.name', 'Face Swap 2.0'],
      ['workflow.undress.input_nodes.main_image', '49'],
      ['workflow.undress.input_nodes.seed_node', '174'],
      ['workflow.undress.output_nodes.primary', '730'],
      ['workflow.undress.output_nodes.secondary', '812,813,746,710'],
      ['workflow.undress.description', '一键褪衣AI工作流'],
      ['workflow.undress.name', 'Undress AI']
    ];

    for (const [key, value] of updates) {
      await connection.execute(
        'UPDATE system_config SET config_value = ? WHERE config_key = ?',
        [value, key]
      );
      console.log(`✅ 更新: ${key} = ${value}`);
    }

    // 验证结果
    const [rows] = await connection.execute(
      'SELECT config_key, config_value FROM system_config WHERE config_group = "workflow" ORDER BY config_key'
    );

    console.log('\n📊 修复后的配置:');
    rows.forEach(row => {
      console.log(`  ${row.config_key}: ${row.config_value}`);
    });

    console.log('\n🎉 配置修复完成！');

  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixConfig();
