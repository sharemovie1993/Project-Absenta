import { getRedisConnection } from './redis/redisClient';
import { getNodeId } from './nodeId';

export type LeaderRole = 'api' | 'wa-worker';

const LEADER_KEY_PREFIX = 'cluster:leader:';
const LEADER_TTL_SECONDS = 30;
const LEADER_RENEW_INTERVAL_MS = 10_000;

interface RoleLeaderState {
  role: LeaderRole;
  lockKey: string;
  holderValue: string;
  isLeader: boolean;
  timer: NodeJS.Timeout | null;
  onBecomeLeaderCallbacks: Array<() => void | Promise<void>>;
  onLoseLeaderCallbacks: Array<() => void | Promise<void>>;
}

/**
 * ClusterLeaderService
 * Mengelola pemilihan Leader lintas server fisik (Multi-Node Horizontal Scaling)
 * berbasis Redis Distributed Lock dengan Auto-Renew Heartbeat & Auto-Failover.
 *
 * - Pada Single Server: Instance 0 langsung menjadi Leader 100% seperti biasa.
 * - Pada Multi-Server (Node 1, Node 2, dst.): Hanya 1 Instance 0 di seluruh cluster
 *   yang memegang peran Leader ('api' untuk Cron/Heartbeat/License, 'wa-worker' untuk Baileys).
 * - Jika Server Fisik 1 mati, Server Fisik 2 otomatis mengambil alih kepemimpinan dalam <30 detik.
 */
class ClusterLeaderService {
  private states = new Map<LeaderRole, RoleLeaderState>();

  private isLocalMasterCandidate(): boolean {
    const instanceId = process.env.NODE_APP_INSTANCE;
    if (instanceId !== undefined && instanceId !== '' && instanceId !== '0') {
      return false;
    }
    return true;
  }

  private getOrCreateState(role: LeaderRole): RoleLeaderState {
    let st = this.states.get(role);
    if (!st) {
      const nodeId = getNodeId();
      const instanceId = process.env.NODE_APP_INSTANCE ?? '0';
      st = {
        role,
        lockKey: `${LEADER_KEY_PREFIX}${role}`,
        holderValue: `${nodeId}:w${instanceId}:pid${process.pid}`,
        isLeader: false,
        timer: null,
        onBecomeLeaderCallbacks: [],
        onLoseLeaderCallbacks: [],
      };
      this.states.set(role, st);
    }
    return st;
  }

  /**
   * Mencoba mengakuisisi atau memperpanjang kepemimpinan cluster di Redis.
   */
  public async tryAcquireOrRenew(role: LeaderRole): Promise<boolean> {
    if (!this.isLocalMasterCandidate()) {
      return false;
    }

    const st = this.getOrCreateState(role);
    const redis = getRedisConnection();

    // Fallback: jika Redis belum siap, izinkan local master berjalan
    if (!redis) {
      if (!st.isLeader) {
        st.isLeader = true;
        this.fireBecomeLeader(st);
      }
      return true;
    }

    try {
      // Lua script: Jika key belum ada ATAU nilainya adalah holderValue kita sendiri -> SET & EXPIRE
      const lua = `
        local cur = redis.call("GET", KEYS[1])
        if not cur or cur == ARGV[1] then
          redis.call("SET", KEYS[1], ARGV[1], "EX", tonumber(ARGV[2]))
          return 1
        end
        return 0
      `;
      const res = await (redis as any).eval(lua, 1, st.lockKey, st.holderValue, String(LEADER_TTL_SECONDS));
      const won = Number(res) === 1;

      if (won && !st.isLeader) {
        st.isLeader = true;
        console.log(`[ClusterLeader:${role}] 👑 Node "${st.holderValue}" terpilih sebagai CLUSTER LEADER.`);
        this.fireBecomeLeader(st);
      } else if (!won && st.isLeader) {
        st.isLeader = false;
        console.warn(`[ClusterLeader:${role}] ⚠️ Node "${st.holderValue}" melepas status Leader (diambil alih node lain).`);
        this.fireLoseLeader(st);
      }

      return won;
    } catch {
      // Jika terjadi gangguan jaringan Redis sesaat, pertahankan status terakhir
      return st.isLeader;
    }
  }

  /**
   * Memulai loop pemilihan & perpanjangan otomatis setiap 10 detik.
   * Mengembalikan status apakah node ini langsung menjadi leader saat inisialisasi.
   */
  public async startElectionLoop(
    role: LeaderRole,
    callbacks?: {
      onBecomeLeader?: () => void | Promise<void>;
      onLoseLeader?: () => void | Promise<void>;
    }
  ): Promise<boolean> {
    const st = this.getOrCreateState(role);
    if (callbacks?.onBecomeLeader) {
      st.onBecomeLeaderCallbacks.push(callbacks.onBecomeLeader);
    }
    if (callbacks?.onLoseLeader) {
      st.onLoseLeaderCallbacks.push(callbacks.onLoseLeader);
    }

    if (!this.isLocalMasterCandidate()) {
      return false;
    }

    const initialWon = await this.tryAcquireOrRenew(role);

    if (!st.timer) {
      st.timer = setInterval(() => {
        void this.tryAcquireOrRenew(role);
      }, LEADER_RENEW_INTERVAL_MS);
      if (typeof st.timer.unref === 'function') {
        st.timer.unref();
      }
    }

    return initialWon;
  }

  public isLeader(role: LeaderRole): boolean {
    if (!this.isLocalMasterCandidate()) return false;
    const st = this.states.get(role);
    return st ? st.isLeader : false;
  }

  public getLeaderHolderId(role: LeaderRole): string {
    return this.getOrCreateState(role).holderValue;
  }

  public async getCurrentClusterLeader(role: LeaderRole): Promise<string | null> {
    try {
      const redis = getRedisConnection();
      if (!redis) return this.isLeader(role) ? this.getLeaderHolderId(role) : null;
      const val = await redis.get(`${LEADER_KEY_PREFIX}${role}`);
      return val || null;
    } catch {
      return null;
    }
  }

  /**
   * Melepas semua lock kepemimpinan secara instan saat graceful shutdown (SIGINT/SIGTERM)
   * agar node standby di server fisik lain dapat langsung mengambil alih tanpa menunggu 30 detik.
   */
  public async releaseAll(): Promise<void> {
    const redis = getRedisConnection();
    for (const st of this.states.values()) {
      if (st.timer) {
        clearInterval(st.timer);
        st.timer = null;
      }
      if (st.isLeader && redis) {
        try {
          const lua = `
            if redis.call("GET", KEYS[1]) == ARGV[1] then
              return redis.call("DEL", KEYS[1])
            else
              return 0
            end
          `;
          await (redis as any).eval(lua, 1, st.lockKey, st.holderValue);
        } catch {}
      }
      st.isLeader = false;
    }
  }

  private fireBecomeLeader(st: RoleLeaderState): void {
    for (const cb of st.onBecomeLeaderCallbacks) {
      Promise.resolve()
        .then(() => cb())
        .catch((err) => console.error(`[ClusterLeader:${st.role}] onBecomeLeader callback error:`, err?.message || err));
    }
  }

  private fireLoseLeader(st: RoleLeaderState): void {
    for (const cb of st.onLoseLeaderCallbacks) {
      Promise.resolve()
        .then(() => cb())
        .catch((err) => console.error(`[ClusterLeader:${st.role}] onLoseLeader callback error:`, err?.message || err));
    }
  }
}

export const clusterLeaderService = new ClusterLeaderService();
