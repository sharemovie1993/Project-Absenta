const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 9999;

// Pemetaan kunci modul ke lokasi berkas fisik riil untuk dibaca secara langsung
const registryPaths = {
  academic_siswa: 'src/pages/academic/SiswaPage.tsx',
  academic_guru: 'src/pages/academic/GuruPage.tsx',
  academic_kelas: 'src/pages/academic/KelasPage.tsx',
  kesiswaan_monitoring: 'src/pages/kesiswaan/MonitoringKesiswaanPage.tsx',
  kesiswaan_jenis_pelanggaran: 'src/pages/kesiswaan/JenisPelanggaranPage.tsx',
  kesiswaan_piket: 'src/pages/kesiswaan/PiketPage.tsx',
  settingspage: 'src/pages/settings/SettingsPage.tsx',
  whatsappsettings: 'src/pages/settings/WhatsappSettingsPage.tsx',
  supportpage: 'src/pages/support/SupportTicketPage.tsx',
  attendanceopspage: 'src/pages/attendance/ops/AttendanceOpsPage.tsx',
  myattendancepage: 'src/pages/attendance/MyAttendancePage.tsx',
  rekaphariansiswapage: 'src/pages/attendance/rekap/RekapHarianSiswaPage.tsx',
  rekapbulanansiswapage: 'src/pages/attendance/rekap/RekapBulananSiswaPage.tsx'
};

// Fungsi pencarian dinamis cerdas untuk mendeteksi lokasi file secara otomatis
function findFileDynamically(baseDir, searchKey) {
  const parts = searchKey.toLowerCase().split(/_|-/);
  let foundPath = null;

  function walk(dir) {
    if (foundPath) return;
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const lowerFile = file.toLowerCase();
        const normalizedFullPath = fullPath.replace(/\\/g, '/').toLowerCase();
        const nameWithoutExt = file.substring(0, file.lastIndexOf('.')).toLowerCase();

        // Kriteria kecocokan cerdas:
        // 1. Nama file persis sama dengan key
        // 2. Nama file adalah key + "page"
        // 3. Semua bagian kata kunci (parts) ditemukan di path lengkapnya
        if (nameWithoutExt === searchKey.toLowerCase() || 
            nameWithoutExt === (searchKey.toLowerCase() + 'page') ||
            parts.every(part => normalizedFullPath.includes(part))) {
          foundPath = fullPath;
          return;
        }
      }
    }
  }

  walk(baseDir);
  return foundPath;
}

