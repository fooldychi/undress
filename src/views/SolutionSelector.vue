<template>
  <div class="solution-page">
    <div class="container">
      <header class="page-header">
        <van-button
          @click="$router.push('/')"
          type="default"
          size="small"
          plain
          round
          icon="arrow-left"
          class="back-btn"
        >
          返回首页
        </van-button>
        <h1 class="page-title">
          <span class="title-icon">🚀</span>
          选择解决方案
        </h1>
        <p class="page-description">由于浏览器CORS限制，前端无法直接访问ComfyUI服务器。请选择适合您的解决方案：</p>
      </header>

      <main class="page-content">
        <div class="solution-grid">
          <!-- 方案1：配置ComfyUI -->
          <div class="solution-card recommended">
            <div class="card-header">
              <div class="card-icon">⚙️</div>
              <div class="card-info">
                <h3 class="card-title">配置ComfyUI服务器</h3>
                <span class="difficulty easy">简单</span>
              </div>
              <span class="recommended-badge">推荐</span>
            </div>
            <div class="card-content">
              <p class="card-description">在ComfyUI服务器启动时添加CORS支持，允许网站访问。</p>
              <div class="pros-cons">
                <div class="pros">
                  <h4>✅ 优点：</h4>
                  <ul>
                    <li>配置简单，一次设置</li>
                    <li>性能最佳，直接连接</li>
                    <li>无需额外服务</li>
                  </ul>
                </div>
                <div class="cons">
                  <h4>❌ 缺点：</h4>
                  <ul>
                    <li>需要重启ComfyUI服务器</li>
                    <li>需要服务器管理权限</li>
                  </ul>
                </div>
              </div>
              <div class="action-buttons">
                <van-button @click="showComfyUIGuide = true" type="primary" size="normal" round>
                  查看配置教程
                </van-button>
              </div>
            </div>
          </div>

          <!-- 方案2：部署后端代理 -->
          <div class="solution-card">
            <div class="card-header">
              <div class="card-icon">🌐</div>
              <div class="card-info">
                <h3 class="card-title">部署后端代理</h3>
                <span class="difficulty medium">中等</span>
              </div>
            </div>
            <div class="card-content">
              <p class="card-description">部署一个支持CORS的后端服务，作为ComfyUI的代理。</p>
              <div class="pros-cons">
                <div class="pros">
                  <h4>✅ 优点：</h4>
                  <ul>
                    <li>不需要修改ComfyUI</li>
                    <li>可以添加额外功能</li>
                    <li>支持多个前端域名</li>
                  </ul>
                </div>
                <div class="cons">
                  <h4>❌ 缺点：</h4>
                  <ul>
                    <li>需要部署额外服务</li>
                    <li>增加系统复杂度</li>
                  </ul>
                </div>
              </div>
              <div class="action-buttons">
                <van-button @click="showBackendGuide = true" type="primary" size="normal" round>
                  查看部署教程
                </van-button>
              </div>
            </div>
          </div>

          <!-- 方案3：本地运行 -->
          <div class="solution-card">
            <div class="card-header">
              <div class="card-icon">🏠</div>
              <div class="card-info">
                <h3 class="card-title">本地运行应用</h3>
                <span class="difficulty easy">简单</span>
              </div>
            </div>
            <div class="card-content">
              <p class="card-description">在本地运行整个应用，完全避免跨域问题。</p>
              <div class="pros-cons">
                <div class="pros">
                  <h4>✅ 优点：</h4>
                  <ul>
                    <li>无跨域问题</li>
                    <li>完整功能支持</li>
                    <li>开发调试方便</li>
                  </ul>
                </div>
                <div class="cons">
                  <h4>❌ 缺点：</h4>
                  <ul>
                    <li>需要本地环境</li>
                    <li>无法在线分享</li>
                  </ul>
                </div>
              </div>
              <div class="action-buttons">
                <van-button @click="showLocalGuide = true" type="primary" size="normal" round>
                  查看运行教程
                </van-button>
              </div>
            </div>
          </div>

          <!-- 方案4：使用代理服务器 -->
          <div class="solution-card">
            <div class="card-header">
              <div class="card-icon">🔄</div>
              <div class="card-info">
                <h3 class="card-title">本地代理服务器</h3>
                <span class="difficulty medium">中等</span>
              </div>
            </div>
            <div class="card-content">
              <p class="card-description">运行项目提供的代理服务器，转发请求到ComfyUI。</p>
              <div class="pros-cons">
                <div class="pros">
                  <h4>✅ 优点：</h4>
                  <ul>
                    <li>不需要修改ComfyUI</li>
                    <li>可以使用在线版本</li>
                    <li>代理服务器已提供</li>
                  </ul>
                </div>
                <div class="cons">
                  <h4>❌ 缺点：</h4>
                  <ul>
                    <li>需要运行额外进程</li>
                    <li>依赖本地环境</li>
                  </ul>
                </div>
              </div>
              <div class="action-buttons">
                <van-button @click="showProxyGuide = true" type="primary" size="normal" round>
                  查看代理教程
                </van-button>
              </div>
            </div>
          </div>
        </div>

        <div class="help-section">
          <h2 class="help-title">💡 需要帮助？</h2>
          <p class="help-text">如果您不确定选择哪个方案，建议按以下顺序尝试：</p>
          <ol class="help-steps">
            <li><strong>方案1</strong> - 如果您有ComfyUI服务器管理权限</li>
            <li><strong>方案3</strong> - 如果您想快速测试功能</li>
            <li><strong>方案4</strong> - 如果您想继续使用在线版本</li>
            <li><strong>方案2</strong> - 如果您需要生产级部署</li>
          </ol>
        </div>
      </main>
    </div>

    <!-- 配置指南模态框 -->
    <van-popup v-model:show="showComfyUIGuide" position="center" :style="{ width: '90%', maxWidth: '600px' }">
      <div class="guide-modal">
        <h3>ComfyUI CORS 配置教程</h3>
        <div class="guide-content">
          <h4>方法1：启动参数（推荐）</h4>
          <pre><code>python main.py --cors-allow-origins=https://fooldychi.github.io</code></pre>
          
          <h4>方法2：环境变量</h4>
          <pre><code>export CORS_ALLOW_ORIGINS=https://fooldychi.github.io
