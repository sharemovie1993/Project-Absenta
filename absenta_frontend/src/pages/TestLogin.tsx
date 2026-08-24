import { z } from 'zod';
import { Card } from '../components/ui/Card';
import { formatDate } from '@/utils/date.utils';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axiosInstance from '../lib/axiosInstance';
import { InfraErrorBoundary } from '../components/superadmin/infra/InfraErrorBoundary';

const authLoginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi')
});

const hardeningModuleKey = "auth_test_login";

const AlternativeLoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@absenta.sch.id');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const timerRef = useRef<number | null>(null);

  const memoizedDate = useMemo(() => formatDate(new Date()), []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleLogin = useCallback(async () => {
    const val = authLoginSchema.safeParse({ username: email, password });
    if (!val.success) {
      setMessage('Periksa format username dan password');
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      const response = await axiosInstance.post('/auth/login', {
        email,
        password
      });
      
      if (response.data.success) {
        localStorage.setItem('access_token', response.data.data.access_token);
        if (response.data.data.tenant_id) {
          localStorage.setItem('tenant_id', response.data.data.tenant_id);
        }
        
        setMessage('✅ Login berhasil! Token dan tenant_id disimpan.');
        
        timerRef.current = window.setTimeout(() => {
          window.location.href = '/billing';
        }, 2000);
      } else {
        setMessage('❌ Login gagal: ' + response.data.message);
      }
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setMessage('❌ Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const checkCurrentAuth = useCallback(() => {
    const token = localStorage.getItem('access_token');
    const tenantId = localStorage.getItem('tenant_id');
    
    setMessage(`
      Token: ${token ? '✅ Available' : '❌ Missing'}
      Tenant ID: ${tenantId || '❌ Missing'}
      Waktu: ${memoizedDate}
    `);
  }, [memoizedDate]);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('tenant_id');
    setMessage('🗑️ Auth data cleared');
  }, []);

  return (
    <InfraErrorBoundary>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Card className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center dark:text-white">Login Alternatif</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="userEmailInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                id="userEmailInput"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md dark:bg-slate-900 dark:text-white"
              />
            </div>
            
            <div>
              <label htmlFor="userPasswordInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <input
                id="userPasswordInput"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md dark:bg-slate-900 dark:text-white"
              />
            </div>
            
            <div className="space-y-2">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
              
              <button
                onClick={checkCurrentAuth}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
              >
                Check Current Auth
              </button>
              
              <button
                onClick={clearAuth}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
              >
                Clear Auth
              </button>
            </div>
            
            {message && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-slate-900 rounded-md">
                <pre className="text-sm whitespace-pre-wrap dark:text-gray-300">{message}</pre>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <a href="/billing" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
              Go to Billing Page
            </a>
          </div>
        </Card>
      </div>
    </InfraErrorBoundary>
  );
};

export default AlternativeLoginPage;
