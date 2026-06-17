import * as admin from 'firebase-admin';
import fs from 'fs';

export class FcmService {
  private initialized = false;
  private error: string | null = null;

  constructor() {
    try {
      if (!this.initialized) {
        const svcPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        if (!svcPath) {
          this.error = 'FIREBASE_SERVICE_ACCOUNT_PATH not configured';
          console.warn('⚠️  FCM Service: Firebase path not configured, FCM disabled');
          return;
        }

        if (!fs.existsSync(svcPath)) {
          this.error = `Firebase credentials file not found at: ${svcPath}`;
          console.warn(`⚠️  FCM Service: ${this.error}`);
          return;
        }

        try {
          const json = JSON.parse(fs.readFileSync(svcPath, 'utf-8'));
          if (!admin.apps.length) {
            admin.initializeApp({
              credential: admin.credential.cert(json),
            });
          }
          this.initialized = true;
          console.log('✅ FCM Service initialized successfully');
        } catch (parseErr) {
          this.error = `Failed to parse Firebase credentials: ${parseErr}`;
          console.warn(`⚠️  FCM Service: ${this.error}`);
        }
      }
    } catch (err) {
      this.error = `FCM initialization failed: ${err}`;
      console.warn(`⚠️  FCM Service: ${this.error}`);
    }
  }

  async sendToToken(token: string, title: string, body: string, data?: Record<string, any>) {
    if (!this.initialized) {
      console.debug(`FCM skipped (not initialized): ${title}`);
      return false;
    }

    const message: admin.messaging.Message = {
      token,
      notification: { title, body },
      android: {
        priority: 'high',
        notification: {
          channelId: 'absenta_parent_alarm',
          sound: 'default',
        },
      },
      data: data || {},
    };
    try {
      await admin.messaging().send(message);
      return true;
    } catch (err) {
      console.error('FCM send error:', err);
      return false;
    }
  }
}
