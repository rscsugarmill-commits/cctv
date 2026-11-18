import type { SheetsDataset } from '../types/cctv';

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
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
      connected: boolean;
      connectionType: 'apps_script' | 'service_account' | 'unconfigured';
    }>('/api/config'),

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
    const res = await fetch(`/api/drive/image/${encodeURIComponent(fileId)}`);
    if (!res.ok) {
      throw new Error(`โหลดรูปภาพไม่สำเร็จ (${res.status})`);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
