import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
// Permanently bound Google Sheet, Drive Folder & Apps Script Web App (shared across all devices)
const SPREADSHEET_ID = '13QVZGyyxjqNvAXD1X0r8KmWIyk3iW53bJF0u0LUphI8';
const DRIVE_FOLDER_ID = '1kbLUdllMc-WhXXGlXg9UA_2i87SyS4aB';
const DEFAULT_GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbyR7aScL9X2AFyhwh-c9G_r_q8gVkiEjSKPzkyTrxHPOo27MSYNMd4Rxub8jrTwLlISrA/exec';
const DEFAULT_YEAR_NAME = '2569/70';

const SHEET_HEADERS = {
  ProductionYears: ['year_id', 'year_name', 'created_at', 'is_active'],
  Cranes: ['crane_id', 'crane_name', 'sort_order', 'is_active', 'created_at'],
  CraneRecords: [
    'record_id',
    'year_id',
    'crane_id',
    'install_status',
    'install_date',
    'install_technician',
    'install_image_1_id',
    'install_image_1_url',
    'install_image_2_id',
    'install_image_2_url',
    'install_note',
    'removal_status',
    'removal_date',
    'removal_technician',
    'removal_image_1_id',
    'removal_image_1_url',
    'removal_image_2_id',
    'removal_image_2_url',
    'removal_note',
    'updated_at',
    'updated_by',
  ],
  ActivityLogs: [
    'log_id',
    'year_id',
    'crane_id',
    'action_type',
    'old_data',
    'new_data',
    'created_at',
    'updated_by',
  ],
} as const;

const INITIAL_CRANES: readonly string[] = [
  'เครนขามสะแกแสง1',
  'เครนขามสะแกแสง2',
  'เครนคูเมือง',
  'เครนซับใหญ่',
  'เครนวังโพธิ์(บ้านเหลื่อม1)',
  'เครนดอนทอง(บ้านเหลื่อม2)',
  'เครนดอนหัน',
  'เครนทำนบ 2',
  'เครนทำนบพัฒนา',
  'เครนนาเสียว',
  'เครนเนินสง่า',
  'เครนบ้านเขว้า1',
  'เครนบ้านเขว้า2',
  'เครนบ้านเขว้า3',
  'เครนบ้านค่าย 1',
  'เครนบ้านค่าย 2',
  'เครนบ้านเดื่อ',
  'เครนบ้านปรางค์',
  'เครนภูแลนคา',
  'เครนรกฟ้า',
  'เครนวังชมภู',
  'เครนสระสี่เหลี่ยม 1',
  'เครนสระสี่เหลี่ยม2',
  'เครนหนองโคบาล',
  'เครนหนองบัวแดง',
  'เครนหนองบัวระเหว',
  'เครนหนองบัวระเหว2',
  'เครนหนองบัวลาย',
  'เครนหนองพลวง',
  'เครนหนองแวง',
  'เครนหนองหอย',
  'เครนหนองหัวฟาน',
  'เครนห้วยต้อน',
  'เครนห้วยไร่',
  'เครนหินกอง',
  'เครนท่าหินโงม',
  'เครนเนินสง่า 2',
  'เครนโนนตาลเสี้ยน',
  'เครนบ้านเขว้า 4',
  'เครนภูแลนคา 2',
  'เครนสงแดง',
  'เครนหนองม่วงช่างพิมพ์',
  'เครนจัตุรัส',
];

interface AuthContext {
  mode: 'google_oauth' | 'apps_script';
  bearerToken?: string;
  gasUrl?: string;
  gasSecret?: string;
  userEmail?: string;
}

class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let cachedServiceToken: { token: string; expiresAt: number } | null = null;

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getServiceAccountAccessToken(): Promise<string | null> {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!rawJson) return null;

  if (cachedServiceToken && Date.now() < cachedServiceToken.expiresAt - 60_000) {
    return cachedServiceToken.token;
  }

  let creds: { client_email: string; private_key: string; token_uri?: string };
  try {
    creds = JSON.parse(rawJson);
  } catch {
    throw new HttpError(500, 'รูปแบบ GOOGLE_SERVICE_ACCOUNT_JSON ไม่ถูกต้อง');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: creds.client_email,
      scope:
        'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
      aud: creds.token_uri || 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  );

  const signingInput = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = base64UrlEncode(signer.sign(creds.private_key));
  const jwt = `${signingInput}.${signature}`;

  const tokenRes = await fetch(creds.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const tokenData: any = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new HttpError(
      500,
      tokenData?.error_description || 'ไม่สามารถรับ Access Token จาก Service Account ได้'
    );
  }

  cachedServiceToken = {
    token: tokenData.access_token,
    expiresAt: Date.now() + (Number(tokenData.expires_in) || 3600) * 1000,
  };
  return cachedServiceToken.token;
}

