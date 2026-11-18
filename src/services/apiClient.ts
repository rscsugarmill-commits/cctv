import type { SheetsDataset } from '../types/cctv';

export interface AuthSession {
  mode: 'google_oauth' | 'apps_script' | 'disconnected';
  accessToken?: string | null;
  gasUrl?: string;
  gasSecret?: string;
  userEmail?: string;
}

let activeSession: AuthSession = { mode: 'disconnected' };

export function setApiAuthSession(session: AuthSession) {
  activeSession = session;
}

export function getApiAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    ...extra,
  };
  if (activeSession.userEmail) {
    headers['X-User-Email'] = activeSession.userEmail;
  }
  if (activeSession.mode === 'google_oauth' && activeSession.accessToken) {
    headers['Authorization'] = `Bearer ${activeSession.accessToken}`;
  } else if (activeSession.mode === 'apps_script' && activeSession.gasUrl) {
    headers['X-GAS-URL'] = activeSession.gasUrl;
    if (activeSession.gasSecret) {
      headers['X-GAS-SECRET'] = activeSession.gasSecret;
    }
  }
  return headers;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = getApiAuthHeaders(
    init.body ? { 'Content-Type': 'application/json' } : {}
  );
  const res = await fetch(path, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
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
  getConfig: () =>
    apiRequest<{
      spreadsheetId: string;
      driveFolderId: string;
      defaultYearName: string;
      hasServerGasUrl: boolean;
    }>('/api/config'),

  getGasTemplate: async (): Promise<string> => {
    const res = await fetch('/api/gas-template');
    if (!res.ok) throw new Error('ไม่สามารถโหลดไฟล์แม่แบบ Code.gs ได้');
    return res.text();
  },

  bootstrapSheets: () => apiRequest<SheetsDataset>('/api/sheets/bootstrap', { method: 'POST' }),

  fetchAllData: () => apiRequest<SheetsDataset>('/api/data'),

  createYear: (yearName: string) =>
    apiRequest<{ year_id: string }>('/api/years', {
      method: 'POST',
      body: JSON.stringify({ yearName }),
    }),

  updateYear: (yearId: string, yearName: string) =>
    apiRequest<{ updated: boolean }>(`/api/years/${encodeURIComponent(yearId)}`, {
      method: 'PUT',
      body: JSON.stringify({ yearName }),
    }),

  deleteYear: (yearId: string) =>
    apiRequest<{ deleted: boolean }>(`/api/years/${encodeURIComponent(yearId)}`, {
      method: 'DELETE',
    }),

  createCrane: (craneName: string) =>
    apiRequest<{ crane_id: string }>('/api/cranes', {
      method: 'POST',
      body: JSON.stringify({ craneName }),
    }),

  updateCrane: (craneId: string, craneName: string, sortOrder?: number) =>
    apiRequest<{ updated: boolean }>(`/api/cranes/${encodeURIComponent(craneId)}`, {
      method: 'PUT',
      body: JSON.stringify({ craneName, sortOrder }),
    }),

  deleteCrane: (craneId: string) =>
    apiRequest<{ deleted: boolean }>(`/api/cranes/${encodeURIComponent(craneId)}`, {
      method: 'DELETE',
    }),

  reorderCranes: (orders: Record<string, number>) =>
    apiRequest<{ updated: boolean }>('/api/cranes/reorder', {
      method: 'POST',
      body: JSON.stringify({ orders }),
    }),

  uploadImageToDrive: (payload: { fileName: string; mimeType: string; base64Data: string }) =>
    apiRequest<{ fileId: string; fileName: string; fileUrl: string }>('/api/drive/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  saveInstallRecord: (payload: {
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
  }) =>
    apiRequest<{ saved: boolean; updatedAt: string }>('/api/records/install', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  saveRemovalRecord: (payload: {
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
  }) =>
    apiRequest<{ saved: boolean; updatedAt: string }>('/api/records/removal', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  fetchDriveImageBlobUrl: async (fileId: string): Promise<string> => {
    const res = await fetch(`/api/drive/image/${encodeURIComponent(fileId)}`, {
      headers: getApiAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`โหลดรูปภาพไม่สำเร็จ (${res.status})`);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
