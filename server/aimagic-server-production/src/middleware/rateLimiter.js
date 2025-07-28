const { RateLimiterMemory } = require('rate-limiter-flexible');

// 创建速率限制器
const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'middleware',
  points: 100, // 每个时间窗口允许的请求数
  duration: 60, // 时间窗口（秒）
});

// 速率限制中间件
const rateLimiterMiddleware = async (req, res, next) => {
  try {
    // 使用IP地址作为限制键
    const key = req.ip || req.connection.remoteAddress;
    
    await rateLimiter.consume(key);
    next();
  } catch (rejRes) {
    // 超出限制时的响应
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    
    res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
      retryAfter: secs
    });
  }
};

module.exports = rateLimiterMiddleware;
