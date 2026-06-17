const fs = require('fs');
const content = fs.readFileSync('src/pages/academic/TahunPelajaranPage.tsx', 'utf8');
const usesLayout = content.includes('AcademicPageLayout') || content.includes('PageLayout') || content.includes('InfraErrorBoundary');
const hasUnsafeMap = /\.map\(/g.test(content) && !/\?\.map\(/g.test(content);
const hasLists = content.includes('List') || content.includes('Table') || content.includes('get');
const hasMemo = content.includes('useMemo') && content.includes('useCallback');
const missingMemoization = hasLists && !hasMemo;
const hasAnyType = /:\s*any/g.test(content) || /<\s*any\s*>/g.test(content);
const hasListeners = content.includes('addEventListener') || content.includes('socket.on') || content.includes('setInterval') || content.includes('setTimeout');
const hasCleanup = content.includes('return () =>');
const missingCleanup = hasListeners && !hasCleanup;
const hasInlineStyleColor = /style\s*=\s*\{\{\s*[^}]*(color|background|bg|border|fill|stroke)\s*:\s*['"`]#/i.test(content);
const hasArbitraryColor = /\[#([0-9a-fA-F]{3,8})\]/g.test(content);
const hasHardcodedColors = hasInlineStyleColor || hasArbitraryColor;
const hasTableComponent = /<Table[\s/>]/.test(content);
const hasSortingImpl = /sortable|onSort|sortKey|sortBy|handleSort|sortDirection|sortConfig|orderBy/.test(content);
const missingTableSorting = hasTableComponent && !hasSortingImpl;
const hasFetchData = content.includes('useQuery') || content.includes('useFetch') || content.includes('useGet') || content.includes('axios.get') || content.includes('fetch(');
const hasEmptyState = /\.length\s*===\s*0|isEmpty|emptyState|EmptyState|NoData|data\.length\s*==\s*0|items\.length/.test(content);
const missingEmptyState = hasFetchData && !hasEmptyState;
const hasLoadingGuard = /isLoading|isFetching|Skeleton|loading &&|loading \?|spinner|Spinner/.test(content);
const missingLoadingGuard = hasFetchData && !hasLoadingGuard;
const hasFormElements = /<input|<select|<textarea/.test(content);
const hasA11yAttr = /aria-label|htmlFor|aria-describedby|aria-required/.test(content);
const missingA11y = hasFormElements && !hasA11yAttr;

console.log({
  usesLayout,
  safeMapping: !hasUnsafeMap,
  usesMemo: hasMemo,
  noAnyType: !hasAnyType,
  safeEffect: !missingCleanup,
  strictColors: !hasHardcodedColors,
  tableSorting: !missingTableSorting,
  emptyState: !missingEmptyState,
  loadingGuard: !missingLoadingGuard,
  formA11y: !missingA11y
});
