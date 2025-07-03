<template>
  <div class="guide-page">
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
          <span class="guide-icon">🔧</span>
          CORS 跨域解决方案
        </h1>
        <p class="page-description">解决ComfyUI服务器跨域访问问题</p>
      </header>

      <main class="page-content">
        <div class="guide-section">
          <h2 class="section-title">
            <span class="section-icon">❓</span>
            什么是CORS问题？
          </h2>
          <div class="section-content">
            <p>CORS（跨域资源共享）是浏览器的安全机制，阻止网页从不同域名访问资源。当前网站部署在GitHub Pages上，而ComfyUI服务器在不同的域名，因此会被浏览器阻止。</p>
          </div>
        </div>

        <div class="guide-section">
          <h2 class="section-title">
            <span class="section-icon">💡</span>
            解决方案
          </h2>
          
          <div class="solution-cards">
            <div class="solution-card recommended">
              <div class="card-header">
                <h3 class="card-title">
                  <span class="card-icon">⭐</span>
                  方案1：配置ComfyUI服务器（推荐）
                </h3>
                <span class="recommended-badge">推荐</span>
              </div>
              <div class="card-content">
                <p class="card-description">在ComfyUI服务器上启用CORS支持，允许跨域访问。</p>
                <div class="steps">
                  <h4>配置步骤：</h4>
                  <ol>
                    <li>停止ComfyUI服务器</li>
                    <li>添加启动参数：<code>--cors-allow-origins=https://fooldychi.github.io</code></li>
                    <li>重新启动ComfyUI服务器</li>
                    <li>在本站配置中选择"直接连接"模式</li>
                  </ol>
                </div>
                <div class="code-example">
                  <h4>启动命令示例：</h4>
                  <pre><code>python main.py --cors-allow-origins=https://fooldychi.github.io</code></pre>
                </div>
              </div>
            </div>

            <div class="solution-card">
              <div class="card-header">
                <h3 class="card-title">
                  <span class="card-icon">🖥️</span>
                  方案2：本地运行代理服务器
                </h3>
              </div>
              <div class="card-content">
                <p class="card-description">运行项目提供的代理服务器，避免跨域问题。</p>
                <div class="steps">
                  <h4>配置步骤：</h4>
                  <ol>
                    <li>下载项目源码</li>
                    <li>安装依赖：<code>npm install</code></li>
                    <li>运行代理：<code>node proxy-server.js</code></li>
                    <li>在本站配置中选择"使用代理服务器"</li>
                  </ol>
                </div>
              </div>
            </div>

            <div class="solution-card">
              <div class="card-header">
                <h3 class="card-title">
                  <span class="card-icon">🌐</span>
                  方案3：本地运行整个应用
                </h3>
              </div>
              <div class="card-content">
                <p class="card-description">在本地运行整个应用，避免跨域限制。</p>
                <div class="steps">
                  <h4>配置步骤：</h4>
                  <ol>
                    <li>下载项目源码</li>
                    <li>安装依赖：<code>npm install</code></li>
                    <li>运行应用：<code>npm run dev</code></li>
                    <li>访问：<code>http://localhost:5173</code></li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="guide-section">
          <h2 class="section-title">
            <span class="section-icon">📋</span>
            常见问题
          </h2>
          <div class="faq-list">
            <div class="faq-item">
              <h4 class="faq-question">Q: 为什么公共CORS代理不工作？</h4>
              <p class="faq-answer">A: 大多数公共CORS代理只支持GET请求，不支持POST文件上传。ComfyUI需要POST请求上传图片，因此无法使用。</p>
            </div>
            <div class="faq-item">
              <h4 class="faq-question">Q: 配置CORS后仍然不工作怎么办？</h4>
              <p class="faq-answer">A: 请检查ComfyUI版本是否支持CORS参数，或尝试其他启动参数格式。不同版本的参数可能不同。</p>
            </div>
            <div class="faq-item">
              <h4 class="faq-question">Q: 有没有更简单的解决方案？</h4>
              <p class="faq-answer">A: 最简单的方案是本地运行整个应用（方案3），这样完全避免了跨域问题。</p>
            </div>
          </div>
        </div>

        <div class="action-section">
          <van-button
            @click="$router.push('/test')"
            type="primary"
            size="large"
            round
            block
          >
            前往诊断页面测试连接
          </van-button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
// 无需额外逻辑
</script>

<style scoped>
.guide-page {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
}

.container {
  max-width: 1000px;
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
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.guide-icon {
  font-size: 2rem;
}

.page-description {
  color: var(--text-light);
  font-size: 1.2rem;
  margin: 0;
}

.page-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.guide-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 24px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.section-icon {
  font-size: 1.5rem;
}

.section-content p {
  color: var(--text-light);
  line-height: 1.6;
  margin: 0;
}

.solution-cards {
  display: grid;
  gap: 24px;
}

.solution-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  transition: var(--transition);
}

.solution-card.recommended {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(var(--primary-color-rgb), 0.1) 100%);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.card-icon {
  font-size: 1.25rem;
}

.recommended-badge {
  background: var(--primary-color);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.card-description {
  color: var(--text-light);
  line-height: 1.6;
  margin: 0 0 16px 0;
}

.steps h4,
.code-example h4 {
  color: var(--text-color);
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 600;
}

.steps ol {
  margin: 0;
  padding-left: 20px;
  color: var(--text-light);
}

.steps li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.code-example {
  margin-top: 16px;
}

.code-example pre {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0 0 0;
  overflow-x: auto;
}

.code-example code {
  color: var(--text-color);
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.steps code {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: var(--text-color);
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.faq-item {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 16px;
}

.faq-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.faq-question {
  color: var(--text-color);
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.faq-answer {
  color: var(--text-light);
  line-height: 1.6;
  margin: 0;
}

.action-section {
  text-align: center;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
    flex-direction: column;
    gap: 8px;
  }
  
  .guide-section {
    padding: 24px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
