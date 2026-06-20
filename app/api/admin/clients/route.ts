import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET() {
  return NextResponse.json(store.clients);
}

export async function POST(req: Request) {
  const body = await req.json();
  const newClient = {
    id: crypto.randomUUID(),
    name: body.name,
    apiKey: `client_${crypto.randomUUID().slice(0, 16)}`,
    requestsUsed: 0,
    rateLimit: body.rateLimit || 60,
  };
  store.clients.push(newClient);
  return NextResponse.json(newClient);
}
