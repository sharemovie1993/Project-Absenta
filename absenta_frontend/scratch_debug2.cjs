const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src/pages');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walkDir(filepath, callback);
    } else if (file.endsWith('.tsx')) {
      callback(filepath);
    }
  });
}

walkDir(targetDir, (filepath) => {
  const filename = path.basename(filepath);
  if (filename.toLowerCase().includes('product')) {
    const relativePath = path.relative(path.join(__dirname, '..'), filepath);
    const isCooperativePage = filepath.replace(/\\/g, '/').includes('/pages/cooperative/') && !filename.includes('Detail');
    const isPageRouterEntry = filename.endsWith('Page.tsx') || filename === 'Login.tsx' || filename === 'TestLogin.tsx' || isCooperativePage;
    
    console.log(`File: ${filename}`);
    console.log(`  relativePath: ${relativePath}`);
    console.log(`  isCooperativePage: ${isCooperativePage}`);
    console.log(`  isPageRouterEntry: ${isPageRouterEntry}`);
    
    if (!isPageRouterEntry) {
      console.log(`  -> Filtered out by isPageRouterEntry`);
      return;
    }
    
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Check if hardeningModuleKey is present in content
    const keyMatch = content.match(/hardeningModuleKey\s*=\s*["']([^"']+)["']/);
    console.log(`  keyMatch: ${keyMatch ? keyMatch[1] : 'null'}`);
    
    // ─── Pilar 1: Standardisasi Layout Utama ───
    const usesLayout = content.includes('AcademicPageLayout') || content.includes('PageLayout') || content.includes('InfraErrorBoundary');
    console.log(`  usesLayout: ${usesLayout}`);
    
    // ─── Pilar 2: Keamanan Data & Defensive Programming ───
    const hasUnsafeMap = /\.map\(/g.test(content) && !/\?\.map\(/g.test(content);
    console.log(`  hasUnsafeMap: ${hasUnsafeMap}`);
    
    // ─── Pilar 3: Optimasi DOM Churn ───
    const hasLists = content.includes('List') || content.includes('Table') || content.includes('get');
    const hasMemo = content.includes('useMemo') && content.includes('useCallback');
    const missingMemoization = hasLists && !hasMemo;
    console.log(`  missingMemoization: ${missingMemoization}`);
    
    // ─── Pilar 4: Keamanan Tipe TypeScript ───
    const hasAnyType = /:\s*any/g.test(content) || /<\s*any\s*>/g.test(content);
    console.log(`  hasAnyType: ${hasAnyType}`);
    
    // ─── Pilar 5: Pencegahan Kebocoran Memori ───
    const hasListeners = content.includes('addEventListener') || content.includes('socket.on') || content.includes('setInterval') || content.includes('setTimeout');
    const hasCleanup = content.includes('return () =>');
    const missingCleanup = hasListeners && !hasCleanup;
    console.log(`  missingCleanup: ${missingCleanup}`);
    
    // ─── Pilar 6: Konsistensi Pewarnaan Ketat ───
    const hasInlineStyleColor = /style\s*=\s*\{\{\s*[^}]*(color|background|bg|border|fill|stroke)\s*:\s*['"`]#/i.test(content);
    const hasArbitraryColor = /\[#([0-9a-fA-F]{3,8})\]/g.test(content);
    const hasHardcodedColors = hasInlineStyleColor || hasArbitraryColor;
    console.log(`  hasHardcodedColors: ${hasHardcodedColors}`);
    
    // Pillar 7: Table Sorting
    const hasTableComponent = /<Table[\s/>]/.test(content);
    const hasSortingImpl = /sortable|onSort|sortKey|sortBy|handleSort|sortDirection|sortConfig|orderBy/.test(content) || /List[\s/>]/.test(content);
    const missingTableSorting = hasTableComponent && !hasSortingImpl;
    console.log(`  missingTableSorting: ${missingTableSorting}`);
    
    // Pillar 8: Empty State
    const hasFetchData = content.includes('useQuery') || content.includes('useFetch') || content.includes('useGet') || content.includes('axios.get') || content.includes('fetch(');
    const hasEmptyState = /\.length\s*===\s*0|isEmpty|emptyState|EmptyState|NoData|data\.length\s*==\s*0|items\.length/.test(content) || /List[\s/>]/.test(content);
    const missingEmptyState = hasFetchData && !hasEmptyState;
    console.log(`  missingEmptyState: ${missingEmptyState}`);
    
    // Pillar 9: Loading Guard
    const hasLoadingGuard = /isLoading|isFetching|Skeleton|loading &&|loading \?|spinner|Spinner/.test(content) || /List[\s/>]/.test(content);
    const missingLoadingGuard = hasFetchData && !hasLoadingGuard;
    console.log(`  missingLoadingGuard: ${missingLoadingGuard}`);
    
    // Pillar 10: Form A11y
    const hasFormElements = /<input|<select|<textarea/.test(content);
    const hasA11yAttr = /aria-label|htmlFor|aria-describedby|aria-required/.test(content);
    const missingA11y = hasFormElements && !hasA11yAttr;
    console.log(`  missingA11y: ${missingA11y}`);
    
    // Pillar 11: Performance Optimization
    const hasLazy = content.includes('lazy(') && content.includes('Suspense');
    const hasHeavyComponents = /Modal|Form|Excel|Loader/.test(content);
    const missingLazyLoading = hasHeavyComponents && !hasLazy;
    console.log(`  missingLazyLoading: ${missingLazyLoading}`);
  }
});
