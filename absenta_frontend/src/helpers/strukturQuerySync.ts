import { QueryClient } from '@tanstack/react-query';

/**
 * 🔄 Single Source of Truth helper untuk sinkronisasi React Query cache
 * pada seluruh aksi penugasan, perubahan hak akses, atau penghapusan di modul Struktur Organisasi.
 */
export const syncStrukturCache = async (queryClient: QueryClient): Promise<void> => {
  const queryKeysToInvalidate = [
    ['strukturTree'],
    ['kurikulum-struktur'],
    ['waliKelasList'],
    ['wali-kelas-options-list'],
    ['bebanGuru'],
    ['beban-guru-list'],
    ['academic-stats'],
    ['guru-options-list'],
    ['jurusans'],
  ];

  // Invalidate and refetch primary queries concurrently
  await Promise.all(
    queryKeysToInvalidate.map((key) =>
      queryClient.invalidateQueries({ queryKey: key, exact: false })
    )
  );

  await queryClient.refetchQueries({ queryKey: ['strukturTree'], exact: false });
};
