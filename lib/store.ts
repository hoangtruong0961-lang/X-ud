export type User = {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: number;
  status: 'active' | 'exhausted' | 'rate_limited' | 'error';
  requestsUsed: number;
  lastUsedAt: number | null;
  cooldownUntil: number | null;
};

export type GeminiKey = {
  id: string;
  name: string;
  key: string;
  status: 'active' | 'exhausted' | 'rate_limited' | 'error';
  requestsUsed: number;
  lastUsedAt: number | null;
  cooldownUntil: number | null;
  provider: 'gemini';
};

export type ClientApp = {
  id: string;
  name: string;
  apiKey: string;
  requestsUsed: number;
  rateLimit: number; // RPM
};

export type RequestLog = {
  id: string;
  timestamp: number;
  clientId: string;
  clientName: string;
  geminiKeyId: string | null;
  geminiKeyName: string | null;
  status: number;
  latencyMs: number;
  error?: string;
};

class GatewayStore {
  public geminiKeys: GeminiKey[] = [];
  public clients: ClientApp[] = [];
  public logs: RequestLog[] = [];
  public users: User[] = [];

  constructor() {
    this.clients.push({
      id: crypto.randomUUID(),
      name: 'VietTruyen - Prod',
      apiKey: 'vt_prod_' + crypto.randomUUID().slice(0, 8),
      requestsUsed: 0,
      rateLimit: 60,
    });
    this.clients.push({
      id: crypto.randomUUID(),
      name: 'Test Client',
      apiKey: 'test_' + crypto.randomUUID().slice(0, 8),
      requestsUsed: 0,
      rateLimit: 10,
    });

    // Add a default system key from environment if present (for quick testing)
    if (process.env.GEMINI_API_KEY) {
      this.geminiKeys.push({
        id: crypto.randomUUID(),
        name: 'Default Environment Key',
        key: process.env.GEMINI_API_KEY,
        status: 'active',
        requestsUsed: 0,
        lastUsedAt: null,
        cooldownUntil: null,
        provider: 'gemini',
      });
    }
  }

  public logRequest(log: Omit<RequestLog, 'id'>) {
    this.logs.unshift({ ...log, id: crypto.randomUUID() });
    if (this.logs.length > 1000) {
      this.logs.pop();
    }
  }

  public getMetrics() {
    const totalRequests = this.logs.length;
    const errors = this.logs.filter((l) => l.status >= 400).length;
    const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;
    const avgLatency =
      totalRequests > 0
        ? this.logs.reduce((acc, l) => acc + l.latencyMs, 0) / totalRequests
        : 0;

    const now = Date.now();
    const thirtyMinsAgo = now - 30 * 60 * 1000;
    const recentLogs = this.logs.filter((l) => l.timestamp >= thirtyMinsAgo);
    
    const grouped: Record<string, number> = {};
    for (const log of recentLogs) {
      const minute = new Date(log.timestamp).toISOString().slice(11, 16);
      grouped[minute] = (grouped[minute] || 0) + 1;
    }

    const chartData = Object.keys(grouped)
        .sort()
        .map((time) => ({ time, requests: grouped[time] }));

    return { totalRequests, errorRate, avgLatency, chartData };
  }
}

const globalForStore = globalThis as unknown as { store: GatewayStore };
export const store = globalForStore.store || new GatewayStore();
if (process.env.NODE_ENV !== 'production') globalForStore.store = store;
