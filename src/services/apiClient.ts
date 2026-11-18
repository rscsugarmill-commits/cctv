import { DEPLOYED_GAS_WEB_APP_URL } from '../constants/initialData';
import type { SheetsDataset } from '../types/cctv';

type TransportMode = 'unknown' | 'backend_api' | 'direct_gas';

let transportMode: TransportMode = 'unknown';

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

function normalizeDataset(raw: any): SheetsDataset {
  return {
    spreadsheetTitle: raw?.spreadsheetTitle || 'การติดตั้งและรื้อถอนกล้องวงจรปิด',
    years: (raw?.years || []).map((y: any) => ({
      year_id: String(y.year_id || ''),
      year_name: String(y.year_name || ''),
      created_at: String(y.created_at || ''),
      is_active: String(y.is_active).toLowerCase() !== 'false',
    })),
    cranes: (raw?.cranes || []).map((c: any) => ({
      crane_id: String(c.crane_id || ''),
      crane_name: String(c.crane_name || ''),
      sort_order: Number(c.sort_order) || 0,
      is_active: String(c.is_active).toLowerCase() !== 'false',
      created_at: String(c.created_at || ''),
    })),
    records: (raw?.records || []).map((r: any) => ({
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
    logs: (raw?.logs || []).map((l: any) => ({
      log_id: String(l.log_id || ''),
      year_id: String(l.year_id || ''),
      crane_id: String(l.crane_id || ''),
      action_type: String(l.action_type || ''),
      old_data: String(l.old_data || ''),
      new_data: String(l.new_data || ''),
      created_at: String(l.created_at || ''),
      updated_by: String(l.updated_by || ''),
    })),
    fetchedAt: raw?.fetchedAt || new Date().toISOString(),
  };
}

async function detectTransport(): Promise<'backend_api' | 'direct_gas'> {
  if (transportMode !== 'unknown') return transportMode;

  try {
    const res = await fetch('/api/config', { cache: 'no-store' });
    const ct = res.headers.get('content-type') || '';
    if (res.ok && ct.includes('application/json')) {
      const data = await res.json();
      if (data && data.connected === true) {
        transportMode = 'backend_api';
        return transportMode;
      }
    }
  } catch {
    // Express backend unavailable (e.g., static / shared preview hosting)
  }

  transportMode = 'direct_gas';
  return transportMode;
}

async function callDirectGas<T>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(DEPLOYED_GAS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      ...payload,
      action,
      updatedBy: 'web-user',
    }),
    redirect: 'follow',
  });

  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('ไม่สามารถอ่านข้อมูลตอบกลับจาก Google Apps Script ได้');
  }
  if (!parsed.ok) {
    throw new Error(parsed.error || 'เกิดข้อผิดพลาดจาก Google Apps Script');
  }
  return parsed.data as T;
}