async function getAuthContext(req: Request): Promise<AuthContext> {
  const userEmail = (req.headers['x-user-email'] as string | undefined)?.trim() || 'system';
  const gasUrl = process.env.GAS_WEB_APP_URL || DEFAULT_GAS_WEB_APP_URL;

  if (gasUrl) {
    return {
      mode: 'apps_script',
      gasUrl,
      gasSecret: process.env.GAS_API_SECRET || '',
      userEmail,
    };
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const token = await getServiceAccountAccessToken();
    if (token) {
      return {
        mode: 'google_oauth',
        bearerToken: token,
        userEmail,
      };
    }
  }

  throw new HttpError(
    503,
    'ยังไม่ได้กำหนดค่า GAS_WEB_APP_URL หรือ GOOGLE_SERVICE_ACCOUNT_JSON ที่ฝั่งเซิร์ฟเวอร์สำหรับเชื่อมต่อ Google Sheets และ Google Drive',
    'SERVER_CONFIG_MISSING'
  );
}

async function callAppsScript(
  ctx: AuthContext,
  action: string,
  payload: Record<string, unknown> = {}
): Promise<any> {
  if (!ctx.gasUrl) {
    throw new HttpError(400, 'ไม่พบ URL ของ Google Apps Script');
  }
  const res = await fetch(ctx.gasUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      ...payload,
      action,
      secret: ctx.gasSecret || '',
      updatedBy: ctx.userEmail || 'user',
    }),
    redirect: 'follow',
  });

  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(
      502,
      'Google Apps Script ตอบกลับไม่ใช่ JSON (ตรวจสอบสิทธิ์ Deploy "Who has access: Anyone" และ URL Web App)'
    );
  }
  if (!parsed.ok) {
    throw new HttpError(400, parsed.error || 'เกิดข้อผิดพลาดจาก Google Apps Script');
  }
  return parsed.data;
}

async function googleFetch(url: string, token: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!res.ok) {
    const apiMsg = data?.error?.message || `Google API Error (${res.status})`;
    const isScopeErr =
      res.status === 403 &&
      (String(apiMsg).toLowerCase().includes('insufficient') ||
        String(apiMsg).toLowerCase().includes('scope') ||
        String(apiMsg).toLowerCase().includes('permission'));
    throw new HttpError(res.status, apiMsg, isScopeErr ? 'INSUFFICIENT_SCOPE' : undefined);
  }
  return data;
}

function rowsToObjects<T extends Record<string, any>>(values: any[][] | undefined): T[] {
  if (!values || values.length < 2) return [];
  const headers = values[0].map((h) => String(h).trim());
  const out: T[] = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.every((cell) => cell === '' || cell === undefined || cell === null)) {
      continue;
    }
    const obj: Record<string, any> = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      let val = row[j] !== undefined ? row[j] : '';
      if (key === 'is_active') {
        val = String(val).toLowerCase() !== 'false';
      } else if (key === 'sort_order') {
        val = Number(val) || 0;
      }
      obj[key] = val;
    }
    out.push(obj as T);
  }
  return out;
}

