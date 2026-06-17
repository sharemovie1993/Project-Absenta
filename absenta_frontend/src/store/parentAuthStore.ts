import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DashboardResponse, StudentDashboardData } from '../api/parent.api';

interface ParentAuthState {
  token: string | null;
  data: DashboardResponse | null;
  selectedStudentId: string | null;
  error: string | null;
  
  setToken: (token: string) => void;
  setData: (data: DashboardResponse) => void;
  setSelectedStudentId: (id: string) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  
  // Helpers
  getSelectedStudent: () => StudentDashboardData | undefined;
}

export const useParentAuthStore = create<ParentAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      data: null,
      selectedStudentId: null,
      error: null,

      setToken: (token) => {
        localStorage.setItem('parent_access_token', token);
        set({ token, error: null });
      },

      setData: (data) => {
        set((state) => {
          // If no student selected, select the first one
          let newSelectedId = state.selectedStudentId;
          
          if (data.siswa.length > 0) {
            // Check if current selection is valid
            const exists = data.siswa.find(s => s.siswa_id === newSelectedId);
            if (!exists) {
              newSelectedId = data.siswa[0].siswa_id;
            }
          } else {
            newSelectedId = null;
          }
            
          return { data, selectedStudentId: newSelectedId };
        });
      },

      setSelectedStudentId: (id) => set({ selectedStudentId: id }),

      setError: (error) => set({ error }),

      logout: () => {
        localStorage.removeItem('parent_access_token');
        set({ token: null, data: null, selectedStudentId: null, error: null });
      },

      getSelectedStudent: () => {
        const { data, selectedStudentId } = get();
        if (!data || !selectedStudentId) return undefined;
        return data.siswa.find(s => s.siswa_id === selectedStudentId);
      }
    }),
    {
      name: 'parent-auth-storage',
      partialize: (state) => ({ 
        token: state.token,
        data: state.data,
        selectedStudentId: state.selectedStudentId
      }),
    }
  )
);
