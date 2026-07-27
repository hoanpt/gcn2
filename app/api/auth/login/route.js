import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { signToken } from '@/lib/auth';
import { startBackupScheduler } from '@/lib/backup';

export const runtime = 'nodejs';

// Khởi động backup scheduler khi server start lần đầu
let _schedulerInit = false;
if (!_schedulerInit) {
  _schedulerInit = true;
  // Delay để đảm bảo DB đã sẵn sàng
  setTimeout(() => startBackupScheduler(), 3000);
}

export async function POST(request) {
  try {
    console.log('[Login] Starting request');
    const { username, password } = await request.json();
    console.log('[Login] JSON parsed');

    if (!username || !password) {
      return NextResponse.json({ error: 'Thiếu thông tin đăng nhập' }, { status: 400 });
    }

    const db = await getDb();
    console.log('[Login] DB connection retrieved');
    
    const account = await db.get('SELECT * FROM accounts WHERE username = ? AND is_active = 1', username);
    console.log('[Login] Account fetched', account?.username);

    if (!account) {
      return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' }, { status: 401 });
    }

    const valid = bcrypt.compareSync(password, account.password_hash);
    console.log('[Login] Password compared:', valid);
    if (!valid) {
      return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' }, { status: 401 });
    }

    // Cập nhật last_login
    try {
      await db.exec(`UPDATE accounts SET last_login = datetime("now","localtime") WHERE id = ${account.id}`);
    } catch(e) {
      console.error('[Login] DB update error', e);
    }
    console.log('[Login] Last login updated');

    const token = signToken({
      id: account.id,
      username: account.username,
      fullName: account.full_name,
      role: account.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: account.id,
        username: account.username,
        fullName: account.full_name,
        role: account.role,
      },
    });

    response.cookies.set('cdc_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[Auth/Login]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