const server = http.createServer((req, res) => {
  // Izinkan request lintas asal (CORS) dari server dev lokal yang valid
  const origin = req.headers.origin;
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    } catch (e) {}
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname === '/api/lighthouse') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Parameter url tidak ditemukan' }));
      return;
    }

    // Hardening: SSRF Protection. Hanya izinkan localhost port 5173 atau 9999
    try {
      const parsedTarget = new URL(targetUrl);
      const isAllowedHost = parsedTarget.hostname === 'localhost' || parsedTarget.hostname === '127.0.0.1';
      const isAllowedPort = parsedTarget.port === '5173' || parsedTarget.port === '9999';
      
      if (!isAllowedHost || !isAllowedPort) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Akses ditolak: Target URL harus menunjuk ke localhost:5173 atau localhost:9999 (SSRF Protection)' }));
        return;
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'URL target tidak valid' }));
      return;
    }

    // Hardening: Validasi karakter ketat untuk mencegah Command Injection
    if (/[^a-zA-Z0-9\.\:\/\?\&\=\-\_\~\%\#]/.test(targetUrl)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Akses ditolak: Target URL mengandung karakter berbahaya!' }));
      return;
    }

    console.log(`🧭 Memulai audit Lighthouse untuk target: ${targetUrl}`);

    // Set custom TEMP & TMP directories inside workspace to avoid EPERM restrictions in default Windows Temp
    const projectRootDir = path.resolve(__dirname, '..');
    const customTempDir = path.join(projectRootDir, 'scratch', 'lh_temp');
    if (!fs.existsSync(customTempDir)) {
      try {
        fs.mkdirSync(customTempDir, { recursive: true });
      } catch (err) {
        console.warn('Gagal membuat folder temp kustom:', err);
      }
    }
    
    const execEnv = { ...process.env, TEMP: customTempDir, TMP: customTempDir };
    
    // Eksekusi npx lighthouse secara aman menggunakan spawn (parameter array)
    const { spawn } = require('child_process');
    const child = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      [
        'lighthouse',
        targetUrl,
        '--output=json',
        '--chrome-flags=--headless --no-sandbox --ignore-certificate-errors',
        '--only-categories=performance,accessibility,best-practices,seo'
      ],
      { env: execEnv, shell: true }
    );

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('close', (code) => {
      let report = null;
      let parseError = null;
      
      try {
        if (stdoutData) {
          report = JSON.parse(stdoutData);
        }
      } catch (err) {
        parseError = err;
      }

      if (!report && code !== 0) {
        console.error('Lighthouse execution error with code:', code, stderrData);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Gagal menjalankan Lighthouse: ${stderrData || 'Unknown execution error'}` }));
        return;
      }

      if (!report) {
        console.error('Lighthouse JSON parsing error:', parseError);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gagal mengurai output laporan Lighthouse' }));
        return;
      }

      try {
        const categories = report.categories || {};
        
        const performance = Math.round((categories.performance?.score || 0) * 100);
        const accessibility = Math.round((categories.accessibility?.score || 0) * 100);
        const bestPractices = Math.round((categories['best-practices']?.score || 0) * 100);
        const seo = Math.round((categories.seo?.score || 0) * 100);

        // Ekstrak audit metrik utama
        const audits = report.audits || {};
        const lcp = audits['largest-contentful-paint']?.displayValue || '-';
        const cls = audits['cumulative-layout-shift']?.displayValue || '-';
        const tbt = audits['total-blocking-time']?.displayValue || '-';
        const speedIndex = audits['speed-index']?.displayValue || '-';

        // Ambil beberapa saran perbaikan teratas (failing audits)
        const suggestions = [];
        Object.keys(categories).forEach(catKey => {
          const auditRefs = categories[catKey].auditRefs || [];
          auditRefs.forEach(ref => {
            const auditObj = audits[ref.id];
            if (auditObj && auditObj.score !== null && auditObj.score < 0.9 && auditObj.title) {
              suggestions.push({
                category: categories[catKey].title,
                title: auditObj.title,
                description: auditObj.description || '',
                displayValue: auditObj.displayValue || ''
              });
            }
          });
        });

        // Batasi saran hingga maksimal 6 saran terpenting
        const filteredSuggestions = suggestions.slice(0, 6);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          performance,
          accessibility,
          bestPractices,
          seo,
          metrics: {
            lcp,
            cls,
            tbt,
            speedIndex
          },
          suggestions: filteredSuggestions
        }));
      } catch (parseErr) {
        console.error('Lighthouse JSON parsing error:', parseErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gagal mengurai output laporan Lighthouse' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/audit') {
    const key = url.searchParams.get('key');
    if (!key) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Parameter key tidak ditemukan' }));
      return;
    }

    // Hardening: Sanitasi input untuk mencegah path traversal via query parameter
    if (/[^a-zA-Z0-9_\-\.]/.test(key)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Parameter key tidak valid (hanya karakter alfanumerik, _, - dan . yang diizinkan)' }));
      return;
    }

    const projectRootDir = path.resolve(__dirname, '..');
    let relativePath = null;

    // 1. Cari lokasi file fisik berdasarkan kunci dengan membaca database audit report secara dinamis
    const auditReportPath = path.join(projectRootDir, 'src/config/hardeningAuditReport.json');
    if (fs.existsSync(auditReportPath)) {
      try {
        const auditReport = JSON.parse(fs.readFileSync(auditReportPath, 'utf8'));
        if (auditReport[key] && auditReport[key].relativePath) {
          relativePath = auditReport[key].relativePath;
        }
      } catch (err) {
        console.warn('Gagal membaca audit report db:', err);
      }
    }
    
    // 2. Fallback ke registry terpetakan
    if (!relativePath) {
      relativePath = registryPaths[key];
    }

    let absolutePath = relativePath ? path.resolve(projectRootDir, relativePath) : '';

    // 3. Pencarian Dinamis Cerdas (Pintar) jika file tidak ditemukan atau belum terdaftar
    if (!absolutePath || !fs.existsSync(absolutePath)) {
      const srcPagesDir = path.join(projectRootDir, 'src/pages');
      const dynamicPath = findFileDynamically(srcPagesDir, key);
      if (dynamicPath) {
        absolutePath = dynamicPath;
        relativePath = path.relative(projectRootDir, dynamicPath);
      } else {
        const srcComponentsDir = path.join(projectRootDir, 'src/components');
        const dynamicCompPath = findFileDynamically(srcComponentsDir, key);
        if (dynamicCompPath) {
          absolutePath = dynamicCompPath;
          relativePath = path.relative(projectRootDir, dynamicCompPath);
        }
      }
    }

    // Fallback terakhir ke tebakan standar
    if (!absolutePath || !fs.existsSync(absolutePath)) {
      const formattedName = key.charAt(0).toUpperCase() + key.slice(1);
      relativePath = `src/pages/academic/${formattedName}.tsx`;
      absolutePath = path.resolve(projectRootDir, relativePath);
    }

    // Hardening: Proteksi path traversal ketat - pastikan file berada di dalam root project
    const resolvedPath = path.resolve(absolutePath);
    const normalizedResolved = resolvedPath.toLowerCase().replace(/\\/g, '/');
    const normalizedRootDir = projectRootDir.toLowerCase().replace(/\\/g, '/');
    const relative = path.relative(projectRootDir, resolvedPath);
    const isInside = resolvedPath === projectRootDir || (relative && !relative.startsWith('..') && !path.isAbsolute(relative));

    if (!normalizedResolved.startsWith(normalizedRootDir) && !isInside) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Akses ditolak: Percobaan path traversal terdeteksi!' }));
      return;
    }

    if (!fs.existsSync(resolvedPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Berkas tidak ditemukan di lokasi: ${relativePath || key}` }));
      return;
    }
    // Baca berkas fisik dari harddisk secara langsung saat di-request oleh browser!
    const rawContent = fs.readFileSync(resolvedPath, 'utf8');
    // Strip JS/TS/TSX comments untuk mencegah developer mem-bypass audit dengan menyisipkan keyword via komentar
    let content = rawContent.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
    const isComponentFile = relativePath.replace(/\\/g, '/').includes('/components/') || relativePath.replace(/\\/g, '/').includes('/shared/');

    // Trace children components recursively (AST Parser equivalent)
    const visitedFiles = new Set([resolvedPath]);
    let totalLineCount = rawContent.split('\n').length;
    const fileLineBreakdown = [{ path: resolvedPath, lines: totalLineCount }];
    
    function traceChildren(currentFilepath) {
      let currentRawContent;
      try {
        currentRawContent = fs.readFileSync(currentFilepath, 'utf8');
      } catch (e) {
        return;
      }
      const currentDir = path.dirname(currentFilepath);
      const relativeImportRegex = /import\s+.*?from\s+['"](\.\.?\/[^'"]+)['"]/g;
      let match;
      while ((match = relativeImportRegex.exec(currentRawContent)) !== null) {
        const relativeImport = match[1];
        const absoluteImport = path.resolve(currentDir, relativeImport);
        const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];
        let resolvedImportPath = null;
        for (const ext of extensions) {
          const p = absoluteImport + ext;
          if (fs.existsSync(p)) {
            resolvedImportPath = p;
            break;
          }
        }
        
        const normalizedResolved = resolvedImportPath ? resolvedImportPath.replace(/\\/g, '/') : '';
        if (resolvedImportPath && normalizedResolved.includes('/src/pages/') && !visitedFiles.has(resolvedImportPath)) {
          visitedFiles.add(resolvedImportPath);
          let childRawContent = fs.readFileSync(resolvedImportPath, 'utf8');
          let childContent = childRawContent.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
          content += '\n' + childContent;
          const childLines = childRawContent.split('\n').length;
          totalLineCount += childLines;
          fileLineBreakdown.push({ path: resolvedImportPath, lines: childLines });
          traceChildren(resolvedImportPath);
        }
      }
    }

    // Only trace children for Page entry files
    if (!isComponentFile) {
      traceChildren(resolvedPath);
    }

    // ─── Analisis Kode Secara Real-time (Aligned with audit-pages.cjs) ───
    const usesLayout = isComponentFile || rawContent.includes('AcademicPageLayout') || rawContent.includes('PageLayout') || rawContent.includes('InfraErrorBoundary');

    // ─── Pilar 2: Keamanan Data & Defensive Programming ───
    const contentForMapCheck = content
      .replace(/\((?:[^)(]|\([^)]*\))*\|\|\s*\[\]\s*\)\.map\s*\(/g, '?.map(')
      .replace(/\((?:[^)(]|\([^)]*\))*\?\?\s*\[\]\s*\)\.map\s*\(/g, '?.map(')
      .replace(/\[[^\]]*\]\.map\s*\(/g, '?.map(');
    const hasUnsafeMap = /(?<!\?)\.map\(/g.test(contentForMapCheck);

    // ─── Pilar 3: Optimasi DOM Churn (Memoization) ───
    const hasLists = /List[\s/>]/.test(content) || /<Table[\s/>]/.test(content) || /\bget[A-Z]\w*\b|\.get\(/g.test(content);
    const hasMemo = content.includes('useMemo') && content.includes('useCallback');
    const missingMemoization = hasLists && !hasMemo;

    // ─── Pilar 4: Keamanan Tipe TypeScript (No Any Type) ───
    const hasAnyType = /:\s*any\b/g.test(content) || /\bas\s+any\b/g.test(content) || /<\s*any\s*>/g.test(content);

    // ─── Pilar 5: Pencegahan Kebocoran Memori (Cleanup Listener) ───
    const hasListenersInEffect = /useEffect\s*\(.*?(\baddEventListener\b|\bsocket\.on\b|\bsetInterval\b|\bsetTimeout\b)/s.test(content);
    const hasCleanup = content.includes('return () =>');
    const missingCleanup = hasListenersInEffect && !hasCleanup;

    // ─── Pilar 6: Konsistensi Pewarnaan Ketat (Strict Color Guard) ───
    const hasInlineStyleColor = /style\s*=\s*\{\{\s*[^}]*(color|background|bg|border|fill|stroke)\s*:\s*['"`](?:#|rgb|rgba|hsl|hsla)/i.test(content);
    const hasArbitraryColor = /\[#([0-9a-fA-F]{3,8})\]/g.test(content);
    
    const validWeights = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
    const tailwindColorRegex = /(?:bg|text|border|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d+)\b/g;
    let hasInvalidTailwindColors = false;
    let colorMatch;
    while ((colorMatch = tailwindColorRegex.exec(content)) !== null) {
      const weight = colorMatch[1];
      if (!validWeights.includes(weight)) {
        hasInvalidTailwindColors = true;
        break;
      }
    }

    const hasHardcodedColors = hasInlineStyleColor || hasArbitraryColor || hasInvalidTailwindColors;

    // Pillar 7: Kepatuhan Sorting Tabel
    const hasTableComponent = /<Table[\s/>]/.test(content);
    const hasListComponent = /List[\s/>]/.test(content);
    const hasSortingImpl = /sortable|onSort|sortKey|sortBy|handleSort|sortDirection|sortConfig|orderBy/.test(content) || hasListComponent;
    const missingTableSorting = hasTableComponent && !hasSortingImpl;

    // Pillar 8: Penanganan State Kosong
    const hasFetchData = content.includes('useQuery') || content.includes('useFetch') || content.includes('useGet') || content.includes('axios.get') || content.includes('fetch(');
    const hasEmptyState = /\.length\s*(===|==|!==|!=|>|>=|<|<=)\s*\d+|isEmpty|emptyState|EmptyState|NoData|!\w*(?:\?\.)?length|if\s*\(!\s*\w/.test(content) || hasListComponent;
    const missingEmptyState = hasFetchData && !hasEmptyState;

    // Pillar 9: Indikator Loading / Skeleton Guard
    const hasLoadingGuard = /\b(isLoading|isFetching|loading|spinner|Spinner)\b|Skeleton/i.test(content) || hasListComponent;
    const missingLoadingGuard = hasFetchData && !hasLoadingGuard;

    // Pillar 10: Aksesibilitas Form
    const hasFormElements = /<(input|select|textarea|Input|Select|Textarea|SearchableSelect)\b/.test(content);
    const hasA11yAttr = /aria-label|htmlFor|aria-describedby|aria-required/.test(content);
    const missingA11y = hasFormElements && !hasA11yAttr;

    // Pillar 11: Optimasi Pemuatan (Lazy Loading & Suspense)
    const hasLazy = content.includes('lazy(') && content.includes('Suspense');
    const hasHeavyComponents = /<(Modal|Form|Excel|Loader)\b/.test(content) || /import\s+.*?\b(Modal|Form|Excel|Loader)\b/.test(content);
    const missingLazyLoading = !isComponentFile && hasHeavyComponents && !hasLazy;

    // ─── Pilar 12: Sistem Panduan Pengguna (Responsive Guide) ───
    const hasInstruction = /instruction\s*=\s*\{/.test(content) && content.includes('items:');
    const missingInstruction = !isComponentFile && usesLayout && !hasInstruction;

    // ─── Pilar 13: Standarisasi Pagination Tabel ───
    const hasPaginationProp = /pagination\s*=\s*\{/.test(content) || (content.includes('currentPage=') && content.includes('onPageChange='));
    const hasPaginationComponent = /<Pagination/.test(content);
    const hasNavigation = content.includes('onPageChange');
    const hasLimitChange = content.includes('onLimitChange');
    const missingPagination = !isComponentFile && hasTableComponent && (!hasPaginationProp || !hasNavigation || !hasLimitChange) && !hasPaginationComponent;

    // ─── Pilar 14: Standarisasi Toolbar Aksi Halaman ───
    const hasTableToolbar = content.includes('toolbarLeft={') || content.includes('toolbarRight={') || content.includes('actions={') || (content.includes('onAdd={') && content.includes('onImport={')) || hasListComponent;
    const hasLayoutToolbar = content.includes('toolbar={') || content.includes('toolbar:');
    const hasPrimaryActions = /onAdd|onImport|onExport|handleCreate|handleImport|onUpload|handleUpload|setIsUploadModalOpen|setIsUploadOpen|setIsCreateOpen|Upload\b/.test(content);
    const missingToolbar = !isComponentFile && hasPrimaryActions && !hasTableToolbar && !(!hasTableComponent && hasLayoutToolbar);
    const misplacedToolbar = !isComponentFile && (hasTableComponent || hasListComponent) && hasLayoutToolbar;

    // ─── Pilar 15: Sistem Feedback & Dialog Terstandar (Toast, Confirm, Modal) ───
    const hasToast = content.includes('useToast') || content.includes('showToast') || content.includes('toast.');
    const hasConfirmHook = content.includes('useConfirm') || content.includes('ConfirmDialog');
    const usesBrowserConfirm = /\bconfirm\s*\(/.test(content) && !hasConfirmHook;
    const usesBrowserAlert = /\balert\s*\(/.test(content);
    const missingFeedbackSystem = usesBrowserAlert || usesBrowserConfirm;

    // ─── Pilar 16: Konsistensi Kontainer UI (SectionCard & Card) ───
    const hasSectionCard = content.includes('<SectionCard');
    const hasCard = content.includes('<Card');
    const missingStandardContainer = !isComponentFile && usesLayout && !hasSectionCard && !hasCard;

    // ─── Pilar 17: Komponen Seleksi Canggih (SearchableSelect) ───
    const hasSelectTag = /<(select|Select)\b/.test(content);
    const hasSearchableSelect = content.includes('<SearchableSelect');
    const missingAdvancedSelect = hasSelectTag && !hasSearchableSelect;

    // ─── Pilar 18: Standarisasi Toolbar Kontekstual Tabel ───
    const missingTableToolbar = !isComponentFile && (hasTableComponent || hasListComponent) && !hasTableToolbar;

    // ─── Pilar 19: Standarisasi Navigasi Breadcrumb ───
    const hasBreadcrumbs = content.includes('breadcrumbs={') || content.includes('breadcrumbs:');
    const missingBreadcrumbs = !isComponentFile && usesLayout && !hasBreadcrumbs;

    // ─── Pilar 20: Shared UI Components ───
    const usesUiComponents = content.includes('components/ui') || content.includes('ui/Card') || content.includes('ui/Button');
    const missingSharedUI = !isComponentFile && !usesUiComponents;

    // ─── Pilar 21: Proteksi Fitur Berbayar (PremiumFeatureGate) ───
    const isPaidModulePage = /\/pages\/(cooperative|attendance|hubin|sarpras)\//i.test(relativePath.replace(/\\/g, '/'));
    const isPaidModule = !isComponentFile && isPaidModulePage;
    const hasPremiumGate = content.includes('<PremiumFeatureGate') || content.includes('PremiumFeatureGate');
    const missingPremiumGate = isPaidModule && !hasPremiumGate;

    // ─── Pilar 21 (B): Pencegahan God File (Ukuran File Maksimum) ───
    const lineCount = totalLineCount;
    const isGodFile = isComponentFile ? (lineCount > 500) : (lineCount > 800);

    // ─── Pilar 22: Desentralisasi Konfigurasi (Anti-Hardcoded) ───
    const hasMockData = /\b(const|let|var)\s+\w*(mock|dummy|sample|temp(?!late)|test(?!ing))\w*\s*=/i.test(content);
    const hasStaticApiUrl = /https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|api\b)/i.test(content);
    const hasHardcodedConfigs = hasMockData || hasStaticApiUrl;

    // ─── Pilar 23: Standarisasi Kartu Analitik/Statistik (AnalyticsCard) ───
    const hasCustomStatCardComponent = /\b(const|function|class)\s+(StatCard|StatsCard|MetricCard|AnalyticCard|MiniCard)\b/i.test(content);
    const hasHardcodedStatCards = /className="[^"]*rounded-xl[^"]*".*?(Total|Jumlah|Saldo|Revenue|Growth|Transaksi|Anggota|Pinjaman).*?text-[23]xl/is.test(content);
    const usesAnalyticsCard = content.includes('AnalyticsCard') || content.includes('MemoizedAnalyticsCard');
    const missingAnalyticsCard = (hasCustomStatCardComponent || hasHardcodedStatCards) && !usesAnalyticsCard;

    // ─── Pilar 24: Standarisasi Impor & Ekspor Data (Import/Export Standard) ───
    const hasImportExport = /XLSX|jsPDF|autoTable|importSiswaFromExcel|exportDataToExcel|onImport|onExport/i.test(content);
    const hasImportExportLoading = /isExporting|exportLoading|processing|loading/i.test(content);
    const hasTryCatchForExport = /try\s*\{.*?catch/s.test(content);
    const usesStyledTemplate = content.includes('generateImportTemplate') || !/Template_Impor|Template Impor/i.test(content);
    const missingImportExportGuard = hasImportExport && (!hasImportExportLoading || !hasTryCatchForExport || !usesStyledTemplate);

    // ─── Pilar 25: Standarisasi Sistem Ekspor PDF (Built-in PDF Template Guard) ───
    const hasRawPdfLib = /from\s+['"](jspdf|jspdf-autotable)['"]/.test(content) || content.includes('new jsPDF(');
    const usesStandardPrintUtil = content.includes('utils/print/') || content.includes('@/utils/print') || content.includes('masterStrukturHelper') || content.includes('pdfAcademic') || content.includes('pdfGeneric');
    const missingStandardPdfPrint = hasRawPdfLib && !usesStandardPrintUtil;

    // ─── Pilar 26: Validasi Skema Zod untuk Form (Zod Schema Guard) ───
    const hasForm = content.includes('<form') || /\<(input|select|textarea|Input|Select|Textarea|SearchableSelect)\b/i.test(content);
    const hasZodValidation = /z\.object\s*\(/.test(content) || content.includes('zodResolver') || /\.safeParse\s*\(/.test(content) || /\.parseAsync\s*\(/.test(content) || content.includes('yup.object') || content.includes('joi.object');
    const missingZodValidation = hasForm && !hasZodValidation;
  
    // ─── Pilar 27: Standarisasi Tab Switcher (TabSwitcher Guard) ───
    const hasTabsList = /<TabsList\b/i.test(content) || /onValueChange\s*=\s*\{\s*setActiveTab/i.test(content);
    const hasManualTabButtons = /setActiveSubTab|setActiveTab/i.test(content);
    const usesTabSwitcher = content.includes('TabSwitcher') || content.includes('<TabSwitcher');
    const missingTabSwitcher = (hasTabsList || hasManualTabButtons) && !usesTabSwitcher && !isComponentFile;

    // ─── Pilar 28: Konsistensi Aliran Tata Letak (Layout Flow Consistency Guard) ───
    // Bersihkan konten di dalam modal untuk menghindari alarm palsu dari filter/stat di dalam dialog
    const contentWithoutModals = content.replace(/<(Modal|ExcelImportModal|Dialog|Drawer)[^>]*>[\s\S]*?<\/\1>/g, '');
    const indexOfTable = contentWithoutModals.indexOf('<Table');
    const indexOfList = contentWithoutModals.search(/<(?!TabsList)[A-Za-z]*List\b/);
    const firstTableIndex = indexOfTable !== -1 ? indexOfTable : (indexOfList !== -1 ? indexOfList : Infinity);
    const indexOfFilter = contentWithoutModals.search(/<(select|Select|SearchableSelect)\b/);
    const indexOfStats = contentWithoutModals.search(/<(AnalyticsCard|MemoizedAnalyticsCard)\b/);
    const hasInconsistentFilters = firstTableIndex !== Infinity && indexOfFilter !== -1 && firstTableIndex < indexOfFilter;
    const hasInconsistentStats = firstTableIndex !== Infinity && indexOfStats !== -1 && firstTableIndex < indexOfStats;
    const missingLayoutFlowConsistency = !isComponentFile && (hasInconsistentFilters || hasInconsistentStats);

    const issues = [];
    if (!isComponentFile && !usesLayout) {
      issues.push('❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)');
    } else if (!isComponentFile && !content.includes('hardeningModuleKey')) {
      issues.push("⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.");
    }

    if (hasUnsafeMap) {
      issues.push('❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.');
    }
    if (missingMemoization) {
      issues.push('⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)');
    }
    if (hasAnyType) {
      issues.push('⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)');
    }
    if (missingCleanup) {
      issues.push('❌ Menggunakan listeners/timer (addEventListener, setInterval, setTimeout) di dalam useEffect tetapi lupa menulis fungsi return cleanup (Kebocoran Memori Klien)');
    }
    if (hasHardcodedColors) {
      issues.push('❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual');
    }
    if (missingAnalyticsCard) {
      issues.push("⚠️  Terdeteksi kartu statistik/analitik kustom lokal. Gunakan komponen AnalyticsCard terstandarisasi varian premium. Disarankan Cara 1: Lewatkan data via properti 'stats={[...]}' pada <AcademicPageLayout> (secara default me-render varian premium). Cara 2: Impor langsung <AnalyticsCard variant=\"premium\"> dari '@/components/ui/AnalyticsCard'.");
    }
    if (missingImportExportGuard) {
      issues.push("⚠️  Terdeteksi fitur ekspor/impor data tetapi belum memenuhi standar audit. Petunjuk Perbaikan: 1) Gunakan helper standar ter-style 'generateImportTemplate' dari '@/utils/export.utils' untuk unduhan template Excel. 2) Pastikan proses impor/ekspor dilindungi loading guard (state 'isExporting'/'processing') untuk menghindari double-submit. 3) Bungkus logika dengan try-catch block untuk menangani error secara aman.");
    }
    if (missingStandardPdfPrint) {
      issues.push("⚠️  Mendeteksi ekspor PDF manual/mentah. Gunakan modul cetak PDF terstandar di 'src/utils/print/' untuk menjaga konsistensi template kop surat resmi.");
    }
    if (missingZodValidation) {
      issues.push("⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.");
    }
    if (missingTabSwitcher) {
      issues.push("❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.");
    }
    if (missingLayoutFlowConsistency) {
      issues.push("⚠️  Tata letak tidak konsisten. Terdeteksi komponen filter atau kartu statistik diletakkan di bawah tabel data master.");
    }
    if (missingTableSorting) {
      issues.push("⚠️  Komponen <Table> ditemukan tetapi tidak memiliki implementasi sorting. Hubungkan properti 'sortBy', 'sortOrder', 'onSort', dan tandai kolom dengan 'sortable: true'.");
    }
    if (missingEmptyState) {
      issues.push("⚠️  Halaman melakukan fetch data tetapi tidak memiliki penanganan Empty State. Pastikan terdapat pengecekan kondisi data kosong (seperti 'data.length === 0', 'isEmpty', atau penegasian '!data.length').");
    }
    if (missingLoadingGuard) {
      issues.push("⚠️  Halaman melakukan fetch data tetapi tidak memiliki guard Loading/Skeleton. Sediakan loading state guard (seperti 'isLoading', 'isFetching', 'loading', atau komponen <Skeleton />).");
    }
    if (missingA11y) {
      issues.push('⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)');
    }
    if (missingLazyLoading) {
      issues.push('❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)');
    }
    if (missingInstruction) {
      issues.push('⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)');
    }
    if (missingPagination) {
      issues.push("❌ Komponen <Table> ditemukan tetapi tidak memiliki implementasi Pagination. Wajib menyediakan properti 'pagination' dengan callback 'onPageChange' dan 'onLimitChange'.");
    }
    if (missingToolbar) {
      issues.push("❌ Aksi utama halaman (onAdd, onImport, dll.) terdeteksi tetapi tidak diletakkan pada properti toolbar Table (Wajib: 'toolbarLeft' or 'toolbarRight').");
    }
    if (misplacedToolbar) {
      issues.push('⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)');
    }
    if (missingFeedbackSystem) {
      issues.push('❌ Menggunakan dialog alert() atau confirm() bawaan browser. Gunakan hook useToast() untuk feedback pesan, atau useConfirm() untuk dialog konfirmasi modern.');
    }
    if (missingStandardContainer) {
      issues.push('⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.');
    }
    if (missingAdvancedSelect) {
      issues.push('⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)');
    }
    if (missingTableToolbar) {
      issues.push('❌ Aksi operasional tabel terdeteksi di luar slot resmi (Gunakan toolbarLeft/Right pada komponen Table)');
    }
    if (missingBreadcrumbs) {
      issues.push("⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti 'breadcrumbs' (UX: Pengguna kehilangan konteks lokasi navigasi).");
    }
    if (missingSharedUI) {
      issues.push('❌ Halaman ini menggunakan elemen HTML mentah atau belum mengimpor standard UI (Wajib import dari folder ui)');
    }
    if (missingPremiumGate) {
      issues.push('❌ Belum menggunakan PremiumFeatureGate untuk proteksi modul berbayar');
    }
    if (isGodFile) {
      const breakdownMsg = fileLineBreakdown
        .map(f => {
          const fileLink = `file:///${f.path.replace(/\\/g, '/')}`;
          return `[${path.basename(f.path)}](${fileLink}) (${f.lines} baris)`;
        })
        .join(', ');
      issues.push(`⚠️  Ukuran berkas terlalu besar (total terdeteksi ${lineCount} baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: ${breakdownMsg}. Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.`);
    }
    if (hasHardcodedConfigs) {
      issues.push('❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.');
    }

    // Buat laporan perintah refaktor instan (Copy-Pasteable Prompt)
    let prompt = `Tolong lakukan refaktor hardening penuh pada halaman ${relativePath} berdasarkan temuan audit arsitektur terbaru:\n\n`;
    if (issues.length > 0) {
      issues.forEach((issue, idx) => {
        prompt += `${idx + 1}. ${issue}\n`;
      });
      prompt += `\nLakukan refaktor struktural ini agar halaman lulus sertifikasi kelayakan hardening 100%!`;
    } else {
      prompt = `Halaman ${relativePath} sudah tervalidasi 100% lolos standar arsitektur hardening! Tidak diperlukan refaktor tambahan.`;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      usesLayout,
      safeMapping: !hasUnsafeMap,
      usesMemo: !missingMemoization,
      noAnyType: !hasAnyType,
      safeEffect: !missingCleanup,
      strictColors: !hasHardcodedColors,
      tableSorting: !missingTableSorting,
      emptyState: !missingEmptyState,
      loadingGuard: !missingLoadingGuard,
      formA11y: !missingA11y,
      performanceOptimization: isComponentFile ? true : !missingLazyLoading,
      userGuidance: isComponentFile ? true : !missingInstruction,
      tablePagination: isComponentFile ? true : !missingPagination,
      standardToolbar: isComponentFile ? true : (!missingToolbar && !misplacedToolbar),
      standardFeedback: !missingFeedbackSystem,
      standardContainer: isComponentFile ? true : !missingStandardContainer,
      advancedSelect: !missingAdvancedSelect,
      tableToolbar: isComponentFile ? true : !missingTableToolbar,
      breadcrumbNavigation: isComponentFile ? true : !missingBreadcrumbs,
      premiumFeatureGate: isPaidModule ? hasPremiumGate : null,
      godFileGuard: !isGodFile,
      hardcodedConfig: !hasHardcodedConfigs,
      analyticsCardGuard: !missingAnalyticsCard,
      importExportGuard: !missingImportExportGuard,
      standardPdfPrint: !missingStandardPdfPrint,
      zodValidationGuard: !missingZodValidation,
      standardTabSwitcher: !missingTabSwitcher,
      layoutFlowConsistency: !missingLayoutFlowConsistency,
      usesUiComponents,
      issues,
      refactorPrompt: prompt,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`🚀 Dev Audit Server running on http://localhost:${PORT}`);
});
