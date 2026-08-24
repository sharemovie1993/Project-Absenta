const fs = require('fs');
const path = require('path');

// Target pemindaian rekursif: Seluruh folder src/pages (mencakup semua 24 sub-modul)
const targetDir = path.join(__dirname, '../src/pages');
const outputJsonPath = path.join(__dirname, '../src/config/hardeningAuditReport.json');
const outputMdPath = path.join(__dirname, '../../hardening_audit_report.md');

console.log('\x1b[36m%s\x1b[0m', '🛡️  MEMULAI ABSENTA.ID SUPER SMART STATIC AUDIT ENGINE 🛡️');
console.log('\x1b[90m%s\x1b[0m', `Memindai direktori: ${targetDir} secara rekursif...\n`);

let totalFiles = 0;
let fullyCompliant = 0;
let partialCompliant = 0;
let nonCompliant = 0;

const reports = [];
const jsonResults = {};

// Fungsi rekursif memindai direktori mencari file .tsx secara mendalam
function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      // Abaikan folder pengujian atau folder komponen internal jika diperlukan
      if (file !== 'components' && file !== 'shared' && file !== 'mutation' && file !== 'transition' && file !== 'student-card' && file !== 'struktur-organisasi') {
        walkDir(filepath, callback);
      } else {
        // Tetap pindai sub-komponen tapi tandai
        walkDir(filepath, callback);
      }
    } else if (file.endsWith('.tsx')) {
      callback(filepath);
    }
  });
}

// Fungsi memetakan file fisik ke kunci registry hardening
function getRegistryKey(filepath, content) {
  const keyMatch = content.match(/hardeningModuleKey\s*=\s*["']([^"']+)["']/);
  if (keyMatch) return keyMatch[1];

  const filename = path.basename(filepath, '.tsx');
  const normalizedPath = filepath.replace(/\\/g, '/');
  
  if (normalizedPath.includes('/pages/cooperative/')) {
    return 'coop_' + filename.toLowerCase();
  }

  if (filename === 'JenisPelanggaranPage') return 'kesiswaan_jenis_pelanggaran';
  if (filename === 'MonitoringKesiswaanPage') return 'kesiswaan_monitoring';
  if (filename === 'PiketPage') return 'kesiswaan_piket';
  if (filename === 'GuruPage') return 'academic_guru';
  if (filename === 'KelasPage') return 'academic_kelas';
  if (filename === 'SiswaPage') return 'academic_siswa';
  
  return filename.toLowerCase();
}

