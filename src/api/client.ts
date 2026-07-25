/**
 * API 接続の入口。第一版は画面確認用のモックのみを返す。
 * 後続の Spring Boot API 実装時に、このファイルの fetch を有効化する。
 */
export type DeliverySummary = {
  projectName: string
  deliveryNumber: string
  expiresAt: string
  remainingDownloads: number
  files: string[]
}

export async function getDeliveryByToken(token: string): Promise<DeliverySummary> {
  // GET /api/v1/deliveries/{token}
  return {
    projectName: 'ASRAY 勤怠・承認管理システム',
    deliveryNumber: 'DL-20260726-C001-0001',
    expiresAt: '2026-08-09 23:59 JST',
    remainingDownloads: 3,
    files: ['01_要件定義書_C001.xlsx', '02_基本設計書_F04_C001.xlsx', '03_詳細設計書_F04_C001.xlsx', '配布資料一覧_C001.xlsx'],
  }
}

export const futureAdminEndpoints = [
  'POST /api/v1/admin/deliveries',
  'POST /api/v1/admin/deliveries/{id}/publish',
  'GET /api/v1/deliveries/{token}/download',
]