function normalizeDateYmd(value: unknown): string {
  const s = String(value || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function normalizeDataset(raw: any) {
  return {
    spreadsheetTitle: raw.spreadsheetTitle || 'CCTV Crane Database',
    years: (raw.years || []).map((y: any) => ({
      year_id: String(y.year_id || ''),
      year_name: String(y.year_name || ''),
      created_at: String(y.created_at || ''),
      is_active: String(y.is_active).toLowerCase() !== 'false',
    })),
    cranes: (raw.cranes || []).map((c: any) => ({
      crane_id: String(c.crane_id || ''),
      crane_name: String(c.crane_name || ''),
      sort_order: Number(c.sort_order) || 0,
      is_active: String(c.is_active).toLowerCase() !== 'false',
      created_at: String(c.created_at || ''),
    })),
    records: (raw.records || []).map((r: any) => ({
      record_id: String(r.record_id || ''),
      year_id: String(r.year_id || ''),
      crane_id: String(r.crane_id || ''),
      install_status: r.install_status === 'INSTALLED' ? 'INSTALLED' : 'NOT_INSTALLED',
      install_date: normalizeDateYmd(r.install_date),
      install_technician: String(r.install_technician || ''),
      install_image_1_id: String(r.install_image_1_id || ''),
      install_image_1_url: String(r.install_image_1_url || ''),
      install_image_2_id: String(r.install_image_2_id || ''),
      install_image_2_url: String(r.install_image_2_url || ''),
      install_note: String(r.install_note || ''),
      removal_status: r.removal_status === 'REMOVED' ? 'REMOVED' : 'NOT_REMOVED',
      removal_date: normalizeDateYmd(r.removal_date),
      removal_technician: String(r.removal_technician || ''),
      removal_image_1_id: String(r.removal_image_1_id || ''),
      removal_image_1_url: String(r.removal_image_1_url || ''),
      removal_image_2_id: String(r.removal_image_2_id || ''),
      removal_image_2_url: String(r.removal_image_2_url || ''),
      removal_note: String(r.removal_note || ''),
      updated_at: String(r.updated_at || ''),
      updated_by: String(r.updated_by || ''),
    })),
    logs: (raw.logs || []).map((l: any) => ({
      log_id: String(l.log_id || ''),
      year_id: String(l.year_id || ''),
      crane_id: String(l.crane_id || ''),
      action_type: String(l.action_type || ''),
      old_data: String(l.old_data || ''),
      new_data: String(l.new_data || ''),
      created_at: String(l.created_at || ''),
      updated_by: String(l.updated_by || ''),
    })),
    fetchedAt: raw.fetchedAt || new Date().toISOString(),
  };
}

async function oauthGetSpreadsheetMeta(token: string) {
  return googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=properties.title,sheets.properties`,
    token
  );
}

async function oauthEnsureSheetsAndHeaders(token: string) {
  const meta = await oauthGetSpreadsheetMeta(token);
  const existingTitles = new Set<string>(
    (meta.sheets || []).map((s: any) => s.properties?.title as string)
  );

  const missingTabs = (Object.keys(SHEET_HEADERS) as Array<keyof typeof SHEET_HEADERS>).filter(
    (tab) => !existingTitles.has(tab)
  );

  if (missingTabs.length > 0) {
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: missingTabs.map((title) => ({
            addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } },
          })),
        }),
      }
    );
  }

  // Ensure headers exist on row 1 of each tab
  const rangesQuery = Object.keys(SHEET_HEADERS)
    .map((t) => `ranges=${encodeURIComponent(`${t}!A1:Z1`)}`)
    .join('&');
  const headerCheck = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${rangesQuery}`,
    token
  );

  const headerUpdates: Array<{ range: string; values: string[][] }> = [];
  (headerCheck.valueRanges || []).forEach((vr: any, idx: number) => {
    const tabName = Object.keys(SHEET_HEADERS)[idx] as keyof typeof SHEET_HEADERS;
    const row1 = vr.values?.[0] || [];
    if (row1.length === 0) {
      headerUpdates.push({
        range: `${tabName}!A1`,
        values: [[...SHEET_HEADERS[tabName]]],
      });
    }
  });

  if (headerUpdates.length > 0) {
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valueInputOption: 'RAW',
          data: headerUpdates,
        }),
      }
    );
  }

  return meta.properties?.title || 'CCTV Crane Database';
}

async function oauthFetchAllData(token: string) {
  const meta = await oauthGetSpreadsheetMeta(token);
  const existingTitles = new Set<string>(
    (meta.sheets || []).map((s: any) => s.properties?.title as string)
  );

  const tabsToRead = (Object.keys(SHEET_HEADERS) as Array<keyof typeof SHEET_HEADERS>).filter(
    (tab) => existingTitles.has(tab)
  );

  if (tabsToRead.length === 0) {
    return normalizeDataset({
      spreadsheetTitle: meta.properties?.title,
      years: [],
      cranes: [],
      records: [],
      logs: [],
    });
  }

  const rangesQuery = tabsToRead
    .map((t) => `ranges=${encodeURIComponent(`${t}!A1:Z5000`)}`)
    .join('&');
  const batchRes = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${rangesQuery}`,
    token
  );

  const mapByTab: Record<string, any[][]> = {};
  tabsToRead.forEach((tab, idx) => {
    mapByTab[tab] = batchRes.valueRanges?.[idx]?.values || [];
  });

  return normalizeDataset({
    spreadsheetTitle: meta.properties?.title,
    years: rowsToObjects(mapByTab.ProductionYears),
    cranes: rowsToObjects(mapByTab.Cranes),
    records: rowsToObjects(mapByTab.CraneRecords),
    logs: rowsToObjects(mapByTab.ActivityLogs),
    fetchedAt: new Date().toISOString(),
  });
}

async function oauthAppendRows(token: string, sheetName: string, rows: any[][]) {
  if (rows.length === 0) return;
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      `${sheetName}!A1`
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows }),
    }
  );
}

async function oauthUpdateRange(token: string, range: string, values: any[][]) {
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}?valueInputOption=USER_ENTERED`,
    token,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    }
  );
}

async function oauthAppendLog(
  token: string,
  yearId: string,
  craneId: string,
  actionType: string,
  oldData: unknown,
  newData: unknown,
  updatedBy: string
) {
  await oauthAppendRows(token, 'ActivityLogs', [
    [
      crypto.randomUUID(),
      yearId || '',
      craneId || '',
      actionType,
      JSON.stringify(oldData || {}),
      JSON.stringify(newData || {}),
      new Date().toISOString(),
      updatedBy || 'user',
    ],
  ]);
}

