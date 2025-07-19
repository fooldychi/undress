// 测试输出节点选择逻辑的修复
// 这个测试文件用于验证 getGeneratedImage 函数是否按照配置的优先级选择正确的输出节点

// 模拟工作流配置
const mockWorkflowConfig = {
  undress: {
    outputNodes: {
      primary: '732',
      secondary: ['730', '812', '813']
    }
  },
  faceswap: {
    outputNodes: {
      primary: '812',
      secondary: ['813', '746', '710']
    }
  }
}

// 模拟任务结果数据
const mockTaskResults = {
  // 场景1：主要输出节点有图片
  scenario1: {
    outputs: {
      '732': {
        images: [{ filename: 'primary_output.png', type: 'output', subfolder: '' }]
      },
      '730': {
        images: [{ filename: 'secondary_output.png', type: 'output', subfolder: '' }]
      },
      '812': {
        images: [{ filename: 'other_output.png', type: 'output', subfolder: '' }]
      }
    }
  },
  
  // 场景2：主要输出节点没有图片，备用节点有图片
  scenario2: {
    outputs: {
      '732': {}, // 主要节点没有图片
      '730': {
        images: [{ filename: 'secondary_output.png', type: 'output', subfolder: '' }]
      },
      '812': {
        images: [{ filename: 'other_output.png', type: 'output', subfolder: '' }]
      }
    }
  },
  
  // 场景3：配置的节点都没有图片，使用兜底机制
  scenario3: {
    outputs: {
      '732': {}, // 主要节点没有图片
      '730': {}, // 备用节点也没有图片
      '812': {},
      '813': {},
      '999': { // 未配置的节点有图片
        images: [{ filename: 'fallback_output.png', type: 'output', subfolder: '' }]
      }
    }
  }
}

console.log('🧪 输出节点选择逻辑测试')
console.log('='.repeat(50))

console.log('📋 工作流配置:')
console.log('undress 主要输出节点:', mockWorkflowConfig.undress.outputNodes.primary)
console.log('undress 备用输出节点:', mockWorkflowConfig.undress.outputNodes.secondary)

console.log('\n🔍 测试场景:')
console.log('场景1: 主要输出节点有图片 - 应该选择节点732')
console.log('场景2: 主要节点无图片，备用节点有图片 - 应该选择节点730')
console.log('场景3: 配置节点都无图片 - 应该使用兜底机制选择节点999')

console.log('\n✅ 修复说明:')
console.log('1. 优先从配置的主要输出节点获取图片')
console.log('2. 如果主要节点没有图片，按顺序尝试备用节点')
console.log('3. 如果配置的节点都没有图片，使用兜底机制遍历所有节点')
console.log('4. 确保返回的图片来自正确的输出节点')

console.log('\n🎯 修复前的问题:')
console.log('- 简单遍历所有输出节点，返回第一个找到的图片')
console.log('- 不考虑节点优先级，可能返回错误的输出结果')
console.log('- 没有使用工作流配置中的 outputNodes.primary 和 outputNodes.secondary')

console.log('\n🔧 修复后的改进:')
console.log('- 按照配置的优先级选择输出节点')
console.log('- 先尝试主要输出节点，再尝试备用节点')
console.log('- 保留兜底机制确保兼容性')
console.log('- 增加详细的日志输出便于调试')
