export interface ChatbotDialogSession {
  flowId: string;
  step: string;
  payload?: Record<string, any>;
  expiresAt?: number;
}

export class SessionStateManager {
  private sessions = new Map<string, ChatbotDialogSession>();

  private getKey(jid: string): string {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].trim();
  }

  set(jid: string, session: ChatbotDialogSession) {
    const key = this.getKey(jid);
    if (!key) return;
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
