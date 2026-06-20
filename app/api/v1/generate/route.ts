import { NextRequest, NextResponse } from 'next/server';
import { store, GeminiKey, User } from '@/lib/store';
import { getValidAccessToken } from '@/lib/google';

type PoolItem = {
  id: string;
  name: string;
  isOauth: boolean;
  source: GeminiKey | User;
  requestsUsed: number;
  status: string;
  cooldownUntil: number | null;
};

export async function POST(req: NextRequest) {
  const start = Date.now();
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized. Gateway API Key required in Bearer token.' }, { status: 401 });
  }
  
  const token = authHeader.split(' ')[1];
  const client = store.clients.find((c) => c.apiKey === token);
  
  if (!client) {
    return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
  }

  // Rate Limiting
  const windowStart = Date.now() - 60000;
  const clientReqsInWindow = store.logs.filter(
    (l) => l.clientId === client.id && l.timestamp > windowStart
  ).length;

  if (clientReqsInWindow >= client.rateLimit) {
    store.logRequest({
      timestamp: Date.now(),
      clientId: client.id,
      clientName: client.name,
      geminiKeyId: null,
      geminiKeyName: null,
      status: 429,
      latencyMs: Date.now() - start,
      error: 'Gateway Rate limit exceeded',
    });
    return NextResponse.json({ error: 'Gateway Rate limit exceeded for your client.' }, { status: 429 });
  }

  const now = Date.now();
  const poolKeys: PoolItem[] = [
    ...store.geminiKeys.map(k => ({
      id: k.id,
      name: k.name,
      isOauth: false,
      source: k,
      requestsUsed: k.requestsUsed,
      status: k.status,
      cooldownUntil: k.cooldownUntil
    })),
    ...store.users.map(u => ({
      id: u.id,
      name: `User: ${u.email}`,
      isOauth: true,
      source: u,
      requestsUsed: u.requestsUsed,
      status: u.status,
      cooldownUntil: u.cooldownUntil
    }))
  ];

  const availableKeys = poolKeys.filter((k) => {
    if (k.status !== 'active' && k.status !== 'error') {
      if (k.cooldownUntil && k.cooldownUntil > now) {
         return false;
      }
    }
    return true;
  });

  if (availableKeys.length === 0) {
    store.logRequest({
      timestamp: Date.now(),
      clientId: client.id,
      clientName: client.name,
      geminiKeyId: null,
      geminiKeyName: null,
      status: 503,
      latencyMs: Date.now() - start,
      error: 'Upstream key pool exhausted (All keys rate-limited or error)',
    });
    return NextResponse.json({ error: 'Gateway Service Unavailable: Upstream pool exhausted' }, { status: 503 });
  }

  availableKeys.sort((a, b) => a.requestsUsed - b.requestsUsed);
  const selectedItem = availableKeys[0];

  try {
    const body = await req.json();
    
    // Hardcoded to flash for testing. In prod we could parse URL params or body.
    const model = body.model || 'gemini-1.5-flash';
    let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    let authHeaderValue = '';

    if (selectedItem.isOauth) {
      const user = selectedItem.source as User;
      const accessToken = await getValidAccessToken(user);
      if (!accessToken) {
        user.status = 'error';
        return NextResponse.json({ error: 'Gateway Internal Error: Unable to refresh token for pooled user' }, { status: 500 });
      }
      authHeaderValue = `Bearer ${accessToken}`;
    } else {
      const geminiKey = selectedItem.source as GeminiKey;
      geminiUrl += `?key=${geminiKey.key}`;
    }
    
    const upstreamRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(authHeaderValue ? { 'Authorization': authHeaderValue } : {})
      },
      body: JSON.stringify(body),
    });

    const latency = Date.now() - start;
    const data = await upstreamRes.json();
    
    selectedItem.source.requestsUsed++;
    selectedItem.source.lastUsedAt = Date.now();

    if (upstreamRes.status === 429) {
      selectedItem.source.status = 'rate_limited';
      selectedItem.source.cooldownUntil = Date.now() + 60000;
    } else if (upstreamRes.status === 400 || upstreamRes.status === 401 || upstreamRes.status === 403) {
      selectedItem.source.status = 'error';
    } else if (upstreamRes.status === 200) {
      selectedItem.source.status = 'active';
    }

    client.requestsUsed++;

    store.logRequest({
      timestamp: Date.now(),
      clientId: client.id,
      clientName: client.name,
      geminiKeyId: selectedItem.id,
      geminiKeyName: selectedItem.name,
      status: upstreamRes.status,
      latencyMs: latency,
      error: upstreamRes.ok ? undefined : data.error?.message || 'Upstream Error',
    });

    return NextResponse.json(data, { status: upstreamRes.status });

  } catch (err: any) {
    selectedItem.source.status = 'error';
    store.logRequest({
      timestamp: Date.now(),
      clientId: client.id,
      clientName: client.name,
      geminiKeyId: selectedItem.id,
      geminiKeyName: selectedItem.name,
      status: 500,
      latencyMs: Date.now() - start,
      error: err.message,
    });
    return NextResponse.json({ error: 'Gateway Internal Error', details: err.message }, { status: 500 });
  }
}
