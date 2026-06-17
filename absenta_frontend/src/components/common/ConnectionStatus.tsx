import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'offline' | 'error';
  isUsingWebSocket: boolean;
  onReconnect?: () => void;
  className?: string;
}

/**
 * Komponen untuk menampilkan status koneksi real-time
 */
export function ConnectionStatus({ 
  status, 
  isUsingWebSocket, 
  onReconnect, 
  className = '' 
}: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          text: 'Menghubungkan...',
          description: 'Menghubungkan WebSocket'
        };
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'Terhubung',
          description: isUsingWebSocket ? 'WebSocket aktif' : 'Polling aktif'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'Error',
          description: 'Gagal terhubung'
        };
      default: // offline
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Offline',
          description: 'Tidak terhubung'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}>
      <Icon 
        className={`w-4 h-4 ${config.color} ${status === 'connecting' ? 'animate-spin' : ''}`} 
      />
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
        <span className="text-xs text-gray-500">
          {config.description}
        </span>
      </div>
      
      {(status === 'error' || status === 'offline') && onReconnect && (
        <button
          onClick={onReconnect}
          className="ml-2 p-1 rounded hover:bg-gray-100 transition-colors"
          title="Coba hubungkan kembali"
        >
          <RefreshCw className="w-3 h-3 text-gray-400" />
        </button>
      )}
    </div>
  );
}

/**
 * Komponen mini untuk status koneksi (untuk header/navbar)
 */
export function ConnectionStatusMini({ 
  status, 
  isUsingWebSocket, 
  onReconnect, 
  className = '' 
}: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-500',
          title: 'Menghubungkan...'
        };
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          title: isUsingWebSocket ? 'WebSocket terhubung' : 'Polling aktif'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          title: 'Error koneksi'
        };
      default: // offline
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          title: 'Offline'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div 
      className={`flex items-center gap-1 ${className}`}
      title={config.title}
    >
      <Icon 
        className={`w-4 h-4 ${config.color} ${status === 'connecting' ? 'animate-spin' : ''}`} 
      />
      {(status === 'error' || status === 'offline') && onReconnect && (
        <button
          onClick={onReconnect}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          title="Coba hubungkan kembali"
        >
          <RefreshCw className="w-3 h-3 text-gray-400" />
        </button>
      )}
    </div>
  );
}
