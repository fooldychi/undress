#!/usr/bin/env node

/**
 * AIMagic 项目端口配置管理器
 * 统一管理和验证所有服务的端口配置
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PortConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'port-config.json');
    this.config = this.loadConfig();
    this.logPath = path.join(__dirname, '..', 'PORT_CONFIG_CHANGELOG.md');
  }

  loadConfig() {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      console.error('❌ 无法加载端口配置文件:', error.message);
      process.exit(1);
    }
  }

  // 检查所有配置文件中的端口设置
  async checkPortConsistency() {
    console.log('🔍 检查端口配置一致性...\n');

    const issues = [];
    const standardPorts = this.config.ports;

    // 检查配置文件列表
    const configFiles = [
      {
        path: 'client/vite.config.js',
        service: 'client',
        patterns: [
          { regex: /port:\s*(\d+)/, description: 'Vite dev server port' }
        ]
      },
      {
        path: 'admin/vite.config.js',
        service: 'admin',
        patterns: [
          { regex: /port:\s*(\d+)/, description: 'Vite dev server port' }
        ]
      },
      {
        path: 'server/.env',
        service: 'server',
        patterns: [
          { regex: /PORT=(\d+)/, description: 'Server port' },
          { regex: /SERVER_PORT=(\d+)/, description: 'Server port variable' }
        ]
      },
      {
        path: 'server/src/app.js',
        service: 'server',
        patterns: [
          { regex: /PORT.*?(\d+)/, description: 'App.js port fallback' }
        ]
      }
    ];

    for (const configFile of configFiles) {
      const filePath = path.join(__dirname, '..', configFile.path);

      if (!fs.existsSync(filePath)) {
        issues.push({
          file: configFile.path,
          issue: '文件不存在',
          severity: 'warning'
        });
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const expectedPort = standardPorts[configFile.service];

      for (const pattern of configFile.patterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          const foundPort = parseInt(matches[1]);
          if (foundPort !== expectedPort) {
            issues.push({
              file: configFile.path,
              issue: `${pattern.description}: 发现端口 ${foundPort}, 期望 ${expectedPort}`,
              severity: 'error',
              foundPort,
              expectedPort,
              service: configFile.service
            });
          }
        }
      }
    }

    return issues;
  }

  // 修复端口配置
  async fixPortConfiguration() {
    console.log('🔧 开始修复端口配置...\n');

    const fixes = [];
    const standardPorts = this.config.ports;

    // 修复 client/vite.config.js
    await this.fixViteConfig('client', standardPorts.client, fixes);

    // 修复 admin/vite.config.js
    await this.fixViteConfig('admin', standardPorts.admin, fixes);

    // 修复 server/.env
    await this.fixServerEnv(standardPorts.server, fixes);

    // 修复 server/src/app.js 或 server/app.js
    await this.fixServerApp(standardPorts.server, fixes);

    // 记录修复日志
    if (fixes.length > 0) {
      this.logChanges(fixes);
    }

    return fixes;
  }

  async fixViteConfig(service, port, fixes) {
    const configPath = path.join(__dirname, '..', service, 'vite.config.js');

    if (!fs.existsSync(configPath)) {
      console.log(`⚠️ ${service}/vite.config.js 不存在，跳过修复`);
      return;
    }

    let content = fs.readFileSync(configPath, 'utf8');
    const originalContent = content;

    // 修复端口配置
    content = content.replace(
      /port:\s*\d+/g,
      `port: ${port}`
    );

    // 如果是 admin，还需要修复代理配置中的服务器端口
    if (service === 'admin') {
      content = content.replace(
        /target:\s*['"`]http:\/\/localhost:\d+['"`]/g,
        `target: 'http://localhost:${this.config.ports.server}'`
      );
    }

    if (content !== originalContent) {
      fs.writeFileSync(configPath, content);
      fixes.push({
        file: `${service}/vite.config.js`,
        action: `端口修复为 ${port}`,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ 修复 ${service}/vite.config.js 端口为 ${port}`);
    }
  }

  async fixServerEnv(port, fixes) {
    const envPath = path.join(__dirname, '..', 'server', '.env');

    if (!fs.existsSync(envPath)) {
      // 创建 .env 文件
      const envContent = `PORT=${port}\nSERVER_PORT=${port}\n`;
      fs.writeFileSync(envPath, envContent);
      fixes.push({
        file: 'server/.env',
        action: `创建 .env 文件，设置端口为 ${port}`,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ 创建 server/.env，端口设置为 ${port}`);
      return;
    }

    let content = fs.readFileSync(envPath, 'utf8');
    const originalContent = content;

    // 修复或添加 PORT 配置
    if (content.includes('PORT=')) {
      content = content.replace(/PORT=\d+/g, `PORT=${port}`);
    } else {
      content += `\nPORT=${port}`;
    }

    // 修复或添加 SERVER_PORT 配置
    if (content.includes('SERVER_PORT=')) {
      content = content.replace(/SERVER_PORT=\d+/g, `SERVER_PORT=${port}`);
    } else {
      content += `\nSERVER_PORT=${port}`;
    }

    if (content !== originalContent) {
      fs.writeFileSync(envPath, content);
      fixes.push({
        file: 'server/.env',
        action: `端口修复为 ${port}`,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ 修复 server/.env 端口为 ${port}`);
    }
  }

  async fixServerApp(port, fixes) {
    // 尝试两个可能的路径
    const appPaths = [
      path.join(__dirname, '..', 'server', 'src', 'app.js'),
      path.join(__dirname, '..', 'server', 'app.js')
    ];

    let appPath = null;
    for (const p of appPaths) {
      if (fs.existsSync(p)) {
        appPath = p;
        break;
      }
    }

    if (!appPath) {
      console.log(`⚠️ server/app.js 或 server/src/app.js 不存在，跳过修复`);
      return;
    }

    let content = fs.readFileSync(appPath, 'utf8');
    const originalContent = content;

    // 修复端口配置的默认值
    content = content.replace(
      /process\.env\.PORT\s*\|\|\s*\d+/g,
      `process.env.PORT || ${port}`
    );

    if (content !== originalContent) {
      fs.writeFileSync(appPath, content);
      fixes.push({
        file: 'server/src/app.js',
        action: `端口默认值修复为 ${port}`,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ 修复 server/src/app.js 端口默认值为 ${port}`);
    }
  }

  // 记录变更日志
  logChanges(fixes) {
    if (fixes.length === 0) return;

    const logEntry = `
## 端口配置修复 - ${new Date().toISOString()}

### 修复内容:
${fixes.map(fix => `- **${fix.file}**: ${fix.action}`).join('\n')}

### 标准端口配置:
- 客户端前端: ${this.config.ports.client}
- 后台管理系统: ${this.config.ports.admin}
- 后端API服务: ${this.config.ports.server}

---
`;

    if (fs.existsSync(this.logPath)) {
      const existingLog = fs.readFileSync(this.logPath, 'utf8');
      fs.writeFileSync(this.logPath, logEntry + existingLog);
    } else {
      const header = `# AIMagic 端口配置变更日志

此文件记录所有端口配置的变更历史。

`;
      fs.writeFileSync(this.logPath, header + logEntry);
    }
  }

  // 验证端口是否被占用
  async checkPortAvailability() {
    console.log('🔍 检查端口可用性...\n');

    const ports = Object.values(this.config.ports);
    const results = [];

    for (const port of ports) {
      try {
        // 在 Windows 上检查端口占用
        const command = process.platform === 'win32'
          ? `netstat -ano | findstr :${port}`
          : `lsof -i :${port}`;

        const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });

        if (output.trim()) {
          results.push({
            port,
            status: 'occupied',
            details: output.trim()
          });
        } else {
          results.push({
            port,
            status: 'available'
          });
        }
      } catch (error) {
        // 命令执行失败通常意味着端口未被占用
        results.push({
          port,
          status: 'available'
        });
      }
    }

    return results;
  }

  // 生成端口配置报告
  async generateReport() {
    console.log('📊 生成端口配置报告...\n');

    const issues = await this.checkPortConsistency();
    const availability = await this.checkPortAvailability();

    const report = {
      timestamp: new Date().toISOString(),
      standardPorts: this.config.ports,
      issues,
      portAvailability: availability,
      summary: {
        totalIssues: issues.length,
        errorCount: issues.filter(i => i.severity === 'error').length,
        warningCount: issues.filter(i => i.severity === 'warning').length,
        portsOccupied: availability.filter(p => p.status === 'occupied').length
      }
    };

    return report;
  }
}

// CLI 接口
async function main() {
  const manager = new PortConfigManager();
  const command = process.argv[2];

  switch (command) {
    case 'check':
      const issues = await manager.checkPortConsistency();
      if (issues.length === 0) {
        console.log('✅ 所有端口配置一致！');
      } else {
        console.log('❌ 发现端口配置问题:');
        issues.forEach(issue => {
          const icon = issue.severity === 'error' ? '❌' : '⚠️';
          console.log(`${icon} ${issue.file}: ${issue.issue}`);
        });
        process.exit(1);
      }
      break;

    case 'fix':
      const fixes = await manager.fixPortConfiguration();
      if (fixes.length === 0) {
        console.log('✅ 端口配置已经正确，无需修复');
      } else {
        console.log(`✅ 完成 ${fixes.length} 项端口配置修复`);
      }
      break;

    case 'report':
      const report = await manager.generateReport();
      console.log(JSON.stringify(report, null, 2));
      break;

    case 'availability':
      const availability = await manager.checkPortAvailability();
      availability.forEach(result => {
        const icon = result.status === 'available' ? '✅' : '❌';
        console.log(`${icon} 端口 ${result.port}: ${result.status}`);
        if (result.details) {
          console.log(`   ${result.details}`);
        }
      });
      break;

    default:
      console.log(`
AIMagic 端口配置管理器

用法:
  node scripts/port-config-manager.js <command>

命令:
  check        检查端口配置一致性
  fix          修复端口配置问题
  report       生成详细报告
  availability 检查端口可用性

示例:
  node scripts/port-config-manager.js check
  node scripts/port-config-manager.js fix
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PortConfigManager;
