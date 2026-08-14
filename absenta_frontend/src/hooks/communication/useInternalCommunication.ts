import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  internalCommunicationApi, 
  communicationKeys, 
  type CreateThreadPayload,
  type SendMessagePayload,
  type InternalThreadStatus,
} from '@/api/internal-communication.api';
import type { SearchableSelectOption } from '@/components/ui/SearchableSelect';
import toast from 'react-hot-toast';

export function useInternalCommunication(filters?: { type?: string; category?: string; status?: string; search?: string }) {
  const queryClient = useQueryClient();

  // 1. Ambil daftar thread percakapan
  const threadsQuery = useQuery({
    queryKey: communicationKeys.threads(filters),
    queryFn: () => internalCommunicationApi.getThreads(filters),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000
  });

  // 2. Ambil unread counter
  const unreadCountQuery = useQuery({
    queryKey: communicationKeys.unreadCount(),
    queryFn: () => internalCommunicationApi.getUnreadCount(),
    staleTime: 10 * 1000,
    refetchInterval: 20 * 1000
  });

  // 3. Ambil direktori kontak sah
  const contactsQuery = useQuery({
    queryKey: communicationKeys.contacts(),
    queryFn: () => internalCommunicationApi.getContacts(),
    staleTime: 60 * 1000,
  });

  // 4. Transform kontak menjadi SearchableSelectOption
  const contactOptions: SearchableSelectOption[] = useMemo(() => {
    const contacts = contactsQuery.data || [];
    return contacts.map(c => ({
      value: c.id,
      label: `${c.name} • ${c.role_label || c.role}${c.sub_label ? ` (${c.sub_label})` : ''}`,
      raw: c
    }));
  }, [contactsQuery.data]);

  // 5. Mutasi: Buat Thread Baru
  const createThreadMutation = useMutation({
    mutationFn: (payload: CreateThreadPayload) => internalCommunicationApi.createThread(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.threads() });
      queryClient.invalidateQueries({ queryKey: communicationKeys.unreadCount() });
      toast.success('Percakapan baru berhasil dibuat!');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal memulai percakapan');
    }
  });

  // 6. Mutasi: Kirim Pesan
  const sendMessageMutation = useMutation({
    mutationFn: ({ threadId, payload }: { threadId: string; payload: SendMessagePayload }) =>
      internalCommunicationApi.sendMessage(threadId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.messages(variables.threadId) });
      queryClient.invalidateQueries({ queryKey: communicationKeys.threads() });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mengirim pesan');
    }
  });

  // 7. Mutasi: Update Status Disposisi
  const updateStatusMutation = useMutation({
    mutationFn: ({ threadId, status }: { threadId: string; status: InternalThreadStatus }) =>
      internalCommunicationApi.updateStatus(threadId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.messages(variables.threadId) });
      queryClient.invalidateQueries({ queryKey: communicationKeys.threads() });
      toast.success('Status topik berhasil diperbarui');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal memperbarui status');
    }
  });

  return {
    threads: threadsQuery.data || [],
    isLoadingThreads: threadsQuery.isLoading,
    unreadCount: unreadCountQuery.data || 0,
    contacts: contactsQuery.data || [],
    contactOptions,
    isLoadingContacts: contactsQuery.isLoading,
    refetchThreads: threadsQuery.refetch,
    refetchContacts: contactsQuery.refetch,
    createThread: createThreadMutation.mutateAsync,
    isCreatingThread: createThreadMutation.isPending,
    sendMessage: sendMessageMutation.mutateAsync,
    isSendingMessage: sendMessageMutation.isPending,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending
  };
}
