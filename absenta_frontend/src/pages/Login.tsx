import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import axiosInstance from '../lib/axiosInstance';
import { InfraErrorBoundary } from '../components/superadmin/infra/InfraErrorBoundary';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [localError, setLocalError] = useState('');
  const [tenantName, setTenantName] = useState('');

  const { loginAction, isAuthenticated, isLoading, error } = useAuthStore();
  const location = useLocation();
  
  useEffect(() => {
    const fetchTenantInfo = async () => {
      try {
        const res = await axiosInstance.get('/auth/tenant-info');
        if (res.data?.success) {
          setTenantName(res.data.data?.name || '');
        }
      } catch {}
    };
    fetchTenantInfo();
  }, []);

  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!credentials.email || !credentials.password) {
      setLocalError('Email dan password harus diisi');
      return;
    }

    try {
      await loginAction(credentials.email, credentials.password);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || error || 'Login gagal. Periksa email, password, dan tenant ID Anda.';
      setLocalError(errorMessage);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <InfraErrorBoundary>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              {tenantName ? `Sistem Absensi - ${tenantName}` : 'Sistem Absensi Multitenant'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Masuk ke akun Anda
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email"
                  value={credentials.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            {(localError || error) && (
              <div className="text-red-600 text-sm text-center">
                {localError || error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Memproses...
                  </div>
                ) : (
                  'Masuk'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </InfraErrorBoundary>
  );
};

export default Login;
