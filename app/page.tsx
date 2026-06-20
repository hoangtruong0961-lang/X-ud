'use client';

import { useEffect, useState } from 'react';
import { Shield, Key, Users, Activity, List, Plus, Trash2, HeartPulse, Zap, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'clients' | 'logs'>('overview');

  const [metrics, setMetrics] = useState<any>(null);
  const [geminiKeys, setGeminiKeys] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  
  const [newClientName, setNewClientName] = useState('');
  const [newClientRateLimit, setNewClientRateLimit] = useState(60);

  const [loading, setLoading] = useState(true);

  const [now, setNow] = useState<number>(0);

  const fetchMetrics = async () => {
    const res = await fetch('/api/admin/metrics');
    if (res.ok) setMetrics(await res.json());
  };

  const fetchKeys = async () => {
    const res = await fetch('/api/admin/keys');
    if (res.ok) setGeminiKeys(await res.json());
  };

  const fetchClients = async () => {
    const res = await fetch('/api/admin/clients');
    if (res.ok) setClients(await res.json());
  };

  const fetchLogs = async () => {
    const res = await fetch('/api/admin/logs');
    if (res.ok) setLogs(await res.json());
  };

  useEffect(() => {
    const initFetch = async () => {
      setNow(Date.now());
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchKeys(), fetchClients(), fetchLogs()]);
      setLoading(false);
    };
    initFetch();

    const interval = setInterval(() => {
      setNow(Date.now());
      if (activeTab === 'overview') fetchMetrics();
      if (activeTab === 'logs') fetchLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName || !newKeyValue) return;
    await fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName, key: newKeyValue })
    });
    setNewKeyName('');
    setNewKeyValue('');
    fetchKeys();
  };

  const handleDeleteKey = async (id: string) => {
    await fetch(`/api/admin/keys?id=${id}`, { method: 'DELETE' });
    fetchKeys();
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName) return;
    await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClientName, rateLimit: newClientRateLimit })
    });
    setNewClientName('');
    setNewClientRateLimit(60);
    fetchClients();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-500" />
            <h1 className="text-xl font-bold text-white tracking-tight">AI Gateway</h1>
          </div>
          
          <nav className="flex-1 px-4 space-y-2 mt-4">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              <Activity className="w-5 h-5" />
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('keys')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'keys' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              <Key className="w-5 h-5" />
              Upstream Keys
            </button>
            <button 
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'clients' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              <Users className="w-5 h-5" />
              Client Access
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'logs' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              <List className="w-5 h-5" />
              Request Logs
            </button>
          </nav>
          
          <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-2">
                <HeartPulse className="w-4 h-4 text-emerald-500" />
                SYSTEM LIVE
              </div>
              <p className="text-[10px] text-slate-500">Enterprise AI Gateway routing to Google Generative Language APIs.</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-6xl mx-auto">
            
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin text-indigo-500"><Zap className="w-8 h-8" /></div>
              </div>
            ) : (
<>
              {activeTab === 'overview' && metrics && (
                <div className="space-y-8 animate-in fade-in zoom-in duration-300">
                  <header>
                    <h2 className="text-3xl font-light text-white tracking-tight mb-2">Gateway Overview</h2>
                    <p className="text-slate-400">Holistic view of traffic and health metrics.</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                      <h3 className="text-sm font-medium text-slate-400 mb-4">Total Requests</h3>
                      <div className="text-4xl font-light text-white">{metrics.totalRequests.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                      <h3 className="text-sm font-medium text-slate-400 mb-4">Error Rate</h3>
                      <div className="text-4xl font-light text-white flex items-baseline gap-2">
                        {metrics.errorRate.toFixed(2)}%
                        {metrics.errorRate > 5 ? <AlertTriangle className="w-5 h-5 text-rose-500" /> : <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                      <h3 className="text-sm font-medium text-slate-400 mb-4">Avg Latency</h3>
                      <div className="text-4xl font-light text-white">{metrics.avgLatency.toFixed(0)} <span className="text-lg text-slate-500">ms</span></div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-white mb-6">Traffic (Requests / Min, Last 30 mins)</h3>
                    <div className="h-48 flex items-end gap-2">
                      {metrics.chartData.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">No recent traffic</div>
                      ) : (
                        metrics.chartData.map((d: any, i: number) => {
                          const max = Math.max(...metrics.chartData.map((x: any) => x.requests));
                          const height = Math.max(10, (d.requests / max) * 100);
                          return (
                            <div key={i} className="flex-1 flex flex-col justify-end group relative" style={{ height: '100%' }}>
                              <div 
                                className="bg-indigo-500 rounded-t-sm w-full transition-all group-hover:bg-indigo-400"
                                style={{ height: `${height}%` }}
                              ></div>
                              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-2 py-1 rounded text-white whitespace-nowrap z-10 transition-opacity">
                                {d.time}: {d.requests} req
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'keys' && (
                <div className="space-y-8 animate-in fade-in zoom-in duration-300">
                  <header className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-light text-white tracking-tight mb-2">Upstream API Keys</h2>
                      <p className="text-slate-400">Manage real Google Gemini API keys & contributed OAuth Quotas.</p>
                    </div>
                    <a href="/api/auth/google" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                      <Zap className="w-4 h-4" /> Contribute Quota via Google
                    </a>
                  </header>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-800/50 border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Name / Identity</th>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Usage</th>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {geminiKeys.map(k => (
                          <tr key={k.id}>
                            <td className="px-6 py-4">
                              <div className="font-medium text-white">{k.isOauth ? k.source.name : k.name}</div>
                              <div className="text-xs text-slate-500 font-mono mt-1">
                                {k.isOauth ? k.source.email : (k.key || '').substring(0, 12) + '...'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border bg-slate-800 text-slate-300 border-slate-700">
                                {k.isOauth ? 'OAuth Quota' : 'API Key'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${k.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : k.status === 'rate_limited' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                {k.status === 'active' && <CheckCircle className="w-3 h-3" />}
                                {k.status === 'rate_limited' && <AlertTriangle className="w-3 h-3" />}
                                {k.status === 'error' && <XCircle className="w-3 h-3" />}
                                {k.status}
                              </span>
                              {k.cooldownUntil && (k.cooldownUntil - now > 0) && (
                                <div className="text-[10px] text-slate-500 mt-2">
                                  Cooldown: {Math.ceil((k.cooldownUntil - now) / 1000)}s
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                              {k.requestsUsed.toLocaleString()} reqs
                            </td>
                            <td className="px-6 py-4">
                              {!k.isOauth && (
                                <button onClick={() => handleDeleteKey(k.id)} className="text-slate-500 hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-slate-800">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <form onSubmit={handleAddKey} className="p-6 bg-slate-800/20 border-t border-slate-800 flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-400 mb-2">Project / Key Name</label>
                        <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} required type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-slate-600" placeholder="e.g. Project Alpha" />
                      </div>
                      <div className="flex-[2]">
                        <label className="block text-xs font-medium text-slate-400 mb-2">Gemini API Key</label>
                        <input value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} required type="password" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-slate-600" placeholder="AIzaSy..." />
                      </div>
                      <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                        <Plus className="w-4 h-4" /> Add Key
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'clients' && (
                <div className="space-y-8 animate-in fade-in zoom-in duration-300">
                  <header>
                    <h2 className="text-3xl font-light text-white tracking-tight mb-2">Client Access</h2>
                    <p className="text-slate-400">Issue downstream API keys to your services and set their rate limits.</p>
                  </header>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-800/50 border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Client Name</th>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Gateway API Key</th>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Rate Limit</th>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Total Usage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {clients.map(c => (
                          <tr key={c.id}>
                            <td className="px-6 py-4 font-medium text-white">{c.name}</td>
                            <td className="px-6 py-4">
                              <code className="text-xs bg-slate-950 px-2.5 py-1.5 rounded-md border border-slate-800 text-emerald-400 select-all">{c.apiKey}</code>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-300">{c.rateLimit} req/min</td>
                            <td className="px-6 py-4 text-sm text-slate-300 font-mono">{c.requestsUsed.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <form onSubmit={handleAddClient} className="p-6 bg-slate-800/20 border-t border-slate-800 flex gap-4 items-end">
                      <div className="flex-[2]">
                        <label className="block text-xs font-medium text-slate-400 mb-2">Client Application Name</label>
                        <input value={newClientName} onChange={e => setNewClientName(e.target.value)} required type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-slate-600" placeholder="e.g. Website V2" />
                      </div>
                      <div className="flex-[1]">
                        <label className="block text-xs font-medium text-slate-400 mb-2">Limit (req/min)</label>
                        <input value={newClientRateLimit} onChange={e => setNewClientRateLimit(Number(e.target.value))} required type="number" min="1" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-slate-600" />
                      </div>
                      <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                        <Plus className="w-4 h-4" /> Issue Key
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-8 animate-in fade-in zoom-in duration-300">
                  <header>
                    <h2 className="text-3xl font-light text-white tracking-tight mb-2">System Logs</h2>
                    <p className="text-slate-400">Recent gateway requests and upstream routing history.</p>
                  </header>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-800/50 border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Timestamp</th>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Client</th>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Gateway Status</th>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Latency</th>
                          <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Routed Key</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {logs.slice(0, 50).map(l => (
                          <tr key={l.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                                {new Date(l.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-200">{l.clientName}</td>
                            <td className="px-6 py-4">
                              {l.status === 200 ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">200 OK</span>
                              ) : l.status === 429 ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">429 Rate Limit</span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">{l.status} ERR</span>
                              )}
                              {l.error && <div className="text-[10px] text-rose-400 mt-1 max-w-xs truncate" title={l.error}>{l.error}</div>}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-300 font-mono">{l.latencyMs}ms</td>
                            <td className="px-6 py-4 text-sm text-slate-400">{l.geminiKeyName || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {logs.length === 0 && <div className="p-12 text-center text-slate-500">No requests recorded yet.</div>}
                  </div>
                </div>
              )}
</>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
