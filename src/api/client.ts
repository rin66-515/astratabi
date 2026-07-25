/**
 * 交付 API 的唯一入口。当前仅返回静态演示数据；正式后端接入时，页面组件无需改动。
 * 访问令牌、有效期、下载回数及文件签名地址必须由服务器端校验和生成。
 */
export type DeliverySummary = {
  projectName: string
  recipientLabel: string
  deliveryNumber: string
  expiresAt: string
  remainingDownloads: number
  files: string[]
}

export type DeliveryLookup =
  | { status: 'active', delivery: DeliverySummary }
  | { status: 'not-found' }

const demoDelivery: DeliverySummary = {
  projectName: 'ASRAY 勤怠・承認管理システム',
  recipientLabel: 'C001 / 配布先サンプル',
  deliveryNumber: 'DL-20260726-C001-0001',
  expiresAt: '2026-08-09 23:59 JST',
  remainingDownloads: 3,
  files: ['01_要件定義書_C001.xlsx', '02_基本設計書_F04_C001.xlsx', '03_詳細設計書_F04_C001.xlsx', '配布資料一覧_C001.xlsx'],
}

export async function getDeliveryByToken(token: string): Promise<DeliveryLookup> {
  // Future: GET /api/v1/deliveries/{token}
  // The backend must return only data authorized for this opaque, customer-specific token.
  return token === 'demo-astratabi-c001'
    ? { status: 'active', delivery: demoDelivery }
    : { status: 'not-found' }
}

export const futurePublicEndpoints = [
  'GET /api/v1/public/packages',
  'GET /api/v1/deliveries/{token}',
  'POST /api/v1/deliveries/{token}/download-tickets',
]

export const futureAdminEndpoints = [
  'POST /api/v1/admin/deliveries',
  'POST /api/v1/admin/deliveries/{id}/packages',
  'POST /api/v1/admin/deliveries/{id}/publish',
  'GET /api/v1/admin/deliveries/{id}/download-events',
]
