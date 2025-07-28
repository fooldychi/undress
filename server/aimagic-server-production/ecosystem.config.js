module.exports = {
  apps: [{
    name: 'aimagic-server',
    script: 'src\\app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3007
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3007
    },
    // Windows路径格式的日志配置
    error_file: '.\\logs\\err.log',
    out_file: '.\\logs\\out.log',
    log_file: '.\\logs\\combined.log',
    time: true,

    // 进程管理配置
    min_uptime: '10s',
    max_restarts: 10,

    // 监控配置
    exec_mode: 'fork',

    // 环境变量文件
    env_file: '.env.production',

    // 启动延迟
    wait_ready: true,
    listen_timeout: 3000,
    kill_timeout: 5000,

    // Windows特定配置
    windowsHide: true,

    // 内存监控
    max_memory_restart: '1G',

    // 自动重启配置
    restart_delay: 4000,

    // 日志轮转
    log_date_format: 'YYYY-MM-DD HH:mm Z',

    // 合并日志
    merge_logs: true,

    // 进程标题
    name: 'aimagic-server-prod',

    // Windows服务配置
    node_args: '--max-old-space-size=1024'
  }],

  deploy: {
    production: {
      user: 'Administrator',
      host: '114.132.50.71',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/aimagic.git',
      path: 'C:\\inetpub\\wwwroot\\aimagic',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
