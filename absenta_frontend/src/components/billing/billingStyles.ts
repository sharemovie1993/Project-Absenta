export const STANDARD_ANIMATIONS = {
  section: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 }
  },
  table: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.2 }
  }
};

export const STANDARD_CLASSES = {
  filtersContainer: 'flex items-center gap-3 mb-4',
  filtersContainerRightAligned: 'flex items-center gap-3 mb-4 justify-end',
  selectFilter: 'pl-10 pr-8 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
  cardContainer: 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm',
  cardHeader: 'px-6 py-4 border-b border-gray-200 dark:border-gray-700',
  cardContent: 'p-6',
  tableContainer: 'overflow-x-auto'
};

