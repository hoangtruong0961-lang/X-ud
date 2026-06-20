import { store, User } from './store';

export async function getValidAccessToken(user: User): Promise<string | null> {
  // Add a 5 minute buffer to expiration check
  const now = Date.now() + 5 * 60 * 1000;
  
  if (user.tokenExpiresAt > now) {
    return user.accessToken;
  }

  if (!user.refreshToken) {
    return null; // Cannot refresh
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Missing Google Client ID or Secret for token refresh');
      return null;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: user.refreshToken,
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh token', await response.text());
      return null;
    }

    const data = await response.json();
    user.accessToken = data.access_token;
    if (data.refresh_token) {
      user.refreshToken = data.refresh_token;
    }
    user.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    
    return user.accessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}
