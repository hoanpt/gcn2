import { NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({
      user: {
        id:       payload.id,
        username: payload.username,
        fullName: payload.fullName,
        role:     payload.role,
      },
    });
  } catch (err) {
    console.error('[Auth/Me]', err);
    return NextResponse.json({ error: 'Loi he thong' }, { status: 500 });
  }
}
