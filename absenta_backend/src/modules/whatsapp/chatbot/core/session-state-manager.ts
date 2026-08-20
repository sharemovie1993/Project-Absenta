export interface ChatbotDialogSession {
  flowId: string;
  step: string;
  payload?: Record<string, any>;
  expiresAt?: number;
}

export class SessionStateManager {
  private sessions = new Map<string, ChatbotDialogSession>();
  private readonly maxCapacity = 5000;

  constructor() {
    // 🧹 Periodic cleanup every 5 minutes to prune expired sessions
    if (typeof setInterval !== 'undefined') {
      const interval = setInterval(() => {
        const now = Date.now();
        for (const [key, session] of this.sessions.entries()) {
          if (session.expiresAt && now > session.expiresAt) {
            this.sessions.delete(key);
          }
        }
      }, 5 * 60 * 1000);
      if (interval && typeof interval.unref === 'function') {
        interval.unref();
      }
    }
  }

  private getKey(jid: string): string {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].trim();
  }

  set(jid: string, session: ChatbotDialogSession) {
    const key = this.getKey(jid);
    if (!key) return;
    if (this.sessions.size >= this.maxCapacity) {
      const firstKey = this.sessions.keys().next().value;
      if (firstKey !== undefined) this.sessions.delete(firstKey);
    }
    const expiresAt = session.expiresAt ?? (Date.now() + 5 * 60 * 1000); // Default 5 menit
    this.sessions.set(key, { ...session, expiresAt });
  }

  get(jid: string): ChatbotDialogSession | null {
    const key = this.getKey(jid);
    if (!key) return null;
    const session = this.sessions.get(key);
    if (!session) return null;

    if (session.expiresAt && Date.now() > session.expiresAt) {
      this.sessions.delete(key);
      return null;
    }
    return session;
  }

  delete(jid: string) {
    const key = this.getKey(jid);
    if (!key) return;
    this.sessions.delete(key);
  }

  isCancellation(text: string): boolean {
    const upper = (text || '').trim().toUpperCase();
    return upper === '0' || upper === 'BATAL' || upper === 'CANCEL' || upper === 'MENU';
  }
}

export const chatbotSessionManager = new SessionStateManager();
