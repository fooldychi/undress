// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  console.error('❌ 服务器错误:', err);

  // MySQL错误处理
  if (err.code === 'ER_DUP_ENTRY') {
    const message = '数据已存在，请检查输入';
    error = { statusCode: 400, message };
  }

  if (err.code === 'ER_NO_SUCH_TABLE') {
    const message = '数据表不存在';
    error = { statusCode: 500, message };
  }

  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    const message = '数据库访问被拒绝';
    error = { statusCode: 500, message };
  }

  // JWT错误处理
  if (err.name === 'JsonWebTokenError') {
    const message = '无效的访问令牌';
    error = { statusCode: 401, message };
  }

  if (err.name === 'TokenExpiredError') {
    const message = '访问令牌已过期';
    error = { statusCode: 401, message };
  }

  // 验证错误处理
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { statusCode: 400, message };
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = '文件大小超出限制';
    error = { statusCode: 400, message };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = '意外的文件字段';
    error = { statusCode: 400, message };
  }

  // 默认错误响应
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
