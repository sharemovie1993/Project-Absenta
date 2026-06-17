import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { chromium } from '@playwright/test'

function env(name, fallback = '') {
  const v = process.env[name]
  return typeof v === 'string' && v.length ? v : fallback
}

function boolEnv(name, fallback) {
  const v = env(name, '')
  if (!v) return fallback
  return ['1', 'true', 'yes', 'y', 'on'].includes(v.trim().toLowerCase())
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

async function main() {
  const baseUrl = env('DOCS_E2E_BASE_URL', 'http://localhost:5173').replace(/\/+$/, '')
  const email = env('DOCS_E2E_EMAIL', '')
  const password = env('DOCS_E2E_PASSWORD', '')
  const outDir = env('DOCS_E2E_OUTDIR', path.resolve(process.cwd(), '.e2e-artifacts'))
  const headless = boolEnv('DOCS_E2E_HEADLESS', true)

  const doLogin = boolEnv('DOCS_E2E_LOGIN', true) && !!email && !!password

  ensureDir(outDir)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const shotLogin = doLogin ? path.join(outDir, `docs-login-${stamp}.png`) : null
  const shotDocs = path.join(outDir, `docs-documents-${stamp}.png`)

  const browser = await chromium.launch({ headless })
  const context = await browser.newContext()
  const page = await context.newPage()

  const consoleLines = []
  const pageErrors = []
  const docResponses = []

  page.on('console', (msg) => {
    try {
      const text = msg.text()
      consoleLines.push(`[${msg.type()}] ${text}`)
    } catch {}
  })
  page.on('pageerror', (err) => {
    try {
      pageErrors.push(String(err && err.message ? err.message : err))
    } catch {}
  })
  page.on('response', async (res) => {
    try {
      const url = res.url()
      if (!/\/documents(\b|\/|\?)/i.test(url)) return
      const status = res.status()
      const entry = { url, status }
      docResponses.push(entry)
    } catch {}
  })

  try {
    if (doLogin) {
      await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await page.locator('#email').fill(email)
      await page.locator('#password').fill(password)
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60_000 }).catch(() => null),
        page.getByRole('button', { name: /^masuk$/i }).click(),
      ])
      await page.waitForTimeout(500)
      await page.screenshot({ path: shotLogin, fullPage: true })
    }

    await page.goto(`${baseUrl}/documents`, { waitUntil: 'networkidle', timeout: 60_000 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: shotDocs, fullPage: true })

    const current = await page.evaluate(() => ({ href: location.href, title: document.title }))
    const visibleText = await page.evaluate(() => (document.body ? document.body.innerText : '')).catch(() => '')

    const summary = {
      baseUrl,
      doLogin,
      current,
      screenshots: shotLogin ? { login: shotLogin, documents: shotDocs } : { documents: shotDocs },
      documentsResponses: docResponses.slice(-25),
      pageErrors: pageErrors.slice(-25),
      console: consoleLines.slice(-60),
      visibleTextSnippet: String(visibleText || '').trim().slice(0, 800),
    }

    const outJson = path.join(outDir, `docs-check-${stamp}.json`)
    fs.writeFileSync(outJson, JSON.stringify(summary, null, 2), 'utf8')
    console.log(JSON.stringify({ ok: true, outJson, ...summary }, null, 2))
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

main().catch((e) => {
  console.error('Script failed:', e && e.message ? e.message : String(e))
  process.exit(1)
})
