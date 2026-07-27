import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { paymentConfig as fallbackConfig } from '@/lib/paymentConfig';

export async function GET(request) {
  try {
    const db = await getDb();
    const rows = await db.all("SELECT key, value FROM settings WHERE key LIKE 'bank_%' OR key LIKE 'payment_%'");
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);

    const config = {
      bankId: settings.bank_id || fallbackConfig.bankId,
      accountNo: settings.bank_account || fallbackConfig.accountNo,
      accountName: settings.bank_name || fallbackConfig.accountName,
      fee: parseInt(settings.payment_fee || fallbackConfig.fee),
      descriptionPrefix: settings.payment_desc || fallbackConfig.descriptionPrefix,
    };

    return NextResponse.json(config);
  } catch (err) {
    console.error('[Public Config GET]', err);
    // Return fallback if DB fails
    return NextResponse.json(fallbackConfig);
  }
}
