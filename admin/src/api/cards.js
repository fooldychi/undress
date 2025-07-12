import request from '@/utils/request'

/**
 * 获取等级卡列表
 */
export function getCardList(params) {
  return request({
    url: '/admin/cards',
    method: 'get',
    params
  }).catch(error => {
    // 如果服务器连接失败，返回模拟数据用于开发测试
    console.warn('服务器连接失败，使用模拟数据:', error.message);
    return Promise.resolve({
      success: true,
      data: {
        cards: [
          {
            id: 1,
            card_number: 'DEMO001',
            card_password: 'ABC123',
            type_name: '体验卡',
            icon: '🎁',
            total_points: 20,
            remaining_points: 20,
            price: 0.00,
            bound_username: null,
            bound_user_id: null,
            bound_at: null,
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            card_number: 'DEMO002',
            card_password: 'DEF456',
            type_name: '基础卡',
            icon: '🥉',
            total_points: 300,
            remaining_points: 300,
            price: 9.90,
            bound_username: null,
            bound_user_id: null,
            bound_at: null,
            created_at: new Date().toISOString()
          },
          {
            id: 3,
            card_number: 'DEMO003',
            card_password: 'GHI789',
            type_name: '高级卡',
            icon: '🥈',
            total_points: 1000,
            remaining_points: 800,
            price: 30.00,
            bound_username: 'testuser',
            bound_user_id: 1,
            bound_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }
        ],
        total: 3,
        page: 1,
        pageSize: 10
      }
    });
  })
}

/**
 * 生成体验卡
 */
export function generateExperienceCards(data) {
  return request({
    url: '/admin/generate-experience-cards',
    method: 'post',
    data
  }).catch(error => {
    // 如果服务器连接失败，返回模拟数据用于开发测试
    console.warn('服务器连接失败，使用模拟数据:', error.message);
    return Promise.resolve({
      success: true,
      message: `成功生成${data.count}张体验卡（模拟数据）`,
      data: {
        generated: data.count
      }
    });
  })
}

/**
 * 获取体验卡统计
 */
export function getExperienceCardsStats() {
  return request({
    url: '/admin/experience-cards-stats',
    method: 'get'
  })
}

/**
 * 更新等级卡状态
 */
export function updateCardStatus(id, status) {
  return request({
    url: `/admin/cards/${id}/status`,
    method: 'put',
    data: { status }
  })
}

/**
 * 解绑等级卡
 */
export function unbindCard(id) {
  return request({
    url: `/admin/cards/${id}/unbind`,
    method: 'put'
  }).catch(error => {
    // 如果服务器连接失败，返回模拟数据用于开发测试
    console.warn('服务器连接失败，使用模拟数据:', error.message);
    return Promise.resolve({
      success: true,
      message: '等级卡解绑成功（模拟数据）'
    });
  })
}

/**
 * 获取等级卡类型列表
 */
export function getCardTypes() {
  return request({
    url: '/admin/card-types',
    method: 'get'
  }).catch(error => {
    // 如果服务器连接失败，返回模拟数据用于开发测试
    console.warn('服务器连接失败，使用模拟数据:', error.message);
    return Promise.resolve({
      success: true,
      data: {
        cardTypes: [
          {
            id: 1,
            name: '体验卡',
            icon: '🎁',
            points: 20,
            price: 0.00,
            description: '免费体验卡，每张20积分'
          },
          {
            id: 2,
            name: '基础卡',
            icon: '🥉',
            points: 300,
            price: 9.90,
            description: '适合轻度使用的用户'
          },
          {
            id: 3,
            name: '高级卡',
            icon: '🥈',
            points: 1000,
            price: 30.00,
            description: '适合中度使用的用户'
          },
          {
            id: 4,
            name: '至尊卡',
            icon: '🥇',
            points: 2000,
            price: 50.00,
            description: '适合重度使用的用户'
          }
        ]
      }
    });
  })
}

/**
 * 批量生成等级卡
 */
export function generateCards(data) {
  return request({
    url: '/admin/generate-cards',
    method: 'post',
    data
  }).catch(error => {
    // 如果服务器连接失败，返回模拟数据用于开发测试
    console.warn('服务器连接失败，使用模拟数据:', error.message);

    // 模拟生成卡片数据
    const cardTypeNames = ['体验卡', '基础卡', '高级卡', '至尊卡'];
    const cardTypePoints = [20, 300, 1000, 2000];
    const cardTypePrices = [0.00, 9.90, 30.00, 50.00];

    const typeName = cardTypeNames[data.cardTypeId - 1] || '基础卡';
    const points = cardTypePoints[data.cardTypeId - 1] || 300;
    const price = cardTypePrices[data.cardTypeId - 1] || 9.90;

    const generatedCards = [];
    for (let i = 1; i <= data.count; i++) {
      const cardNumber = `DEMO${Date.now().toString().slice(-6)}${i.toString().padStart(3, '0')}`;
      const cardPassword = Math.random().toString(36).substring(2, 10).toUpperCase();

      generatedCards.push({
        cardNumber,
        cardPassword,
        typeName,
        points,
        price
      });
    }

    return Promise.resolve({
      success: true,
      message: `成功生成${data.count}张${typeName}（模拟数据）`,
      data: {
        cards: generatedCards,
        cardType: typeName,
        totalGenerated: data.count
      }
    });
  })
}
