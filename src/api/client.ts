/**
 * AstraTabi 后端 API 的唯一入口。
 * 令牌、下载次数、交付状态和文件路径均以服务端数据为准，前端不会提交或计算这些值。
 */

export type ApiError = Error & { code?: string; status?: number }

export type DeliverySummary = {
  projectName: string
  recipientLabel: string
  deliveryNumber: string
  expiresAt: string
  remainingDownloads: number
  packageName: string
  message: string
}

export type DeliveryLookup =
  | { status: 'active'; delivery: DeliverySummary }
  | { status: 'password-required' | 'expired'; delivery: DeliverySummary }
  | { status: 'not-found' }

export type AdminSession = { loginId: string; authenticated: boolean }

export type DeliveryStatus = 'DRAFT' | 'PREPARING' | 'ISSUED' | 'EXPIRED' | 'REVOKED' | 'CANCELLED'
export type PackageReleaseStatus = 'ACTIVE' | 'ARCHIVED'

export type PackageRelease = {
  id: string
  projectCode: string
  baseName: string
  productId: string
  version: string
  releaseDate: string
  fileName: string
  sha256: string
  fileSize: number
  status: PackageReleaseStatus
  uploadedBy: string
  uploadedAt: string
  archivedAt: string | null
}

export type AdminDelivery = {
  id: string
  deliveryNo: string
  customerCode: string
  customerName: string
  projectName: string
  packageName: string
  packageReleaseId: string | null
  packageVersion: string | null
  status: DeliveryStatus
  expiresAt: string
  downloadLimit: number
  downloadCount: number
  remainingDownloads: number
  watermarkText: string
  packageReady: boolean
}

export type AdminDeliveryDetail = {
  delivery: AdminDelivery
  deliveryLink: string | null
  linkState: 'AVAILABLE' | 'LEGACY_UNRECOVERABLE' | 'NONE'
}

export type Page<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export type DeliverySummaryCounts = { total: number; issued: number; preparing: number; revoked: number }
export type DeliveryEvent = { occurredAt: string; eventType: string; clientIp: string | null }

type Csrf = { headerName: string; token: string }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { credentials: 'include', ...init })
  if (!response.ok) {
    let detail: { code?: string; message?: string } = {}
    try { detail = await response.json() } catch { /* response intentionally has no body */ }
    const error = new Error(detail.message ?? '通信に失敗しました。') as ApiError
    error.code = detail.code
    error.status = response.status
    throw error
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

async function csrf(): Promise<Csrf> {
  return request<Csrf>('/api/v1/admin/auth/csrf')
}

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await csrf()
  const headers = new Headers(init.headers)
  headers.set(token.headerName, token.token)
  return request<T>(path, { ...init, headers })
}

function toDeliverySummary(payload: PublicDeliveryPayload): DeliverySummary {
  return {
    projectName: payload.projectName,
    recipientLabel: payload.recipientLabel,
    deliveryNumber: payload.deliveryNumber,
    expiresAt: new Date(payload.expiresAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short' }) + ' JST',
    remainingDownloads: payload.remainingDownloads,
    packageName: payload.packageName,
    message: payload.message,
  }
}

type PublicDeliveryPayload = {
  state: 'ACTIVE' | 'PASSWORD_REQUIRED' | 'EXPIRED'
  projectName: string
  recipientLabel: string
  deliveryNumber: string
  expiresAt: string
  remainingDownloads: number
  packageName: string
  message: string
}

export async function getDeliveryByToken(token: string): Promise<DeliveryLookup> {
  try {
    const payload = await request<PublicDeliveryPayload>(`/api/v1/deliveries/${encodeURIComponent(token)}`)
    const delivery = toDeliverySummary(payload)
    if (payload.state === 'ACTIVE') return { status: 'active', delivery }
    if (payload.state === 'PASSWORD_REQUIRED') return { status: 'password-required', delivery }
    return { status: 'expired', delivery }
  } catch (error) {
    if ((error as ApiError).status === 404) return { status: 'not-found' }
    throw error
  }
}

export function requestDownloadTicket(token: string) {
  return request<{ downloadUrl: string; remainingDownloads: number }>(`/api/v1/deliveries/${encodeURIComponent(token)}/download-tickets`, { method: 'POST' })
}

export type CustomerPackageResult = {
  state: 'READY'
  fileName: string
  sha256: string
  encryptedWorkbookCount: number
  asrayUserId: string | null
  asrayActivationUrl: string | null
}

export function setDocumentPassword(token: string, password: string, passwordConfirmation: string) {
  return request<CustomerPackageResult>(`/api/v1/deliveries/${encodeURIComponent(token)}/document-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, passwordConfirmation }),
  })
}

export function getAdminSession() {
  return request<AdminSession>('/api/v1/admin/auth/session')
}

export function login(loginId: string, password: string) {
  return adminRequest<AdminSession>('/api/v1/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password }),
  })
}

export function logout() {
  return adminRequest<void>('/api/v1/admin/auth/logout', { method: 'POST' })
}

export function getAdminDeliveries(params: { keyword?: string; status?: DeliveryStatus; page?: number; size?: number } = {}) {
  const query = new URLSearchParams()
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.status) query.set('status', params.status)
  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 8))
  return request<Page<AdminDelivery>>(`/api/v1/admin/deliveries?${query}`)
}

export function getAdminDelivery(id: string) {
  return request<AdminDeliveryDetail>(`/api/v1/admin/deliveries/${id}`)
}

export function getAdminSummary() {
  return request<DeliverySummaryCounts>('/api/v1/admin/deliveries/summary')
}

export function getAdminEvents(id: string) {
  return request<DeliveryEvent[]>(`/api/v1/admin/deliveries/${id}/events`)
}

export function getPackageReleases(includeArchived = false) {
  return request<PackageRelease[]>(`/api/v1/admin/package-releases?includeArchived=${includeArchived}`)
}

export function uploadPackageRelease(archive: File, checksum: File) {
  const body = new FormData()
  body.set('archive', archive)
  body.set('checksum', checksum)
  return adminRequest<{ release: PackageRelease; duplicate: boolean }>('/api/v1/admin/package-releases', {
    method: 'POST', body,
  })
}

export function archivePackageRelease(id: string) {
  return adminRequest<PackageRelease>(`/api/v1/admin/package-releases/${id}/archive`, { method: 'POST' })
}

export function createDelivery(payload: { customerName: string; packageReleaseId: string; expiresAt: string; downloadLimit: number }) {
  return adminRequest<AdminDelivery>('/api/v1/admin/deliveries', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
}

export function issueDelivery(id: string, reissue = false) {
  return adminRequest<{ delivery: AdminDelivery; deliveryLink: string; notice: string }>(`/api/v1/admin/deliveries/${id}/${reissue ? 'reissue' : 'issue'}`, { method: 'POST' })
}

export function extendDelivery(id: string, expiresAt: string) {
  return adminRequest<AdminDelivery>(`/api/v1/admin/deliveries/${id}/extend`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresAt }),
  })
}

export function revokeDelivery(id: string) {
  return adminRequest<AdminDelivery>(`/api/v1/admin/deliveries/${id}/revoke`, { method: 'POST' })
}
