export type InstallStatus = 'NOT_INSTALLED' | 'INSTALLED';
export type RemovalStatus = 'NOT_REMOVED' | 'REMOVED';

export type SummaryFilterStatus =
  | 'INSTALLED'
  | 'NOT_INSTALLED'
  | 'REMOVED'
  | 'NOT_REMOVED';

export interface ProductionYear {
  year_id: string;
  year_name: string;
  created_at: string;
  is_active: boolean;
}

export interface Crane {
  crane_id: string;
  crane_name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CraneRecord {
  record_id: string;
  year_id: string;
  crane_id: string;
  install_status: InstallStatus;
  install_date: string;
  install_technician: string;
  install_image_1_id: string;
  install_image_1_url: string;
  install_image_2_id: string;
  install_image_2_url: string;
  install_note: string;
  removal_status: RemovalStatus;
  removal_date: string;
  removal_technician: string;
  removal_image_1_id: string;
  removal_image_1_url: string;
  removal_image_2_id: string;
  removal_image_2_url: string;
  removal_note: string;
  updated_at: string;
  updated_by: string;
}

export interface ActivityLog {
  log_id: string;
  year_id: string;
  crane_id: string;
  action_type: string;
  old_data: string;
  new_data: string;
  created_at: string;
  updated_by: string;
}

export interface CraneWithRecord {
  crane: Crane;
  record: CraneRecord;
}

export interface DashboardStats {
  total: number;
  installedCount: number;
  notInstalledCount: number;
  removedCount: number;
  notRemovedCount: number;
  installedPercent: number;
  notInstalledPercent: number;
  removedPercent: number;
  notRemovedPercent: number;
}

export interface SheetsDataset {
  years: ProductionYear[];
  cranes: Crane[];
  records: CraneRecord[];
  logs: ActivityLog[];
  spreadsheetTitle?: string;
  fetchedAt: string;
}

export type ConnectionMode = 'disconnected' | 'google_oauth' | 'apps_script';

export type AppPage =
  | 'dashboard'
  | 'cranes'
  | 'summary'
  | 'detail'
  | 'years'
  | 'manage-cranes'
  | 'setup';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}