async function oauthBootstrap(token: string, updatedBy: string) {
  await oauthEnsureSheetsAndHeaders(token);
  const current = await oauthFetchAllData(token);
  const now = new Date().toISOString();

  let defaultYearId = current.years[0]?.year_id || '';
  if (current.years.length === 0) {
    defaultYearId = crypto.randomUUID();
    await oauthAppendRows(token, 'ProductionYears', [
      [defaultYearId, DEFAULT_YEAR_NAME, now, true],
    ]);
  }

  let craneIds: string[] = [];
  if (current.cranes.length === 0) {
    const craneRows = INITIAL_CRANES.map((name, idx) => {
      const cid = crypto.randomUUID();
      craneIds.push(cid);
      return [cid, name, idx + 1, true, now];
    });
    await oauthAppendRows(token, 'Cranes', craneRows);
  } else {
    craneIds = current.cranes.filter((c: any) => c.is_active).map((c: any) => c.crane_id);
  }

  const existingPairSet = new Set(
    current.records.map((r: any) => `${r.year_id}::${r.crane_id}`)
  );
  const missingRecordRows = craneIds
    .filter((cid) => !existingPairSet.has(`${defaultYearId}::${cid}`))
    .map((cid) => [
      crypto.randomUUID(),
      defaultYearId,
      cid,
      'NOT_INSTALLED',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'NOT_REMOVED',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      now,
      updatedBy || 'system',
    ]);

  if (missingRecordRows.length > 0) {
    await oauthAppendRows(token, 'CraneRecords', missingRecordRows);
  }

  return oauthFetchAllData(token);
}

async function oauthFindRowByColumnValue(
  token: string,
  sheetName: string,
  colLetter: string,
  targetValue: string
): Promise<number> {
  const res = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      `${sheetName}!${colLetter}1:${colLetter}5000`
    )}`,
    token
  );
  const vals: any[][] = res.values || [];
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i]?.[0] || '') === String(targetValue)) {
      return i + 1;
    }
  }
  return -1;
}

async function oauthFindOrCreateRecordRow(
  token: string,
  yearId: string,
  craneId: string,
  updatedBy: string
): Promise<{ rowNumber: number; rowValues: any[] }> {
  const res = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      'CraneRecords!A1:U5000'
    )}`,
    token
  );
  const vals: any[][] = res.values || [];
  for (let i = 1; i < vals.length; i++) {
    const row = vals[i] || [];
    if (String(row[1] || '') === yearId && String(row[2] || '') === craneId) {
      return { rowNumber: i + 1, rowValues: row };
    }
  }

  const now = new Date().toISOString();
  const newRow = [
    crypto.randomUUID(),
    yearId,
    craneId,
    'NOT_INSTALLED',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'NOT_REMOVED',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    now,
    updatedBy || 'user',
  ];
  await oauthAppendRows(token, 'CraneRecords', [newRow]);
  const newRowNumber = Math.max(vals.length + 1, 2);
  return { rowNumber: newRowNumber, rowValues: newRow };
}

