import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { findFileOnDisk } from '@/lib/upload';
import { getTokenFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain', '.zip': 'application/zip',
  };
  return map[ext] || 'application/octet-stream';
}

export async function GET(request, { params }) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const filename = resolvedParams?.filename;
    if (!filename) return NextResponse.json({ error: 'Thieu ten file' }, { status: 400 });

    const safeFilename = path.basename(decodeURIComponent(filename));
    const diskPath = findFileOnDisk(safeFilename);
    if (!diskPath) return NextResponse.json({ error: 'File khong ton tai' }, { status: 404 });

    const fileBuffer = fs.readFileSync(diskPath);
    const mimeType = getMimeType(safeFilename);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${safeFilename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[File Serve]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}