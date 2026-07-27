import { NextResponse } from 'next/server';
import { downloadFileFromDrive } from '@/lib/drive';
import getDb from '@/lib/db';

function getTokenFromReq(request) {
  const { verifyToken } = require('@/lib/auth');
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
  if (match) return verifyToken(match[1]);
  return null;
}

export async function GET(request, { params }) {
  try {
    const token = getTokenFromReq(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('name') || 'file';

    const stream = await downloadFileFromDrive(fileId);
    if (!stream) {
      return NextResponse.json({ error: 'Không thể tải file từ Drive' }, { status: 404 });
    }

    // Pipe stream to response
    const reader = stream;
    const chunks = [];
    for await (const chunk of reader) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('[Drive Download]', err);
    return NextResponse.json({ error: 'Lỗi tải file' }, { status: 500 });
  }
}
