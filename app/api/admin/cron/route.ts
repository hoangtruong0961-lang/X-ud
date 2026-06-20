import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getValidAccessToken } from '@/lib/google';

export async function GET() {
  const now = Date.now();
  let refreshedCount = 0;
  let failedCount = 0;

  for (const user of store.users) {
    // Check if token is expiring within the next 15 minutes (or already expired)
    if (user.tokenExpiresAt < now + 15 * 60 * 1000) {
      if (user.refreshToken) {
        try {
          const accessToken = await getValidAccessToken(user);
          if (accessToken) {
            user.status = 'active';
            refreshedCount++;
          } else {
            user.status = 'error';
            failedCount++;
          }
        } catch (error) {
          user.status = 'error';
          failedCount++;
        }
      } else {
        // No refresh token available, mark as error if expired
        if (user.tokenExpiresAt < now) {
          user.status = 'error';
          failedCount++;
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `Background sweep completed. Refreshed: ${refreshedCount}, Failed/Expired: ${failedCount}, Total Users: ${store.users.length}`
  });
}
