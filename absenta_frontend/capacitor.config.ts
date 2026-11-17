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
      'ota.absenta.id',
      '103.127.133.113',
      'localhost',
      '*.localhost',
      '127.0.0.1',
      '10.0.2.2'
    ]
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#ffffff'
    },
    CapacitorUpdater: {
      autoUpdate: false,
      resetWhenUpdate: false
    }
  }
};

export default config;
