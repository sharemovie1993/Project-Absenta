import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.absenta.app',
  appName: 'Absenta',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      '*.absenta.id',
      'absenta.id',
      'localhost',
      '*.localhost',
      '127.0.0.1',
      '10.0.2.2'
    ]
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#059669'
    }
  }
};

export default config;
