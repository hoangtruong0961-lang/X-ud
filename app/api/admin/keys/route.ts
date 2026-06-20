import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET() {
  const poolKeys = [
    ...store.geminiKeys.map(k => ({
      id: k.id,
      name: k.name,
      isOauth: false,
      source: k,
      requestsUsed: k.requestsUsed,
      status: k.status,
      cooldownUntil: k.cooldownUntil,
      key: k.key
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
  return NextResponse.json(poolKeys);
}

export async function POST(req: Request) {
  const body = await req.json();
  const newKey = {
    id: crypto.randomUUID(),
    name: body.name,
    key: body.key,
    status: 'active' as const,
    requestsUsed: 0,
    lastUsedAt: null,
    cooldownUntil: null,
    provider: 'gemini' as const,
  };
  store.geminiKeys.push(newKey);
  return NextResponse.json(newKey);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  store.geminiKeys = store.geminiKeys.filter((k) => k.id !== id);
  return NextResponse.json({ success: true });
}
