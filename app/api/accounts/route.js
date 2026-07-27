import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import bcrypt from 'bcryptjs';

function getTokenFromReq(request) {
  const { verifyToken } = require('@/lib/auth');
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
  if (match) return verifyToken(match[1]);
  return null;
}

// GET: Danh sách tài khoản (admin only)
export async function GET(request) {
  const token = getTokenFromReq(request);
  if (!token || token.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = await getDb();
  const accounts = await db.all('SELECT id, username, full_name, role, is_active, created_at, last_login FROM accounts ORDER BY id');
  return NextResponse.json({ accounts });
}

// POST: Tạo tài khoản mới (admin only)
export async function POST(request) {
  try {
    const token = getTokenFromReq(request);
    if (!token || token.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { username, password, fullName, role } = await request.json();
    if (!username || !password) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Mật khẩu ít nhất 6 ký tự' }, { status: 400 });

    const db = await getDb();
    const existing = await db.get('SELECT id FROM accounts WHERE username = ?', username);
    if (existing) return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 409 });

    const hash = bcrypt.hashSync(password, 10);
    const result = await db.run(`
      INSERT INTO accounts (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)
    `, username, hash, fullName || username, role || 'staff');

    return NextResponse.json({ success: true, id: result.lastInsertRowid }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}

// PUT: Cập nhật tài khoản (admin hoặc chính mình)
export async function PUT(request) {
  try {
    const token = getTokenFromReq(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, fullName, password, oldPassword, role, isActive } = await request.json();
    const db = await getDb();
    const account = await db.get('SELECT * FROM accounts WHERE id = ?', id);
    if (!account) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });

    // Chỉ admin được sửa tất cả, staff chỉ sửa chính mình
    if (token.role !== 'admin' && token.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = {};
    if (fullName) updates.full_name = fullName;
    if (token.role === 'admin' && role) updates.role = role;
    if (token.role === 'admin' && isActive !== undefined) updates.is_active = isActive ? 1 : 0;

    // Đổi mật khẩu
    if (password) {
      if (token.role !== 'admin') {
        // Staff phải nhập mật khẩu cũ
        if (!oldPassword || !bcrypt.compareSync(oldPassword, account.password_hash)) {
          return NextResponse.json({ error: 'Mật khẩu cũ không đúng' }, { status: 400 });
        }
      }
      if (password.length < 6) return NextResponse.json({ error: 'Mật khẩu ít nhất 6 ký tự' }, { status: 400 });
      updates.password_hash = bcrypt.hashSync(password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Không có thông tin để cập nhật' }, { status: 400 });
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.run(`UPDATE accounts SET ${setClauses} WHERE id = ?`, ...Object.values(updates), id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}
