const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20, // 增加连接池大小
  queueLimit: 0,
  charset: 'utf8mb4',
  acquireTimeout: 60000, // 获取连接超时时间
  timeout: 60000, // 查询超时时间
  reconnect: true, // 自动重连
  idleTimeout: 300000, // 空闲连接超时时间（5分钟）
  maxIdle: 10, // 最大空闲连接数
  enableKeepAlive: true, // 启用keep-alive
  keepAliveInitialDelay: 0
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 连接池事件监听
pool.on('connection', (connection) => {
  console.log('🔗 新的数据库连接已建立:', connection.threadId);
});

pool.on('error', (err) => {
  console.error('❌ 数据库连接池错误:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 数据库连接丢失，连接池将自动重连');
  }
});

// 定期检查连接池状态
const checkPoolStatus = () => {
  const poolInfo = {
    allConnections: pool.pool._allConnections.length,
    freeConnections: pool.pool._freeConnections.length,
    acquiringConnections: pool.pool._acquiringConnections.length
  };

  console.log('📊 数据库连接池状态:', poolInfo);

  // 如果空闲连接过少，发出警告
  if (poolInfo.freeConnections < 2 && poolInfo.allConnections > 15) {
    console.warn('⚠️ 数据库连接池可能存在连接泄漏');
  }
};

// 每分钟检查一次连接池状态
const poolMonitorInterval = setInterval(checkPoolStatus, 60000);

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    console.log(`📍 连接到: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

// 执行查询的辅助函数
async function query(sql, params = [], retryCount = 0) {
  const maxRetries = 3;

  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('数据库查询错误:', error);

    // 对于连接相关错误，尝试重试
    if ((error.code === 'PROTOCOL_CONNECTION_LOST' ||
         error.code === 'ECONNRESET' ||
         error.code === 'ETIMEDOUT') &&
         retryCount < maxRetries) {
      console.log(`🔄 数据库连接错误，正在重试... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return query(sql, params, retryCount + 1);
    }

    throw error;
  }
}

// 执行事务
async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 清理连接池
const closePool = async () => {
  try {
    if (poolMonitorInterval) {
      clearInterval(poolMonitorInterval);
    }
    await pool.end();
    console.log('✅ 数据库连接池已关闭');
  } catch (error) {
    console.error('❌ 关闭数据库连接池失败:', error);
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  closePool
};
