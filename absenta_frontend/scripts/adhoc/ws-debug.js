import { io } from 'socket.io-client'

const url = process.env.WS_DEBUG_URL || process.env.VITE_SOCKET_URL || 'https://api.absenta.id'
const token = process.env.WS_DEBUG_TOKEN || ''
const tenantId = process.env.WS_DEBUG_TENANT_ID || ''

if (!token) {
  console.error('WS_DEBUG_TOKEN env is required')
  process.exit(1)
}

console.log('[WS DEBUG] connecting to', url, 'tenantId=', tenantId ? tenantId : '(none)')

const socket = io(url.replace(/\/$/, ''), {
  path: '/socket.io',
  transports: ['websocket'],
  auth: { token, tenantId }
})

socket.on('connect', () => {
  console.log('[WS DEBUG] connected', { id: socket.id })
  if (tenantId) {
    socket.emit('join_tenant', tenantId)
  }
  socket.emit('tenant_update_request', { tenantId: tenantId || undefined, type: 'all' })
})

socket.on('connect_error', (err) => {
  console.error('[WS DEBUG] connect_error', String(err && err.message ? err.message : err))
})

socket.on('disconnect', (reason) => {
  console.warn('[WS DEBUG] disconnect', String(reason))
})

const log = (name) => (payload) => {
  try {
    console.log(`[WS EVENT] ${name}`, JSON.stringify(payload).slice(0, 500))
  } catch {
    console.log(`[WS EVENT] ${name}`, payload)
  }
}

socket.on('tenant_metrics_update', log('tenant_metrics_update'))
socket.on('tenant_activities_update', log('tenant_activities_update'))
socket.on('tenant_logs_update', log('tenant_logs_update'))
socket.on('tenant_attendance_update', log('tenant_attendance_update'))
socket.on('tenant_billing_update', log('tenant_billing_update'))
socket.on('tenant_users_update', log('tenant_users_update'))

setTimeout(() => {
  console.log('[WS DEBUG] closing')
  try { socket.disconnect() } catch {}
  process.exit(0)
}, 15000)

