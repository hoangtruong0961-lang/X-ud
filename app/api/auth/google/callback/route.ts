import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { store } from '@/lib/store';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const origin = url.origin;

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET' }, { status: 500 });
  }

  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      return NextResponse.json({ error: 'Failed to exchange code', details: err }, { status: tokenResponse.status });
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, id_token, expires_in } = tokens;

    // Decode ID token to get user info (basic JWT decoding without verification since it came directly from Google via https)
    const payloadBase64 = id_token.split('.')[1];
    const payloadBuffer = Buffer.from(payloadBase64, 'base64');
    const idTokenPayload = JSON.parse(payloadBuffer.toString('utf8'));

    const googleUserId = idTokenPayload.sub;
    const email = idTokenPayload.email;
    const name = idTokenPayload.name || '';

    // Find or create user in our mocked DB (store)
    let user = store.users.find(u => u.id === googleUserId);
    if (!user) {
      user = {
        id: googleUserId,
        email,
        name,
        accessToken: access_token,
        refreshToken: refresh_token || null,
        tokenExpiresAt: Date.now() + (expires_in * 1000),
        status: 'active',
        requestsUsed: 0,
        lastUsedAt: null,
        cooldownUntil: null,
      };
      store.users.push(user);
    } else {
      user.accessToken = access_token;
      if (refresh_token) {
        user.refreshToken = refresh_token;
      }
      user.tokenExpiresAt = Date.now() + (expires_in * 1000);
      user.name = name;
      user.email = email;
    }

    // Set cookie session (just storing user ID for now to keep it simple)
    const cookieStore = await cookies();
    cookieStore.set('session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return NextResponse.redirect(new URL('/', origin));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json({ error: 'Internal server error during OAuth callback' }, { status: 500 });
  }
}
