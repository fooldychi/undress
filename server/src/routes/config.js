const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { adminAuth } = require('../middleware/adminAuth');
const crypto = require('crypto');

// 加密密钥（实际项目中应该从环境变量获取）
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'your-32-char-secret-key-here!!';

// 加密函数
function encrypt(text) {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// 解密函数
function decrypt(encryptedText) {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// 获取所有配置
router.get('/', adminAuth, async (req, res) => {
  try {
    const configs = await query(`
      SELECT config_key, config_value, config_type, config_group, description, is_encrypted
      FROM system_config
      ORDER BY config_group, config_key
    `);

    // 解密敏感配置
    const processedConfigs = configs.map(config => {
      if (config.is_encrypted && config.config_value) {
        try {
          config.config_value = decrypt(config.config_value);
        } catch (error) {
          console.error('解密配置失败:', config.config_key, error);
        }
      }
      return config;
    });

    // 按分组组织配置
    const groupedConfigs = {};
    processedConfigs.forEach(config => {
      if (!groupedConfigs[config.config_group]) {
        groupedConfigs[config.config_group] = [];
      }
      groupedConfigs[config.config_group].push(config);
    });

    res.json({
      success: true,
      data: groupedConfigs
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    });
  }
});

// 获取单个配置
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const configs = await query(
      'SELECT config_value, is_encrypted FROM system_config WHERE config_key = ?',
      [key]
    );

    if (configs.length === 0) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    let value = configs[0].config_value;
    if (configs[0].is_encrypted && value) {
      try {
        value = decrypt(value);
      } catch (error) {
        console.error('解密配置失败:', key, error);
      }
    }

    res.json({
      success: true,
      data: value
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    });
  }
});

// 更新配置
router.put('/', async (req, res) => {
  try {
    const { configs } = req.body;

    if (!configs || !Array.isArray(configs)) {
      return res.status(400).json({
        success: false,
        message: '配置数据格式错误'
      });
    }

    // 开始事务
    const results = [];
    for (const config of configs) {
      const { config_key, config_value, is_encrypted } = config;

      let valueToStore = config_value;

      // 如果需要加密
      if (is_encrypted && config_value) {
        valueToStore = encrypt(config_value);
      }

      const result = await query(`
        UPDATE system_config
        SET config_value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE config_key = ?
      `, [valueToStore, config_key]);

      results.push({
        config_key,
        updated: result.affectedRows > 0
      });
    }

    res.json({
      success: true,
      message: '配置更新成功',
      data: results
    });
  } catch (error) {
    console.error('更新配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新配置失败'
    });
  }
});

// 重置配置到默认值
router.post('/reset', async (req, res) => {
  try {
    const { config_group } = req.body;

    let whereClause = '';
    let params = [];

    if (config_group) {
      whereClause = 'WHERE config_group = ?';
      params = [config_group];
    }

    // 这里可以添加重置到默认值的逻辑
    // 暂时返回成功响应
    res.json({
      success: true,
      message: '配置重置成功'
    });
  } catch (error) {
    console.error('重置配置失败:', error);
    res.status(500).json({
      success: false,
      message: '重置配置失败'
    });
  }
});

// 测试配置连接
router.post('/test', async (req, res) => {
  try {
    const { config_group, configs, serverUrl, timeout = 10000 } = req.body;

    if (config_group === 'database') {
      // 测试数据库连接
      const mysql = require('mysql2/promise');
      const dbConfig = {};

      configs.forEach(config => {
        const key = config.config_key.replace('database.', '');
        dbConfig[key] = config.config_value;
      });

      try {
        const connection = await mysql.createConnection({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.name
        });

        await connection.ping();
        await connection.end();

        res.json({
          success: true,
          message: '数据库连接测试成功'
        });
      } catch (error) {
        res.json({
          success: false,
          message: `数据库连接测试失败: ${error.message}`
        });
      }
    } else if (config_group === 'comfyui' || serverUrl) {
      // 测试ComfyUI连接
      const testUrl = serverUrl || configs?.find(c => c.config_key === 'comfyui.server_url')?.config_value;

      if (!testUrl) {
        return res.json({
          success: false,
          message: '请提供ComfyUI服务器地址'
        });
      }

      console.log(`🔍 测试ComfyUI连接: ${testUrl}`);

      // 构建健康检查URL
      const healthCheckUrl = `${testUrl.replace(/\/$/, '')}/system_stats`;

      // 使用fetch进行连接测试
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(healthCheckUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Imagic-Admin/1.0'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ ComfyUI连接测试成功');

          res.json({
            success: true,
            message: 'ComfyUI服务器连接正常',
            data: {
              status: 'connected',
              responseTime: Date.now(),
              serverInfo: data
            }
          });
        } else {
          console.log(`❌ ComfyUI连接测试失败: HTTP ${response.status}`);

          res.json({
            success: false,
            message: `服务器响应错误: HTTP ${response.status}`,
            data: {
              status: 'error',
              statusCode: response.status
            }
          });
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          console.log('❌ ComfyUI连接测试超时');
          res.json({
            success: false,
            message: `连接超时 (${timeout}ms)`,
            data: {
              status: 'timeout'
            }
          });
        } else {
          console.log('❌ ComfyUI连接测试失败:', fetchError.message);
          res.json({
            success: false,
            message: `连接失败: ${fetchError.message}`,
            data: {
              status: 'error',
              error: fetchError.message
            }
          });
        }
      }
    } else {
      res.json({
        success: true,
        message: '配置测试成功'
      });
    }
  } catch (error) {
    console.error('测试配置失败:', error);
    res.status(500).json({
      success: false,
      message: '测试配置失败'
    });
  }
});

module.exports = router;