async function oauthUploadImageToDrive(
  token: string,
  fileName: string,
  mimeType: string,
  base64Data: string
) {
  const boundary = `cctv_upload_${crypto.randomUUID().replace(/-/g, '')}`;
  const metadata = JSON.stringify({
    name: fileName,
    parents: [DRIVE_FOLDER_ID],
  });

  const binaryBuffer = Buffer.from(base64Data, 'base64');
  const part1 = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    'utf-8'
  );
  const part3 = Buffer.from(`\r\n--${boundary}--`, 'utf-8');
  const bodyBuffer = Buffer.concat([part1, binaryBuffer, part3]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(bodyBuffer.length),
      },
      body: bodyBuffer,
    }
  );

  const data: any = await res.json();
  if (!res.ok) {
    throw new HttpError(
      res.status,
      data?.error?.message || `อัปโหลดรูปไปยัง Google Drive ไม่สำเร็จ (${res.status})`
    );
  }

  return {
    fileId: data.id,
    fileName: data.name,
    fileUrl: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

function asyncHandler(fn: (req: Request, res: Response) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Health & public non-secret configuration
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.get('/api/config', (_req, res) => {
    const gasUrl = process.env.GAS_WEB_APP_URL || DEFAULT_GAS_WEB_APP_URL;
    const connectionType = gasUrl
      ? 'apps_script'
      : process.env.GOOGLE_SERVICE_ACCOUNT_JSON
        ? 'service_account'
        : 'unconfigured';

    res.json({
      spreadsheetId: SPREADSHEET_ID,
      driveFolderId: DRIVE_FOLDER_ID,
      defaultYearName: DEFAULT_YEAR_NAME,
      connected: connectionType !== 'unconfigured',
      connectionType,
    });
  });

  // Initialize / verify Google Sheets tabs + 43 initial cranes + 2569/70
  app.post(
    '/api/sheets/bootstrap',
    asyncHandler(async (req, res) => {
      const ctx = await getAuthContext(req);
      if (ctx.mode === 'apps_script') {
        const data = await callAppsScript(ctx, 'bootstrap');
        res.json(normalizeDataset(data));
        return;
      }
      const data = await oauthBootstrap(ctx.bearerToken!, ctx.userEmail || 'user');
      res.json(data);
    })
  );

  // Read live data from Google Sheets
  app.get(
    '/api/data',
    asyncHandler(async (req, res) => {
      const ctx = await getAuthContext(req);
      if (ctx.mode === 'apps_script') {
        const data = await callAppsScript(ctx, 'getData');
        res.json(normalizeDataset(data));
        return;
      }
      const data = await oauthFetchAllData(ctx.bearerToken!);
      res.json(data);
    })
  );

  // Production Years CRUD
  app.post(
    '/api/years',
    asyncHandler(async (req, res) => {
      const ctx = await getAuthContext(req);
      const yearName = String(req.body?.yearName || '').trim();
      if (!yearName) throw new HttpError(400, 'กรุณาระบุชื่อปีการผลิต');

      if (ctx.mode === 'apps_script') {
        const result = await callAppsScript(ctx, 'createYear', { yearName });
        res.json(result);
        return;
      }

      const token = ctx.bearerToken!;
      await oauthEnsureSheetsAndHeaders(token);
      const current = await oauthFetchAllData(token);
      if (current.years.some((y: any) => y.is_active && y.year_name === yearName)) {
        throw new HttpError(400, `ปีการผลิต "${yearName}" มีอยู่ในระบบแล้ว`);
      }

      const now = new Date().toISOString();
      const yearId = crypto.randomUUID();
      await oauthAppendRows(token, 'ProductionYears', [[yearId, yearName, now, true]]);

      const activeCranes = current.cranes.filter((c: any) => c.is_active);
      if (activeCranes.length > 0) {
        const recordRows = activeCranes.map((c: any) => [
          crypto.randomUUID(),
          yearId,
          c.crane_id,
          'NOT_INSTALLED',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'NOT_REMOVED',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          now,
          ctx.userEmail || 'user',
        ]);
        await oauthAppendRows(token, 'CraneRecords', recordRows);
      }

      await oauthAppendLog(
        token,
        yearId,
        '',
        'CREATE_YEAR',
        {},
        { year_name: yearName },
        ctx.userEmail || 'user'
      );
      res.json({ year_id: yearId });
    })
  );

  app.put(
    '/api/years/:yearId',
    asyncHandler(async (req, res) => {
      const ctx = await getAuthContext(req);
      const { yearId } = req.params;
      const yearName = String(req.body?.yearName || '').trim();
      if (!yearName) throw new HttpError(400, 'กรุณาระบุชื่อปีการผลิต');

      if (ctx.mode === 'apps_script') {
        const result = await callAppsScript(ctx, 'updateYear', { yearId, yearName });
        res.json(result);
        return;
      }

      const token = ctx.bearerToken!;
      const rowNum = await oauthFindRowByColumnValue(token, 'ProductionYears', 'A', yearId);
      if (rowNum === -1) throw new HttpError(404, 'ไม่พบปีการผลิตที่ต้องการแก้ไข');
      await oauthUpdateRange(token, `ProductionYears!B${rowNum}`, [[yearName]]);
      await oauthAppendLog(
        token,
        yearId,
        '',
        'UPDATE_YEAR',
        {},
        { year_name: yearName },
        ctx.userEmail || 'user'
      );
      res.json({ updated: true });
    })
  );

  app.delete(
    '/api/years/:yearId',
    asyncHandler(async (req, res) => {
      const ctx = await getAuthContext(req);
      const { yearId } = req.params;

      if (ctx.mode === 'apps_script') {
        const result = await callAppsScript(ctx, 'deleteYear', { yearId });
        res.json(result);
        return;
      }

      const token = ctx.bearerToken!;
      const rowNum = await oauthFindRowByColumnValue(token, 'ProductionYears', 'A', yearId);
      if (rowNum === -1) throw new HttpError(404, 'ไม่พบปีการผลิตที่ต้องการลบ');
      await oauthUpdateRange(token, `ProductionYears!D${rowNum}`, [[false]]);
      await oauthAppendLog(
        token,
        yearId,
        '',
        'DELETE_YEAR',
        { is_active: true },
        { is_active: false },
        ctx.userEmail || 'user'
      );
      res.json({ deleted: true });
    })
  );

  // Cranes CRUD
  app.post(
    '/api/cranes',
    asyncHandler(async (req, res) => {
      const ctx = await getAuthContext(req);
      const craneName = String(req.body?.craneName || '').trim();
      if (!craneName) throw new HttpError(400, 'กรุณาระบุชื่อเครน');

      if (ctx.mode === 'apps_script') {
        const result = await callAppsScript(ctx, 'createCrane', { craneName });
        res.json(result);
        return;
      }

      const token = ctx.bearerToken!;
      const current = await oauthFetchAllData(token);
      if (current.cranes.some((c: any) => c.is_active && c.crane_name === craneName)) {
        throw new HttpError(400, `เครน "${craneName}" มีอยู่ในระบบแล้ว`);
      }

      const maxSort = current.cranes.reduce(
        (max: number, c: any) => Math.max(max, Number(c.sort_order) || 0),
        0
      );
      const craneId = crypto.randomUUID();
      const now = new Date().toISOString();
      await oauthAppendRows(token, 'Cranes', [[craneId, craneName, maxSort + 1, true, now]]);

      const activeYears = current.years.filter((y: any) => y.is_active);
      if (activeYears.length > 0) {
        const rows = activeYears.map((y: any) => [
          crypto.randomUUID(),
          y.year_id,
          craneId,
          'NOT_INSTALLED',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'NOT_REMOVED',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          now,
          ctx.userEmail || 'user',
        ]);
        await oauthAppendRows(token, 'CraneRecords', rows);
      }

      await oauthAppendLog(
        token,
        '',
        craneId,
        'CREATE_CRANE',
        {},
        { crane_name: craneName },
        ctx.userEmail || 'user'
      );
      res.json({ crane_id: craneId });
    })
  );

  app.put(
    '/api/cranes/:craneId',
    asyncHandler(async (req, res) => {
      const ctx = await getAuthContext(req);
      const { craneId } = req.params;
      const craneName = String(req.body?.craneName || '').trim();
      if (!craneName) throw new HttpError(400, 'กรุณาระบุชื่อเครน');

      if (ctx.mode === 'apps_script') {
        const result = await callAppsScript(ctx, 'updateCrane', {
          craneId,
          craneName,
          sortOrder: req.body?.sortOrder,
        });
        res.json(result);
        return;
      }

      const token = ctx.bearerToken!;
      const rowNum = await oauthFindRowByColumnValue(token, 'Cranes', 'A', craneId);
      if (rowNum === -1) throw new HttpError(404, 'ไม่พบเครนที่ต้องการแก้ไข');
      await oauthUpdateRange(token, `Cranes!B${rowNum}`, [[craneName]]);
      if (req.body?.sortOrder !== undefined) {
        await oauthUpdateRange(token, `Cranes!C${rowNum}`, [[Number(req.body.sortOrder)]]);
      }
      await oauthAppendLog(
        token,
        '',
        craneId,
        'UPDATE_CRANE',
        {},
        { crane_name: craneName },
        ctx.userEmail || 'user'
      );
      res.json({ updated: true });
    })
  );

  app.delete(
    '/api/cranes/:craneId',
    asyncHandler(async (req, res) => {
      const ctx = await getAuthContext(req);
      const { craneId } = req.params;

      if (ctx.mode === 'apps_script') {
        const result = await callAppsScript(ctx, 'deleteCrane', { craneId });
        res.json(result);
        return;
      }

      const token = ctx.bearerToken!;
      const rowNum = await oauthFindRowByColumnValue(token, 'Cranes', 'A', craneId);
      if (rowNum === -1) throw new HttpError(404, 'ไม่พบเครนที่ต้องการลบ');
      // Soft-archive is_active = false to preserve historical records & activity logs
      await oauthUpdateRange(token, `Cranes!D${rowNum}`, [[false]]);
      await oauthAppendLog(
        token,
        '',
        craneId,
        'ARCHIVE_CRANE',
        { is_active: true },
        { is_active: false },
        ctx.userEmail || 'user'
      );
      res.json({ deleted: true });
    })
  );

  app.post(
    '/api/cranes/reorder',
    asyncHandler(async (req, res) => {
      const ctx = await getAuthContext(req);
      const orders = req.body?.orders as Record<string, number>;
      if (!orders || typeof orders !== 'object') {
        throw new HttpError(400, 'รูปแบบข้อมูลเรียงลำดับไม่ถูกต้อง');
      }

      if (ctx.mode === 'apps_script') {
        const result = await callAppsScript(ctx, 'reorderCranes', { orders });
        res.json(result);
        return;
      }

      const token = ctx.bearerToken!;
      const resValues = await googleFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
          'Cranes!A1:C5000'
        )}`,
        token
      );
      const vals: any[][] = resValues.values || [];
      const dataUpdates: Array<{ range: string; values: number[][] }> = [];
      for (let i = 1; i < vals.length; i++) {
        const cid = String(vals[i]?.[0] || '');
        if (orders[cid] !== undefined) {
          dataUpdates.push({
            range: `Cranes!C${i + 1}`,
            values: [[Number(orders[cid])]],
          });
        }
      }
      if (dataUpdates.length > 0) {
        await googleFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
          token,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ valueInputOption: 'RAW', data: dataUpdates }),
          }
        );
      }
      res.json({ updated: true });
    })
  );

  // Google Drive Upload (Private - no public sharing!)
  app.post(
    '/api/drive/upload',
    asyncHandler(async (req, res) => {
      const ctx = await getAuthContext(req);
      const { fileName, mimeType, base64Data } = req.body || {};
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!base64Data || !mimeType || !allowedTypes.includes(String(mimeType).toLowerCase())) {
        throw new HttpError(400, 'รองรับเฉพาะไฟล์รูปภาพ JPG, JPEG, PNG และ WEBP เท่านั้น');
      }

      const cleanName = String(fileName || `cctv_${Date.now()}.jpg`).replace(/[^\w.\-()\u0E00-\u0E7F]/g, '_');

      if (ctx.mode === 'apps_script') {
        const result = await callAppsScript(ctx, 'uploadImage', {
          fileName: cleanName,
          mimeType,
          base64Data,
        });
        res.json(result);
        return;
      }

      const result = await oauthUploadImageToDrive(
        ctx.bearerToken!,
        cleanName,
        mimeType,
        base64Data
      );
      res.json(result);
    })
  );

  // Secure Private Drive Image Stream Proxy
  app.get(
    '/api/drive/image/:fileId',
    asyncHandler(async (req, res) => {
      const ctx = await getAuthContext(req);
      const { fileId } = req.params;
      if (!fileId || !/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
        throw new HttpError(400, 'รหัสไฟล์ Google Drive ไม่ถูกต้อง');
      }

      if (ctx.mode === 'apps_script') {
        const url = new URL(ctx.gasUrl!);
        url.searchParams.set('action', 'getImage');
        url.searchParams.set('fileId', fileId);
        if (ctx.gasSecret) url.searchParams.set('secret', ctx.gasSecret);
        const gasRes = await fetch(url.toString(), { redirect: 'follow' });
        const gasText = await gasRes.text();
        let data: any = {};
        try {
          data = JSON.parse(gasText);
        } catch {
          throw new HttpError(502, 'Google Apps Script ตอบกลับรูปภาพไม่ถูกต้อง');
        }
        if (!data.ok || !data.base64) {
          throw new HttpError(404, data.error || 'ไม่สามารถดึงรูปภาพจาก Google Drive ได้');
        }
        const imgBuf = Buffer.from(data.base64, 'base64');
        res.setHeader('Content-Type', data.mimeType || 'image/jpeg');
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.send(imgBuf);
        return;
      }

      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
        {
          headers: { Authorization: `Bearer ${ctx.bearerToken}` },
        }
      );

      if (!driveRes.ok) {
        throw new HttpError(
          driveRes.status,
          `ไม่สามารถดึงรูปภาพจาก Google Drive (${driveRes.status})`
        );
      }

      const contentType = driveRes.headers.get('content-type') || 'image/jpeg';
      const arrayBuf = await driveRes.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.send(Buffer.from(arrayBuf));
    })
  );

  // Isolated Installation Save (NEVER alters removal columns L..S)
  app.put(
    '/api/records/install',
    asyncHandler(async (req, res) => {
      const ctx = await getAuthContext(req);
      const {
        yearId,
        craneId,
        installStatus,
        installDate,
        installTechnician,
        image1Id,
        image1Url,
        image2Id,
        image2Url,
        installNote,
      } = req.body || {};

      if (!yearId || !craneId) {
        throw new HttpError(400, 'กรุณาระบุปีการผลิตและรหัสเครน');
      }
      if (installStatus === 'INSTALLED') {
        if (!installDate || !String(installTechnician || '').trim()) {
          throw new HttpError(400, 'กรุณาระบุวันที่ติดตั้งและชื่อช่างผู้ติดตั้ง');
        }
        if (!image1Id || !image2Id) {
          throw new HttpError(400, 'กรุณาแนบรูปภาพประกอบการติดตั้งให้ครบทั้ง 2 รูป');
        }
      }

      if (ctx.mode === 'apps_script') {
        const result = await callAppsScript(ctx, 'saveInstall', {
          yearId,
          craneId,
          installStatus: installStatus || 'INSTALLED',
          installDate: installDate || '',
          installTechnician: String(installTechnician || '').trim(),
          image1Id: image1Id || '',
          image1Url: image1Url || '',
          image2Id: image2Id || '',
          image2Url: image2Url || '',
          installNote: String(installNote || '').trim(),
        });
        res.json(result);
        return;
      }

      const token = ctx.bearerToken!;
      const { rowNumber, rowValues } = await oauthFindOrCreateRecordRow(
        token,
        yearId,
        craneId,
        ctx.userEmail || 'user'
      );

      const oldInstall = {
        install_status: rowValues[3] || 'NOT_INSTALLED',
        install_date: rowValues[4] || '',
        install_technician: rowValues[5] || '',
        install_image_1_id: rowValues[6] || '',
        install_image_2_id: rowValues[8] || '',
        install_note: rowValues[10] || '',
      };

      const now = new Date().toISOString();
      const newStatus = installStatus === 'NOT_INSTALLED' ? 'NOT_INSTALLED' : 'INSTALLED';
      await oauthUpdateRange(token, `CraneRecords!D${rowNumber}:K${rowNumber}`, [
        [
          newStatus,
          installDate || '',
          String(installTechnician || '').trim(),
          image1Id || '',
          image1Url || '',
          image2Id || '',
          image2Url || '',
          String(installNote || '').trim(),
        ],
      ]);
      await oauthUpdateRange(token, `CraneRecords!T${rowNumber}:U${rowNumber}`, [
        [now, ctx.userEmail || 'user'],
      ]);

      await oauthAppendLog(
        token,
        yearId,
        craneId,
        'UPDATE_INSTALL',
        oldInstall,
        {
          install_status: newStatus,
          install_date: installDate || '',
          install_technician: String(installTechnician || '').trim(),
          install_image_1_id: image1Id || '',
          install_image_2_id: image2Id || '',
          install_note: String(installNote || '').trim(),
        },
        ctx.userEmail || 'user'
      );

      res.json({ saved: true, updatedAt: now });
    })
  );

  // Isolated Removal Save (NEVER alters installation columns D..K)
  app.put(
    '/api/records/removal',
    asyncHandler(async (req, res) => {
      const ctx = await getAuthContext(req);
      const {
        yearId,
        craneId,
        removalStatus,
        removalDate,
        removalTechnician,
        image1Id,
        image1Url,
        image2Id,
        image2Url,
        removalNote,
      } = req.body || {};

      if (!yearId || !craneId) {
        throw new HttpError(400, 'กรุณาระบุปีการผลิตและรหัสเครน');
      }
      if (removalStatus === 'REMOVED') {
        if (!removalDate || !String(removalTechnician || '').trim()) {
          throw new HttpError(400, 'กรุณาระบุวันที่รื้อถอนและชื่อช่างผู้รื้อถอน');
        }
        if (!image1Id || !image2Id) {
          throw new HttpError(400, 'กรุณาแนบรูปภาพประกอบการรื้อถอนให้ครบทั้ง 2 รูป');
        }
      }

      if (ctx.mode === 'apps_script') {
        const result = await callAppsScript(ctx, 'saveRemoval', {
          yearId,
          craneId,
          removalStatus: removalStatus || 'REMOVED',
          removalDate: removalDate || '',
          removalTechnician: String(removalTechnician || '').trim(),
          image1Id: image1Id || '',
          image1Url: image1Url || '',
          image2Id: image2Id || '',
          image2Url: image2Url || '',
          removalNote: String(removalNote || '').trim(),
        });
        res.json(result);
        return;
      }

      const token = ctx.bearerToken!;
      const { rowNumber, rowValues } = await oauthFindOrCreateRecordRow(
        token,
        yearId,
        craneId,
        ctx.userEmail || 'user'
      );

      const oldRemoval = {
        removal_status: rowValues[11] || 'NOT_REMOVED',
        removal_date: rowValues[12] || '',
        removal_technician: rowValues[13] || '',
        removal_image_1_id: rowValues[14] || '',
        removal_image_2_id: rowValues[16] || '',
        removal_note: rowValues[18] || '',
      };

      const now = new Date().toISOString();
      const newStatus = removalStatus === 'NOT_REMOVED' ? 'NOT_REMOVED' : 'REMOVED';
      await oauthUpdateRange(token, `CraneRecords!L${rowNumber}:S${rowNumber}`, [
        [
          newStatus,
          removalDate || '',
          String(removalTechnician || '').trim(),
          image1Id || '',
          image1Url || '',
          image2Id || '',
          image2Url || '',
          String(removalNote || '').trim(),
        ],
      ]);
      await oauthUpdateRange(token, `CraneRecords!T${rowNumber}:U${rowNumber}`, [
        [now, ctx.userEmail || 'user'],
      ]);

      await oauthAppendLog(
        token,
        yearId,
        craneId,
        'UPDATE_REMOVAL',
        oldRemoval,
        {
          removal_status: newStatus,
          removal_date: removalDate || '',
          removal_technician: String(removalTechnician || '').trim(),
          removal_image_1_id: image1Id || '',
          removal_image_2_id: image2Id || '',
          removal_note: String(removalNote || '').trim(),
        },
        ctx.userEmail || 'user'
      );

      res.json({ saved: true, updatedAt: now });
    })
  );

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof HttpError ? err.status : 500;
    res.status(status).json({
      error: err?.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
      code: err?.code,
    });
  });

  // Vite dev middleware or production static build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CCTV Crane Management server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