async function backendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(path, {
    ...init,
    headers,
  });
  const text = await res.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('เซิร์ฟเวอร์ตอบกลับไม่ใช่ JSON');
    }
  }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`) as Error & {
      code?: string;
      status?: number;
    };
    err.code = data?.code;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const apiClient = {
  ensureReady: async () => {
    await detectTransport();
  },

  bootstrapSheets: async (): Promise<SheetsDataset> => {
    const mode = await detectTransport();
    if (mode === 'backend_api') {
      return backendRequest<SheetsDataset>('/api/sheets/bootstrap', { method: 'POST' });
    }
    const data = await callDirectGas('bootstrap');
    return normalizeDataset(data);
  },

  fetchAllData: async (): Promise<SheetsDataset> => {
    const mode = await detectTransport();
    if (mode === 'backend_api') {
      return backendRequest<SheetsDataset>('/api/data');
    }
    const data = await callDirectGas('getData');
    return normalizeDataset(data);
  },

  createYear: async (yearName: string) => {
    const mode = await detectTransport();
    if (mode === 'backend_api') {
      return backendRequest<{ year_id: string }>('/api/years', {
        method: 'POST',
        body: JSON.stringify({ yearName }),
      });
    }
    return callDirectGas<{ year_id: string }>('createYear', { yearName });
  },

  updateYear: async (yearId: string, yearName: string) => {
    const mode = await detectTransport();
    if (mode === 'backend_api') {
      return backendRequest<{ updated: boolean }>(`/api/years/${encodeURIComponent(yearId)}`, {
        method: 'PUT',
        body: JSON.stringify({ yearName }),
      });
    }
    return callDirectGas<{ updated: boolean }>('updateYear', { yearId, yearName });
  },

  deleteYear: async (yearId: string) => {
    const mode = await detectTransport();
    if (mode === 'backend_api') {
      return backendRequest<{ deleted: boolean }>(`/api/years/${encodeURIComponent(yearId)}`, {
        method: 'DELETE',
      });
    }
    return callDirectGas<{ deleted: boolean }>('deleteYear', { yearId });
  },

  createCrane: async (craneName: string) => {
    const mode = await detectTransport();
    if (mode === 'backend_api') {
      return backendRequest<{ crane_id: string }>('/api/cranes', {
        method: 'POST',
        body: JSON.stringify({ craneName }),
      });
    }
    return callDirectGas<{ crane_id: string }>('createCrane', { craneName });
  },

  updateCrane: async (craneId: string, craneName: string, sortOrder?: number) => {
    const mode = await detectTransport();
    if (mode === 'backend_api') {
      return backendRequest<{ updated: boolean }>(
        `/api/cranes/${encodeURIComponent(craneId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ craneName, sortOrder }),
        }
      );
    }
    return callDirectGas<{ updated: boolean }>('updateCrane', {
      craneId,
      craneName,
      sortOrder,
    });
  },

  deleteCrane: async (craneId: string) => {
    const mode = await detectTransport();
    if (mode === 'backend_api') {
      return backendRequest<{ deleted: boolean }>(
        `/api/cranes/${encodeURIComponent(craneId)}`,
        {
          method: 'DELETE',
        }
      );
    }
    return callDirectGas<{ deleted: boolean }>('deleteCrane', { craneId });
  },

  reorderCranes: async (orders: Record<string, number>) => {
    const mode = await detectTransport();
    if (mode === 'backend_api') {
      return backendRequest<{ updated: boolean }>('/api/cranes/reorder', {
        method: 'POST',
        body: JSON.stringify({ orders }),
      });
    }
    return callDirectGas<{ updated: boolean }>('reorderCranes', { orders });
  },

  uploadImageToDrive: async (payload: {
    fileName: string;
    mimeType: string;
    base64Data: string;
  }) => {
    const mode = await detectTransport();
    if (mode === 'backend_api') {
      return backendRequest<{ fileId: string; fileName: string; fileUrl: string }>(
        '/api/drive/upload',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
    }
    return callDirectGas<{ fileId: string; fileName: string; fileUrl: string }>(
      'uploadImage',
      payload
    );
  },

  saveInstallRecord: async (payload: {
    yearId: string;
    craneId: string;
    installStatus: 'INSTALLED' | 'NOT_INSTALLED';
    installDate: string;
    installTechnician: string;
    image1Id: string;
    image1Url: string;
    image2Id: string;
    image2Url: string;
    installNote: string;
  }) => {
    const mode = await detectTransport();
    if (mode === 'backend_api') {
      return backendRequest<{ saved: boolean; updatedAt: string }>('/api/records/install', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    }
    return callDirectGas<{ saved: boolean; updatedAt: string }>('saveInstall', payload);
  },

  saveRemovalRecord: async (payload: {
    yearId: string;
    craneId: string;
    removalStatus: 'REMOVED' | 'NOT_REMOVED';
    removalDate: string;
    removalTechnician: string;
    image1Id: string;
    image1Url: string;
    image2Id: string;
    image2Url: string;
    removalNote: string;
  }) => {
    const mode = await detectTransport();
    if (mode === 'backend_api') {
      return backendRequest<{ saved: boolean; updatedAt: string }>('/api/records/removal', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    }
    return callDirectGas<{ saved: boolean; updatedAt: string }>('saveRemoval', payload);
  },

  fetchDriveImageBlobUrl: async (fileId: string): Promise<string> => {
    const mode = await detectTransport();
    if (mode === 'backend_api') {
      const res = await fetch(`/api/drive/image/${encodeURIComponent(fileId)}`);
      if (!res.ok) {
        throw new Error(`โหลดรูปภาพไม่สำเร็จ (${res.status})`);
      }
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }

    const url = new URL(DEPLOYED_GAS_WEB_APP_URL);
    url.searchParams.set('action', 'getImage');
    url.searchParams.set('fileId', fileId);
    const gasRes = await fetch(url.toString(), { redirect: 'follow' });
    const data: any = await gasRes.json();
    if (!data.ok || !data.base64) {
      throw new Error(data.error || 'ไม่สามารถดึงรูปภาพจาก Google Drive ได้');
    }
    const byteChars = atob(data.base64);
    const byteNums = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteNums], { type: data.mimeType || 'image/jpeg' });
    return URL.createObjectURL(blob);
  },
};
