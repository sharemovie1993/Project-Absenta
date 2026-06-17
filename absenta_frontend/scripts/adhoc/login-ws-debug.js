import axios from 'axios'
import { io } from 'socket.io-client'

const base = process.env.WS_DEBUG_URL || process.env.VITE_SOCKET_URL || 'https://api.absenta.id'
const email = process.env.WS_DEBUG_EMAIL || 'superadmin@system.com'
const password = process.env.WS_DEBUG_PASSWORD || 'superadmin123'
const tenantId = process.env.WS_DEBUG_TENANT_ID || ''
const tenantDomain = process.env.WS_DEBUG_TENANT_DOMAIN || ''

const root = base.replace(/\/$/, '')
const authUrl = root.replace(/\/api\/?$/, '') + '/auth/login'

async function main() {
  try {
    console.log('[WS DEBUG AUTO] login to', authUrl, 'email=', email, 'tenantDomain=', tenantDomain || '(none)')
    const loginHeaders = { 'Content-Type': 'application/json' }
    if (tenantDomain) {
      loginHeaders['X-Tenant-Domain'] = tenantDomain
      loginHeaders['X-Tenant-Sub'] = tenantDomain
    }
    const res = await axios.post(authUrl, { email, password }, { headers: loginHeaders })
    const ok = !!res?.data?.success
    if (!ok) {
      console.error('[WS DEBUG AUTO] login failed:', res?.data?.message)
      process.exit(1)
    }
    const token = res?.data?.data?.token || res?.data?.data?.access_token
    if (!token) {
      console.error('[WS DEBUG AUTO] token missing in login response')
      process.exit(1)
    }
    console.log('[WS DEBUG AUTO] token acquired, connecting WS to', root)

    const socket = io(root, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token, tenantId }
    })

    socket.on('connect', () => {
      console.log('[WS DEBUG AUTO] connected id=', socket.id)
      if (tenantId) socket.emit('join_tenant', tenantId)
      socket.emit('tenant_update_request', { tenantId: tenantId || undefined, type: 'all' })
    })
    socket.on('connect_error', (err) => {
      console.error('[WS DEBUG AUTO] connect_error', String(err && err.message ? err.message : err))
    })
    socket.on('disconnect', (reason) => {
      console.warn('[WS DEBUG AUTO] disconnect', String(reason))
    })

    const log = (name) => (payload) => {
      try { console.log(`[WS EVENT] ${name}`, JSON.stringify(payload).slice(0, 500)) } catch { console.log(`[WS EVENT] ${name}`, payload) }
    }
    socket.on('tenant_metrics_update', log('tenant_metrics_update'))
    socket.on('tenant_activities_update', log('tenant_activities_update'))
    socket.on('tenant_logs_update', log('tenant_logs_update'))
    socket.on('tenant_attendance_update', log('tenant_attendance_update'))
    socket.on('tenant_billing_update', log('tenant_billing_update'))
    socket.on('tenant_users_update', log('tenant_users_update'))

    setTimeout(() => { console.log('[WS DEBUG AUTO] closing'); try { socket.disconnect() } catch {}; process.exit(0) }, 15000)
  } catch (e) {
    console.error('[WS DEBUG AUTO] error', e?.response?.data || (e && e.message ? e.message : String(e)))
    process.exit(1)
  }
}

main()