walkDir(targetDir, (filepath) => {
  const relativePath = path.relative(path.join(__dirname, '..'), filepath);
  const filename = path.basename(filepath);
  
  // Abaikan sub-komponen pendukung yang bukan merupakan Halaman Utama (Page Router Entry)
  // Page Router Entry biasanya memiliki kata 'Page' di nama filenya atau langsung di bawah sub-folder pages utama
  // Hardening: untuk cooperative, scan detail dan sub-modul lain agar terdaftar.
  const isPaidModulePage = /\/pages\/(cooperative|attendance|hubin|sarpras)\//i.test(filepath.replace(/\\/g, '/'));
  const isPageRouterEntry = filename.endsWith('Page.tsx') || filename === 'Login.tsx' || filename === 'TestLogin.tsx' || isPaidModulePage || (filename === 'Dashboard.tsx' && filepath.replace(/\\/g, '/').includes('/pages/kurikulum/'));
  if (!isPageRouterEntry) return;

  const rawContent = fs.readFileSync(filepath, 'utf8');
  // Strip JS/TS/TSX comments to prevent developers from bypassing audits using comments (cheat prevention)
  let content = rawContent.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');

  // Deteksi apakah file ini merupakan komponen (di dalam subfolder components atau shared)
  const isComponentFile = filepath.replace(/\\/g, '/').includes('/components/') || filepath.replace(/\\/g, '/').includes('/shared/');

  // Trace children components recursively (AST Parser equivalent)
  const visitedFiles = new Set([filepath]);
  let totalLineCount = rawContent.split('\n').length;
  const fileLineBreakdown = [{ path: filepath, lines: totalLineCount }];
  
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
      const absolutePath = path.resolve(currentDir, relativeImport);
      const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];
      let resolvedPath = null;
      for (const ext of extensions) {
        const p = absolutePath + ext;
        if (fs.existsSync(p)) {
          resolvedPath = p;
          break;
        }
      }
      
      const normalizedResolved = resolvedPath ? resolvedPath.replace(/\\/g, '/') : '';
      if (resolvedPath && normalizedResolved.includes('/src/pages/') && !visitedFiles.has(resolvedPath)) {
        visitedFiles.add(resolvedPath);
        let childRawContent = fs.readFileSync(resolvedPath, 'utf8');
        let childContent = childRawContent.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
        content += '\n' + childContent;
        const childLines = childRawContent.split('\n').length;
        totalLineCount += childLines;
        fileLineBreakdown.push({ path: resolvedPath, lines: childLines });
        traceChildren(resolvedPath);
      }
    }
  }

  // Only trace children for Page entry files, since components are traced under their pages anyway
  if (!isComponentFile) {
    traceChildren(filepath);
  }

  // ─── Pilar 1: Standardisasi Layout Utama ───
  // Komponen tidak membutuhkan Layout utama secara mandiri
  const usesAcademicLayout = /<AcademicPageLayout\b/.test(rawContent);
  const usesPageLayout = /<PageLayout\b/.test(rawContent);
  const usesLayout = isComponentFile || usesAcademicLayout || usesPageLayout || rawContent.includes('InfraErrorBoundary');

  // ─── Pilar 2: Keamanan Data & Defensive Programming (Optional Chaining pada Map) ───
  // HARDENED: Mengenali semua pola aman yang setara:
  //   (a) Optional chaining:         array?.map(...)
  //   (b) Fallback guard:            (array || []).map(...) atau (array ?? []).map(...)
  //   (c) Type cast + fallback:      (expr as Type[] || []).map(...)
  //   (d) Literal array langsung:    ['a','b'].map(...) — literal tidak pernah null
  const contentForMapCheck = content
    .replace(/\((?:[^)(]|\([^)]*\))*\|\|\s*\[\]\s*\)\.map\s*\(/g, '?.map(')
    .replace(/\((?:[^)(]|\([^)]*\))*\?\?\s*\[\]\s*\)\.map\s*\(/g, '?.map(')
    .replace(/\[[^\]]*\]\.map\s*\(/g, '?.map(');
  const hasUnsafeMap = /(?<!\?)\.map\(/g.test(contentForMapCheck);

  // ─── Pilar 3: Optimasi DOM Churn (Memoization) ───
  // Jika halaman memuat list data atau render komponen berat, tapi tidak mengimpor useMemo/useCallback
  // Hardened: membatasi hasLists agar tidak false-positive pada kata 'target', 'budget', 'widget', dll.
  const hasLists = /List[\s/>]/.test(content) || /<Table[\s/>]/.test(content) || /\bget[A-Z]\w*\b|\.get\(/g.test(content);
  const hasMemo = content.includes('useMemo') && content.includes('useCallback');
  const missingMemoization = hasLists && !hasMemo;

  // ─── Pilar 4: Keamanan Tipe TypeScript (No Any Type) ───
  // Mencari deklarasi tipe longgar ': any' atau casting 'as any' yang dilarang keras oleh standar audit
  const hasAnyType = /:\s*any\b/g.test(content) || /\bas\s+any\b/g.test(content) || /<\s*any\s*>/g.test(content);

  // ─── Pilar 5: Pencegahan Kebocoran Memori (Cleanup Listener) ───
  // Jika memakai useEffect dan melakukan event binding, pastikan memiliki return cleanup
  // Hardened: hanya mendeteksi listeners yang dideklarasikan di dalam useEffect
  const hasListenersInEffect = /useEffect\s*\(.*?(\baddEventListener\b|\bsocket\.on\b|\bsetInterval\b|\bsetTimeout\b)/s.test(content);
  const hasCleanup = content.includes('return () =>');
  const missingCleanup = hasListenersInEffect && !hasCleanup;

  // ─── Pilar 6: Konsistensi Pewarnaan Ketat (Strict Color Guard) ───
  // Mendeteksi warna heksadesimal keras atau arbitrary Tailwind bracket color [#[...]]
  // Hardened: Mendeteksi juga format rgb, rgba, hsl, dan hsla pada inline styles
  const hasInlineStyleColor = /style\s*=\s*\{\{\s*[^}]*(color|background|bg|border|fill|stroke)\s*:\s*['"`](?:#|rgb|rgba|hsl|hsla)/i.test(content);
  const hasArbitraryColor = /\[#([0-9a-fA-F]{3,8})\]/g.test(content);
  
  // Deteksi kelas warna Tailwind tidak valid (typo berat yang membuat warna menjadi transparan)
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
  // HARDENED: Mendeteksi SEMUA pola penanganan state kosong yang valid:
  //   (a) Perbandingan eksplisit: .length === 0, .length == 0, .length !== 0
  //   (b) Perbandingan positif:   .length > 0 (ternary implisit — jika true tampil, jika false tampil empty)
  //   (c) Guard awal:             if (!data) return — early return sebelum render
  //   (d) Helper/komponen:        isEmpty, EmptyState, NoData
  //   (e) Negasi panjang:         !data.length, !data?.length
  const hasFetchData = content.includes('useQuery') || content.includes('useFetch') || content.includes('useGet') || content.includes('axios.get') || content.includes('fetch(');
  const hasEmptyState = /\.length\s*(===|==|!==|!=|>|>=|<|<=)\s*\d+|isEmpty|emptyState|EmptyState|NoData|!\w*(?:\?\.)?length|if\s*\(!\s*\w/.test(content) || hasListComponent;
  const missingEmptyState = hasFetchData && !hasEmptyState;

  // Pillar 9: Indikator Loading / Skeleton Guard
  // Hardened: Menggunakan word boundary agar mendukung conditional block biasa 'if (loading)'
  const hasLoadingGuard = /\b(isLoading|isFetching|loading|spinner|Spinner)\b|Skeleton/i.test(content) || hasListComponent;
  const missingLoadingGuard = hasFetchData && !hasLoadingGuard;

  // Pillar 10: Aksesibilitas Form
  // Hardened: Mendeteksi juga komponen form terstandar Absenta (kapital)
  const hasFormElements = /<(input|select|textarea|Input|Select|Textarea|SearchableSelect)\b/.test(content);
  const hasA11yAttr = /aria-label|htmlFor|aria-describedby|aria-required/.test(content);
  const missingA11y = hasFormElements && !hasA11yAttr;

  // Pillar 11: Optimasi Pemuatan (Lazy Loading & Suspense)
  const hasLazy = content.includes('lazy(') && content.includes('Suspense');
  // Hardened: Mendeteksi import riil atau pemakaian komponen berat (bukan variabel camelCase/setModalOpen)
  const hasHeavyComponents = /<(Modal|Form|Excel|Loader)\b/.test(content) || /import\s+.*?\b(Modal|Form|Excel|Loader)\b/.test(content);
  const missingLazyLoading = !isComponentFile && hasHeavyComponents && !hasLazy;

  // ─── Pilar 12: Sistem Panduan Pengguna (Responsive Guide) ───
  const hasInstruction = /instruction\s*=\s*\{/.test(content) && content.includes('items:');
  const missingInstruction = !isComponentFile && usesAcademicLayout && !hasInstruction;

  // ─── Pilar 13: Standarisasi Pagination Tabel ───
  const hasPaginationProp = /pagination\s*=\s*\{/.test(content) || (content.includes('currentPage=') && content.includes('onPageChange='));
  const hasPaginationComponent = /<Pagination/.test(content);
  const hasNavigation = content.includes('onPageChange');
  const hasLimitChange = content.includes('onLimitChange');
  const missingPagination = !isComponentFile && hasTableComponent && (!hasPaginationProp || !hasNavigation || !hasLimitChange) && !hasPaginationComponent;

  // ─── Pillar 14: Standarisasi Toolbar Aksi Halaman ───
  const hasTableToolbar = content.includes('toolbarLeft={') || content.includes('toolbarRight={') || content.includes('actions={') || (content.includes('onAdd={') && content.includes('onImport={')) || hasListComponent;
  const hasLayoutToolbar = content.includes('toolbar={') || content.includes('toolbar:');
  const hasPrimaryActions = /onAdd|onImport|onExport|handleCreate|handleImport|onUpload|handleUpload|setIsUploadModalOpen|setIsUploadOpen|setIsCreateOpen|Upload\b/.test(content);
  const missingToolbar = !isComponentFile && hasPrimaryActions && !hasTableToolbar && !(!hasTableComponent && hasLayoutToolbar);
  const misplacedToolbar = !isComponentFile && (hasTableComponent || hasListComponent) && hasLayoutToolbar;

  // ─── Pillar 15: Sistem Feedback & Dialog Terstandar (Toast, Confirm, Modal) ───
  const hasToast = content.includes('useToast') || content.includes('showToast') || content.includes('toast.');
  const hasConfirmHook = content.includes('useConfirm') || content.includes('ConfirmDialog');
  
  // Deteksi cerdas: Jika ada confirm() tapi tidak ada hook confirm, maka dianggap pakai browser confirm
  // Hardened: Mendeteksi variasi spasi pada penulisan pemanggilan fungsi browser
  const usesBrowserConfirm = /\bconfirm\s*\(/.test(content) && !hasConfirmHook;
  const usesBrowserAlert = /\balert\s*\(/.test(content);
  
  const missingFeedbackSystem = usesBrowserAlert || usesBrowserConfirm;

  // ─── Pillar 16: Konsistensi Kontainer UI (SectionCard & Card) ───
  const hasSectionCard = content.includes('<SectionCard');
  const hasCard = content.includes('<Card');
  const missingStandardContainer = !isComponentFile && usesLayout && !hasSectionCard && !hasCard;

  // ─── Pillar 17: Komponen Seleksi Canggih (SearchableSelect) ───
  // Hardened: Hanya mendeteksi tag seleksi, bukan properti 'options={chartOptions}' pada grafik
  const hasSelectTag = /<(select|Select)\b/.test(content);
  const hasSearchableSelect = content.includes('<SearchableSelect');
  const missingAdvancedSelect = hasSelectTag && !hasSearchableSelect;

  // ─── Pillar 18: Standarisasi Toolbar Kontekstual Tabel ───
  const missingTableToolbar = !isComponentFile && (hasTableComponent || hasListComponent) && !hasTableToolbar;

  // ─── Pillar 19: Standarisasi Navigasi Portal & Tombol Kembali Capsule ───
  // Hardened: Navigasi breadcrumbs statis telah dipensiunkan demi App Launcher Hub + Glass Capsule Back Button
  const missingBreadcrumbs = false;
  const missingNavigationStandard = false;

  // ─── Pilar 20: Proteksi Fitur Berbayar (PremiumFeatureGate) ───
  const isPaidModule = !isComponentFile && isPaidModulePage;
  const hasPremiumGate = content.includes('<PremiumFeatureGate') || content.includes('PremiumFeatureGate');
  const missingPremiumGate = isPaidModule && !hasPremiumGate;

  // ─── Pilar 21: Pencegahan God File (Ukuran File Maksimum) ───
  const lineCount = totalLineCount;
  const isGodFile = isComponentFile ? (lineCount > 500) : (lineCount > 800);

  // ─── Pilar 22: Desentralisasi Konfigurasi (Anti-Hardcoded) ───
  // Hardened: Mendeteksi let/var dan variasi kata data tiruan (mock/dummy/sample/temp/test), serta IP lokal
  const hasMockData = /\b(const|let|var)\s+\w*(mock|dummy|sample|temp(?!late)|test(?!ing))\w*\s*=/i.test(content);
  const hasStaticApiUrl = /https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|api\b)/i.test(content);
  const hasHardcodedConfigs = hasMockData || hasStaticApiUrl;

  // ─── Pilar 23: Standarisasi Kartu Analitik/Statistik (AnalyticsCard) ───
  // Hardened: Mendeteksi pendefinisian class komponen statis kustom
  const hasCustomStatCardComponent = /\b(const|function|class)\s+(StatCard|StatsCard|MetricCard|AnalyticCard|MiniCard)\b/i.test(content);
  const hasHardcodedStatCards = /className="[^"]*rounded-xl[^"]*".*?(Total|Jumlah|Saldo|Revenue|Growth|Transaksi|Anggota|Pinjaman).*?text-[23]xl/is.test(content);
  const usesAnalyticsCard = content.includes('AnalyticsCard') || content.includes('MemoizedAnalyticsCard');
  const missingAnalyticsCard = (hasCustomStatCardComponent || hasHardcodedStatCards) && !usesAnalyticsCard;

  // ─── Pillar 24: Standarisasi Sistem Ekspor PDF (Built-in PDF Template Guard) ───
  // Hardened: Mendeteksi import dengan kutip ganda maupun tunggal
  const hasRawPdfLib = /from\s+['"](jspdf|jspdf-autotable)['"]/.test(content) || content.includes('new jsPDF(');
  const usesStandardPrintUtil = content.includes('utils/print/') || content.includes('@/utils/print') || content.includes('masterStrukturHelper') || content.includes('pdfAcademic') || content.includes('pdfGeneric');
  const missingStandardPdfPrint = hasRawPdfLib && !usesStandardPrintUtil;

  const hasImportExport = /XLSX|jsPDF|autoTable|importSiswaFromExcel|exportDataToExcel|onImport|onExport/i.test(content);
  const hasImportExportLoading = /isExporting|exportLoading|processing|loading/i.test(content);
  const hasTryCatchForExport = /try\s*\{.*?catch/s.test(content);
  const usesStyledTemplate = content.includes('generateImportTemplate') || !/Template_Impor|Template Impor/i.test(content);
  const missingImportExportGuard = hasImportExport && (!hasImportExportLoading || !hasTryCatchForExport || !usesStyledTemplate);

  // Pilar 25: Validasi Skema Zod untuk Form (Zod Schema Guard)
  // HARDENED: Mendeteksi SEMUA elemen form termasuk komponen React Absenta (kapital) untuk mencegah false-negative
  const hasForm = content.includes('<form') || /\<(input|select|textarea|Input|Select|Textarea|SearchableSelect)\b/i.test(content);
  // HARDENED: Hanya mendeteksi penggunaan Zod yang NYATA — dilarang keras memakai substring longgar
  // seperti 'Schema' atau 'zod' karena rentan false-positive dari nama interface TypeScript atau komentar
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

  // ─── Pilar 29: Kesiapan Whitelabel & Dynamic Branding (White-label Readiness Guard) ───
  // Hardened: Mendeteksi hardcode nama platform statis 'Absenta.id' / 'Absenta' secara kaku di luar variabel/fallback dinamis
  const hasHardcodedStaticAppBranding = /(?:>|\b)(?:Absenta\.id|Absenta.ID)(?:<|\b)/i.test(content) && !content.includes('tenantName') && !content.includes('systemConfig');
  const usesDynamicBranding = content.includes('tenantName') || content.includes('SystemConfig') || content.includes('tenantApi') || content.includes('AcademicPageLayout') || content.includes('PageLayout');
  const missingWhitelabelBranding = hasHardcodedStaticAppBranding && !usesDynamicBranding;

  // ─── Pilar 30: Adaptabilitas Responsif Multi-Perangkat (Responsive Multi-Device Adaptation Guard) ───
  const hasUnresponsiveGrid = /(?<!(?:sm|md|lg|xl|2xl):)grid-cols-(?:[2-9]|12)\b/.test(content);
  const hasUnresponsiveFixedWidth = /(?:w|min-w)-\[\d{3,4}px\]/.test(content) && !content.includes('overflow-x-auto') && !content.includes('max-w-full');
  const hasUnresponsiveTopbarText = /Kembali ke Dashboard/.test(content) && !content.includes('hidden sm:inline') && !content.includes('hidden sm:block') && !content.includes('truncate');
  const missingResponsiveAdaptation = !isComponentFile && (hasUnresponsiveGrid || hasUnresponsiveFixedWidth || hasUnresponsiveTopbarText);

  // ─── Pilar 29: Standarisasi Format Tanggal & Timezone Tenant (Date Format & Timezone Guard) ───
  const hasDateUsage = /toLocaleDateString|new Date|format\(|date-fns|moment/i.test(content);
  const hasValidDateFormat = !hasDateUsage || 
    content.includes("day: '2-digit'") || 
    content.includes('day: "2-digit"') ||
    content.includes("month: 'short'") ||
    content.includes('month: "short"') ||
    /formatDate|formatDateTime|formatDateIndo|formatDateLong/i.test(content);
  const usesTimezoneGuard = !hasDateUsage || 
    /timezone|tenantId|tenant_id|tenant.*timezone|useTimezone|utcToZonedTime|zonedTimeToUtc/i.test(content) ||
    /formatDate|formatDateTime|formatDateIndo|formatDateLong/i.test(content);
  const missingDateFormatOrTimezone = hasDateUsage && (!hasValidDateFormat || !usesTimezoneGuard);

  // ─── Pilar 30: Standarisasi Affordance & Kontras Tombol Toolbar (Toolbar Button Affordance Guard) ───
  const hasToolbarDefinition = /toolbar\s*=\s*\{|toolbarLeft\s*=\s*\{|toolbarRight\s*=\s*\{/i.test(content);
  const hasWeakToolbarButtons = hasToolbarDefinition && 
    (/<Button\s+[^>]*variant=["'](primary|secondary)["']/i.test(content) || 
     (/<Button\s+[^>]*size=["'](sm|xs|md|lg)["']/i.test(content) && !content.includes('size="toolbar"')));
  const missingToolbarButtonAffordance = hasToolbarDefinition && hasWeakToolbarButtons;

  // ─── Pilar 31: Data Fetching Optimization & Anti-useEffect Guard ───
  const hasRawEffectDataFetching = /useEffect\s*\(\s*(?:async\s*)?\(\)\s*=>\s*\{[^}]*?\b(fetch\(|axios\.|api\.|get\w+Api|\.get\(|load\w+|fetch\w+)/s.test(content) ||
    /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*?\b(fetch\w+|load\w+)\s*\(/s.test(content);
  const usesReactQueryOrHook = content.includes('useQuery') || content.includes('useMutation') || /use[A-Z]\w*Options/.test(content);
  const missingDataFetchingOptimization = hasRawEffectDataFetching && !usesReactQueryOrHook;

  // ─── Pilar 32: Standarisasi Cache Invalidation & Sinkronisasi Mutasi (Cache Invalidation Guard) ───
  const usesHardReload = /window\.location\.reload\s*\(|location\.reload\s*\(/.test(content);
  const hasMutationOperations = /useMutation\b|\b(api|axios|tenantApi|academicApi)\.(post|put|patch|delete)\b|handleDelete|handleBulkDelete|handleStatusChange|handleToggle/i.test(content);
  const hasCacheInvalidation = /invalidateQueries|invalidateCache|queryClient|refetch\s*\(|onSuccess\s*:\s*|onSuccess\s*\(|mutateAsync|onComplete/i.test(content);
  const missingCacheInvalidation = usesHardReload || (hasMutationOperations && !hasCacheInvalidation);

  const key = getRegistryKey(filepath, content);

  const issues = [];
  let status = 'COMPLIANT';

  if (!isComponentFile && !usesLayout) {
    status = 'NON_COMPLIANT';
    issues.push('❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)');
  }
  
  if (!isComponentFile && usesLayout && !content.includes('hardeningModuleKey')) {
    status = 'PARTIAL';
    issues.push("⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.");
  }

  if (hasUnsafeMap) {
    status = 'PARTIAL';
    issues.push('❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.');
  }

  if (missingMemoization) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push('⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)');
  }

  if (hasAnyType) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push('⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)');
  }

  if (missingCleanup) {
    status = 'NON_COMPLIANT';
    issues.push('❌ Menggunakan listeners/timer (addEventListener, setInterval, setTimeout) di dalam useEffect tetapi lupa menulis fungsi return cleanup (Kebocoran Memori Klien)');
  }

  if (hasHardcodedColors) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push('❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual');
  }

  if (missingTableSorting) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("⚠️  Komponen <Table> ditemukan tetapi tidak memiliki implementasi sorting. Hubungkan properti 'sortBy', 'sortOrder', 'onSort', dan tandai kolom dengan 'sortable: true'.");
  }

  if (missingEmptyState) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("⚠️  Halaman melakukan fetch data tetapi tidak memiliki penanganan Empty State. Pastikan terdapat pengecekan kondisi data kosong (seperti 'data.length === 0', 'isEmpty', atau penegasian '!data.length').");
  }

  if (missingLoadingGuard) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("⚠️  Halaman melakukan fetch data tetapi tidak memiliki guard Loading/Skeleton. Sediakan loading state guard (seperti 'isLoading', 'isFetching', 'loading', atau komponen <Skeleton />).");
  }

  if (missingA11y) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push('⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)');
  }

  if (missingLazyLoading) {
    status = 'NON_COMPLIANT';
    issues.push('❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)');
  }

  if (missingInstruction) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push('⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)');
  }

  if (missingPagination) {
    status = 'NON_COMPLIANT';
    issues.push("❌ Komponen <Table> ditemukan tetapi tidak memiliki implementasi Pagination. Wajib menyediakan properti 'pagination' dengan callback 'onPageChange' dan 'onLimitChange'.");
  }

  if (missingToolbar) {
    status = 'NON_COMPLIANT';
    issues.push("❌ Aksi utama halaman (onAdd, onImport, dll.) terdeteksi tetapi tidak diletakkan pada properti toolbar Table (Wajib: 'toolbarLeft' atau 'toolbarRight').");
  }

  if (misplacedToolbar) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push('⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)');
  }

  if (missingFeedbackSystem) {
    status = 'NON_COMPLIANT';
    issues.push('❌ Menggunakan dialog alert() atau confirm() bawaan browser. Gunakan hook useToast() untuk feedback pesan, atau useConfirm() untuk dialog konfirmasi modern.');
  }

  if (missingStandardContainer) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push('⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.');
  }

  if (missingAdvancedSelect) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push('⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)');
  }

  if (missingPremiumGate) {
    status = 'NON_COMPLIANT';
    issues.push('❌ Belum menggunakan PremiumFeatureGate untuk proteksi modul berbayar');
  }

  if (isGodFile) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    const breakdownMsg = fileLineBreakdown
      .map(f => {
        const fileLink = `file:///${f.path.replace(/\\/g, '/')}`;
        return `[${path.basename(f.path)}](${fileLink}) (${f.lines} baris)`;
      })
      .join(', ');
    issues.push(`⚠️  Ukuran berkas terlalu besar (total terdeteksi ${lineCount} baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: ${breakdownMsg}. Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.`);
  }

  if (hasHardcodedConfigs) {
    status = 'NON_COMPLIANT';
    issues.push('❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.');
  }

  if (missingAnalyticsCard) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("⚠️  Terdeteksi kartu statistik/analitik kustom lokal. Gunakan komponen AnalyticsCard terstandarisasi varian premium. Disarankan Cara 1: Lewatkan data via properti 'stats={[...]}' pada <AcademicPageLayout> (secara default me-render varian premium). Cara 2: Impor langsung <AnalyticsCard variant=\"premium\"> dari '@/components/ui/AnalyticsCard'.");
  }

  if (missingStandardPdfPrint) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("⚠️  Mendeteksi ekspor PDF manual/mentah. Gunakan modul cetak PDF terstandar di 'src/utils/print/' untuk menjaga konsistensi template kop surat resmi.");
  }

  if (missingImportExportGuard) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("⚠️  Terdeteksi fitur ekspor/impor data tetapi belum memenuhi standar audit. Petunjuk Perbaikan: 1) Gunakan helper standar ter-style 'generateImportTemplate' dari '@/utils/export.utils' untuk unduhan template Excel. 2) Pastikan proses impor/ekspor dilindungi loading guard (state 'isExporting'/'processing') untuk menghindari double-submit. 3) Bungkus logika dengan try-catch block untuk menangani error secara aman.");
  }

  if (missingZodValidation) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.");
  }

  if (missingTabSwitcher) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.");
  }

  if (missingLayoutFlowConsistency) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("⚠️  Tata letak tidak konsisten. Terdeteksi komponen filter atau kartu statistik diletakkan di bawah tabel data master.");
  }

  if (missingDateFormatOrTimezone) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.");
  }

  if (missingToolbarButtonAffordance) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.");
  }

  if (missingWhitelabelBranding) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("⚠️  Terdeteksi teks branding platform statis yang ter-hardcode (Pelanggaran Kesiapan Whitelabel Dinas). Wajib melakukan refaktor secara best-practice: (1) DILARANG KERAS menulis teks 'Absenta.id' atau 'Absenta' secara permanen (hardcoded) di dalam tag JSX header/title/footer. (2) Ambil profil branding dinamis dari API/Layout dengan menyisipkan 'tenantName' atau 'systemConfig'. (3) Gunakan variabel dinamis '{tenantName || systemConfig?.app_name || \"Portal Sekolah\"}' pada teks tampilan. (4) Bungkus halaman dengan <AcademicPageLayout> atau <PageLayout> yang secara otomatis menyuplai branding Whitelabel tenant.");
  }

  if (missingResponsiveAdaptation) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant=\"compact-premium\"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).");
  }

  if (missingDataFetchingOptimization) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.");
  }

  if (missingCacheInvalidation) {
    if (status === 'COMPLIANT') status = 'PARTIAL';
    issues.push("❌ Terdeteksi operasi mutasi data tanpa pemanggilan Cache Invalidation atau menggunakan hard reload 'window.location.reload()' (Pelanggaran Pilar 32 Standarisasi Invalidation Cache). Wajib memanggil 'queryClient.invalidateQueries(...)' atau invalidator cache terpusat agar UI otomatis tersinkronisasi tanpa menampilkan data basi.");
  }

  totalFiles++;
  if (status === 'COMPLIANT') {
    fullyCompliant++;
  } else if (status === 'PARTIAL') {
    partialCompliant++;
  } else {
    nonCompliant++;
  }

  // Simpan hasil audit statis untuk diintegrasikan ke runtime inspector
  jsonResults[key] = {
    usesLayout,
    usesAcademicLayout,
    usesPageLayout,
    usesUiComponents: content.includes('components/ui') || content.includes('@/components/ui'),
    usesMemo: hasMemo,
    noAnyType: !hasAnyType,
    safeMapping: !hasUnsafeMap,
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
    dateFormatTimezoneGuard: !missingDateFormatOrTimezone,
    toolbarButtonAffordanceGuard: !missingToolbarButtonAffordance,
    whitelabelBrandingGuard: isComponentFile ? true : !missingWhitelabelBranding,
    responsiveLayoutAdaptationGuard: isComponentFile ? true : !missingResponsiveAdaptation,
    dataFetchingOptimizationGuard: !missingDataFetchingOptimization,
    cacheInvalidationGuard: !missingCacheInvalidation,
    filename,
    relativePath
  };

  reports.push({
    relativePath,
    filename,
    status,
    issues
  });
});

// Tulis hasil audit JSON untuk inspector runtime
fs.writeFileSync(outputJsonPath, JSON.stringify(jsonResults, null, 2), 'utf8');

// Tulis Laporan Refaktor Markdown Premium untuk Owner (Executive Dashboard)
let mdContent = `# 🛡️ ABSENTA.ID – LAPORAN KEPATUHAN HARDENING & STRUKTUR ARSITEKTUR

Dokumen ini adalah **Rincian Refaktor Hardening** terpusat yang dihasilkan secara otomatis oleh *Super Smart Static Audit Engine*. Gunakan dokumen ini sebagai peta jalan (roadmap) untuk memberikan instruksi hardening selanjutnya kepada AI.

---

## 📊 KESEHATAN ARSITEKTUR APLIKASI (EXECUTIVE SUMMARY)

| Metrik Evaluasi | Hasil Peminidaian | Persentase | Status |
|---|---|---|---|
| **Total Halaman Utama** | **${totalFiles} Halaman** | 100% | - |
| **✅ Lolos Sempurna (Hardened)** | **${fullyCompliant} Halaman** | ${Math.round((fullyCompliant/totalFiles)*100)}% | **Sangat Baik** |
| **⚠️ Sebagian Terstandar (Partial)** | **${partialCompliant} Halaman** | ${Math.round((partialCompliant/totalFiles)*100)}% | **Butuh Sentuhan Ringan** |
| **❌ Belum Terstandar (Non-Compliant)** | **${nonCompliant} Halaman** | ${Math.round((nonCompliant/totalFiles)*100)}% | **Prioritas Utama Refaktor** |

---

## 🛠️ DAFTAR RINCIAN REFAKTOR PER-HALAMAN

Berikut adalah rincian masalah teknis riil yang terdeteksi di setiap file halaman utama:

`;

// Urutkan laporan: NON_COMPLIANT teratas
reports.sort((a, b) => {
  const score = { NON_COMPLIANT: 3, PARTIAL: 2, COMPLIANT: 1 };
  return score[b.status] - score[a.status];
});

reports.forEach(report => {
  let statusBadge = '';
  if (report.status === 'COMPLIANT') {
    statusBadge = '🟢 **TERSTANDARISASI (Lolos Audit)**';
  } else if (report.status === 'PARTIAL') {
    statusBadge = '🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**';
  } else {
    statusBadge = '🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**';
  }

  mdContent += `### 📄 Halaman: \`${report.filename}\`\n`;
  mdContent += `* **Lokasi File:** [${report.filename}](file:///${path.join(__dirname, '..', report.relativePath).replace(/\\/g, '/')})\n`;
  mdContent += `* **Status Kepatuhan:** ${statusBadge}\n`;
  
  if (report.issues.length > 0) {
    mdContent += `* **Rincian Temuan Masalah & Rekomendasi:**\n`;
    report.issues.forEach(issue => {
      mdContent += `  * ${issue}\n`;
    });
  } else {
    mdContent += `* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!\n`;
  }
  mdContent += `\n---\n\n`;
});

fs.writeFileSync(outputMdPath, mdContent, 'utf8');

console.log('\x1b[32m%s\x1b[0m', `💾 Database Audit Statis Berhasil Disimpan ke: ${outputJsonPath}`);
console.log('\x1b[32m%s\x1b[0m', `📋 LAPORAN EXECUTIVE MARKDOWN BERHASIL DITULIS KE: ${outputMdPath}\n`);

// Cetak ke layar
reports.forEach(report => {
  if (report.status === 'COMPLIANT') {
    console.log('\x1b[32m%s\x1b[0m', `✅ TERSTANDARISASI | ${report.relativePath}`);
  } else if (report.status === 'PARTIAL') {
    console.log('\x1b[33m%s\x1b[0m', `⚠️  SEBAGIAN       | ${report.relativePath}`);
    report.issues.forEach(issue => console.log(`   └─ ${issue}`));
  } else {
    console.log('\x1b[31m%s\x1b[0m', `❌ BELUM STANDAR  | ${report.relativePath}`);
    report.issues.forEach(issue => console.log(`   └─ \x1b[31m${issue}\x1b[0m`));
  }
});

console.log('\n\x1b[36m%s\x1b[0m', '================ RINGKASAN HASIL AUDIT STATIS ================');
console.log(`Total Halaman yang Diaudit : ${totalFiles} file`);
console.log(`\x1b[32mSempurna Terstandarisasi   : ${fullyCompliant} file\x1b[0m`);
console.log(`\x1b[33mSebagian Terstandarisasi   : ${partialCompliant} file\x1b[0m`);
console.log(`\x1b[31mBelum Terstandarisasi      : ${nonCompliant} file\x1b[0m`);
console.log('\x1b[36m%s\x1b[0m', '=============================================================');

// ─── Build Breaker Standar Google ───
if (process.argv.includes('--strict')) {
  if (nonCompliant > 0 || partialCompliant > 0) {
    console.error('\x1b[31m%s\x1b[0m', `\n🚫 [BUILD BREAKER] Gagal melakukan build! Ditemukan ${nonCompliant} halaman BELUM STANDAR dan ${partialCompliant} halaman SEBAGIAN STANDAR.`);
    console.error('\x1b[31m%s\x1b[0m', 'Harap perbaiki seluruh pelanggaran arsitektur di atas sebelum melakukan kompilasi produksi.\n');
    process.exit(1);
  } else {
    console.log('\x1b[32m%s\x1b[0m', '\n🟢 [BUILD BREAKER] Lolos! Seluruh kode memenuhi standar hardening 100%. Memulai kompilasi...\n');
  }
}

