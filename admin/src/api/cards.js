import request from '@/utils/request'

/**
 * 获取等级卡列表
 */
export function getCardList(params) {
  return request({
    url: '/admin/cards',
    method: 'get',
    params
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
