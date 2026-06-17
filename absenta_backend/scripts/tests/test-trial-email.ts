import axios from 'axios'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TOKEN = process.env.JWT || ''
const EMAIL = process.env.TEST_EMAIL || 'admin@example.com'
const TENANT_NAME = process.env.TEST_TENANT || 'Sekolah A'
const DAYS_LEFT = parseInt(process.env.TEST_DAYS || '7', 10)

const variants = (p: string) => [
  `${BASE_URL}/api${p}`,
  `${BASE_URL}${p}`,
  `${BASE_URL}/api/v1${p}`
]

async function call(method: 'get' | 'post' | 'put', path: string, data?: any) {
  const urls = variants(path)
  let lastErr: any
  for (const url of urls) {
    try {
      const res = await axios.request({
        method,
        url,
        data,
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
          'X-Skip-Tenant': 'true'
        },
        validateStatus: () => true
      })
      return { url, status: res.status, data: res.data }
    } catch (e: any) {
      lastErr = e
    }
  }
  throw lastErr
}

async function main() {
  console.log('Testing trial email endpoints...')
  const welcome = await call('post', '/notifications/trial-email/welcome', { email: EMAIL, tenantName: TENANT_NAME, setupLink: 'https://app.example.com/setup' })
  console.log('WELCOME:', welcome)
  const feature = await call('post', '/notifications/trial-email/feature', { email: EMAIL, tenantName: TENANT_NAME, ctaUrl: 'https://app.example.com/features' })
  console.log('FEATURE:', feature)
  const caseStudy = await call('post', '/notifications/trial-email/case-study', { email: EMAIL, tenantName: TENANT_NAME, ctaUrl: 'https://app.example.com/case' })
  console.log('CASE-STUDY:', caseStudy)
  const upgrade = await call('post', '/notifications/trial-email/upgrade-reminder', { email: EMAIL, tenantName: TENANT_NAME, daysLeft: DAYS_LEFT, ctaUrl: 'https://app.example.com/upgrade' })
  console.log('UPGRADE-REMINDER:', upgrade)
  const logs = await call('get', '/notifications/logs?page=1&limit=5&type=EMAIL')
  console.log('LOGS:', logs)
  const stats = await call('get', '/notifications/stats')
  console.log('STATS:', stats)
}

main().catch((e) => { console.error('Test failed:', e.message) })