python main.py</code></pre>
          
          <h4>方法3：修改配置文件</h4>
          <p>在ComfyUI的配置文件中添加CORS设置（具体方法因版本而异）</p>
        </div>
        <van-button @click="showComfyUIGuide = false" type="primary" block>关闭</van-button>
      </div>
    </van-popup>

    <!-- 其他指南模态框... -->
  </div>
</template>

<script setup>
import { ref } from 'vue'

const showComfyUIGuide = ref(false)
const showBackendGuide = ref(false)
const showLocalGuide = ref(false)
const showProxyGuide = ref(false)
</script>

<style scoped>
.solution-page {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-title {
  color: var(--text-color);
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.title-icon {
  font-size: 2rem;
}

.page-description {
  color: var(--text-light);
  font-size: 1.1rem;
  line-height: 1.6;
  max-width: 800px;
  margin: 0 auto;
}

.solution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.solution-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  transition: var(--transition);
}

.solution-card.recommended {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, var(--bg-card) 0%, rgba(var(--primary-color-rgb), 0.1) 100%);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.card-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
}

.card-title {
  color: var(--text-color);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.difficulty {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.difficulty.easy {
  background: var(--success-color);
  color: white;
}

.difficulty.medium {
  background: var(--warning-color);
  color: white;
}

.recommended-badge {
  background: var(--primary-color);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  flex-shrink: 0;
}

.card-description {
  color: var(--text-light);
  line-height: 1.6;
  margin-bottom: 20px;
}

.pros-cons {
  display: grid;
  gap: 16px;
  margin-bottom: 20px;
}

.pros h4,
.cons h4 {
  color: var(--text-color);
  font-size: 0.9rem;
  margin: 0 0 8px 0;
}

.pros ul,
.cons ul {
  margin: 0;
  padding-left: 16px;
  color: var(--text-light);
  font-size: 0.9rem;
}

.pros li,
.cons li {
  margin-bottom: 4px;
}

.help-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 32px;
  text-align: center;
}

.help-title {
  color: var(--text-color);
  font-size: 1.5rem;
  margin-bottom: 16px;
}

.help-text {
  color: var(--text-light);
  margin-bottom: 20px;
}

.help-steps {
  text-align: left;
  max-width: 600px;
  margin: 0 auto;
  color: var(--text-light);
}

.guide-modal {
  padding: 24px;
  background: var(--bg-card);
  border-radius: 16px;
}

.guide-modal h3 {
  color: var(--text-color);
  margin-bottom: 20px;
}

.guide-modal h4 {
  color: var(--text-color);
  margin: 16px 0 8px 0;
}

.guide-modal pre {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
}

.guide-modal code {
  color: var(--text-color);
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .solution-grid {
    grid-template-columns: 1fr;
  }
  
  .page-title {
    font-size: 2rem;
    flex-direction: column;
    gap: 8px;
  }
}
</style>
