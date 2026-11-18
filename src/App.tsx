import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Database, Loader2, RefreshCw } from 'lucide-react';
import { clearDriveImageCache } from './components/DriveImage';
import { CraneDetailView } from './components/CraneDetailView';
import { CranesManagementView } from './components/CranesManagementView';
import { CranesTableView } from './components/CranesTableView';
import { DashboardView } from './components/DashboardView';
import { LightboxModal } from './components/LightboxModal';
import { Sidebar } from './components/Sidebar';
import { StatusEditModal } from './components/StatusEditModal';
import { SummaryView } from './components/SummaryView';
import { ToastContainer } from './components/ToastContainer';
import { TopBar } from './components/TopBar';
import { YearsManagementView } from './components/YearsManagementView';
import {
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_SPREADSHEET_ID,
} from './constants/initialData';
import { apiClient } from './services/apiClient';
import type {
  AppPage,
  ConnectionMode,
  CraneRecord,
  CraneWithRecord,
  DashboardStats,
  SheetsDataset,
  SummaryFilterStatus,
  ToastMessage,
} from './types/cctv';

const EMPTY_DATASET: SheetsDataset = {
  years: [],
  cranes: [],
  records: [],
  logs: [],
  fetchedAt: '',
};

function createEmptyRecord(yearId: string, craneId: string): CraneRecord {
  return {
    record_id: '',
    year_id: yearId,
    crane_id: craneId,
    install_status: 'NOT_INSTALLED',
    install_date: '',
    install_technician: '',
    install_image_1_id: '',
    install_image_1_url: '',
    install_image_2_id: '',
    install_image_2_url: '',
    install_note: '',
    removal_status: 'NOT_REMOVED',
    removal_date: '',
    removal_technician: '',
    removal_image_1_id: '',
    removal_image_1_url: '',
    removal_image_2_id: '',
    removal_image_2_url: '',
    removal_note: '',
    updated_at: '',
    updated_by: '',
  };
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Connection State (Pure Server -> Google Sheets & Google Drive, zero user login)
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('loading');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Live Google Sheets Data
  const [dataset, setDataset] = useState<SheetsDataset>(EMPTY_DATASET);
  const [selectedYearId, setSelectedYearId] = useState<string>('');

  // Sub-views & Modals
  const [detailCraneId, setDetailCraneId] = useState<string>('');
  const [summaryStatus, setSummaryStatus] = useState<SummaryFilterStatus>('INSTALLED');
  const [editModalState, setEditModalState] = useState<{
    open: boolean;
    craneId: string | null;
    tab: 'install' | 'removal';
  }>({ open: false, craneId: null, tab: 'install' });

  const [lightboxState, setLightboxState] = useState<{
    open: boolean;
    fileId: string;
    fileUrl?: string;
    title: string;
    subtitle?: string;
  }>({ open: false, fileId: '', title: '' });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback(
    (type: ToastMessage['type'], title: string, description?: string) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadSheetsData = useCallback(
    async (autoBootstrapIfEmpty = true) => {
      setIsLoadingData(true);
      setLastError(null);
      try {
        await apiClient.ensureReady();
        let data = await apiClient.fetchAllData();
        const activeYears = data.years.filter((y) => y.is_active);
        const activeCranes = data.cranes.filter((c) => c.is_active);

        if (autoBootstrapIfEmpty && (activeYears.length === 0 || activeCranes.length === 0)) {
          data = await apiClient.bootstrapSheets();
        }

        setDataset(data);
        setConnectionMode('connected');
        clearDriveImageCache();

        const validYears = data.years.filter((y) => y.is_active);
        setSelectedYearId((prev) => {
          if (prev && validYears.some((y) => y.year_id === prev)) return prev;
          return validYears[0]?.year_id || '';
        });
      } catch (err: any) {
        const msg = err?.message || 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้';
        setLastError(msg);
        setConnectionMode('unconfigured');
        notify('error', 'โหลดข้อมูลไม่สำเร็จ', msg);
      } finally {
        setIsLoadingData(false);
      }
    },
    [notify]
  );

  const initializeConnection = useCallback(async () => {
    setConnectionMode('loading');
    await loadSheetsData(true);
  }, [loadSheetsData]);

  useEffect(() => {
    initializeConnection();
  }, [initializeConnection]);

  const activeYears = useMemo(
    () => dataset.years.filter((y) => y.is_active),
    [dataset.years]
  );

  const selectedYear = useMemo(
    () => activeYears.find((y) => y.year_id === selectedYearId) || activeYears[0] || null,
    [activeYears, selectedYearId]
  );

  const cranesWithRecords: CraneWithRecord[] = useMemo(() => {
    const activeCranes = dataset.cranes
      .filter((c) => c.is_active)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);

    const recordMap = new Map<string, CraneRecord>();
    if (selectedYear) {
      dataset.records
        .filter((r) => r.year_id === selectedYear.year_id)
        .forEach((r) => recordMap.set(r.crane_id, r));
    }

    return activeCranes.map((crane) => ({
      crane,
      record:
        recordMap.get(crane.crane_id) ||
        createEmptyRecord(selectedYear?.year_id || '', crane.crane_id),
    }));
  }, [dataset.cranes, dataset.records, selectedYear]);

  const dashboardStats: DashboardStats = useMemo(() => {
    const total = cranesWithRecords.length;
    if (total === 0) {
      return {
        total: 0,
        installedCount: 0,
        notInstalledCount: 0,
        removedCount: 0,
        notRemovedCount: 0,
        installedPercent: 0,
        notInstalledPercent: 0,
        removedPercent: 0,
        notRemovedPercent: 0,
      };
    }

    const installedCount = cranesWithRecords.filter(
      (i) => i.record.install_status === 'INSTALLED'
    ).length;
    const notInstalledCount = total - installedCount;

    const removedCount = cranesWithRecords.filter(
      (i) => i.record.removal_status === 'REMOVED'
    ).length;
    const notRemovedCount = total - removedCount;

    return {
      total,
      installedCount,
      notInstalledCount,
      removedCount,
      notRemovedCount,
      installedPercent: (installedCount / total) * 100,
      notInstalledPercent: (notInstalledCount / total) * 100,
      removedPercent: (removedCount / total) * 100,
      notRemovedPercent: (notRemovedCount / total) * 100,
    };
  }, [cranesWithRecords]);

  const detailItem = useMemo(
    () => cranesWithRecords.find((i) => i.crane.crane_id === detailCraneId) || null,
    [cranesWithRecords, detailCraneId]
  );

  const openEditStatusModal = (craneId: string | null, tab: 'install' | 'removal' = 'install') => {
    setEditModalState({ open: true, craneId, tab });
  };

  const renderServerConfigNotice = () => (
    <div className="mx-auto max-w-2xl py-8">
      <div className="rounded-xl border border-red-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              ไม่สามารถเชื่อมต่อฐานข้อมูล Google Sheets และ Google Drive ได้ชั่วคราว
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือสิทธิ์เข้าถึง Google Apps Script Web App
              แล้วกดลองใหม่อีกครั้ง
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
            <span className="font-medium text-slate-500">Google Sheet ID:</span>
            <span className="font-mono-num break-all text-slate-800">
              {DEFAULT_SPREADSHEET_ID}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
            <span className="font-medium text-slate-500">Google Drive Folder ID:</span>
            <span className="font-mono-num break-all text-slate-800">
              {DEFAULT_DRIVE_FOLDER_ID}
            </span>
          </div>
        </div>

        {lastError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{lastError}</span>
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={initializeConnection}
            disabled={isLoadingData}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>ลองเชื่อมต่อใหม่อีกครั้ง</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        connectionMode={connectionMode}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          currentPage={currentPage}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          years={dataset.years}
          selectedYearId={selectedYear?.year_id || ''}
          onSelectYear={setSelectedYearId}
          onRefresh={() => loadSheetsData(false)}
          isRefreshing={isLoadingData}
          lastUpdated={dataset.fetchedAt}
          onQuickRecord={() =>
            openEditStatusModal(cranesWithRecords[0]?.crane.crane_id || null, 'install')
          }
          connectionMode={connectionMode}
        />

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-[1400px]">
            {connectionMode === 'loading' ? (
              <div className="flex min-h-[50vh] items-center justify-center">
                <div className="flex items-center gap-2.5 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span>กำลังโหลดข้อมูลจริงจาก Google Sheets...</span>
                </div>
              </div>
            ) : connectionMode === 'unconfigured' ? (
              renderServerConfigNotice()
            ) : currentPage === 'dashboard' ? (
              <DashboardView
                selectedYear={selectedYear}
                items={cranesWithRecords}
                stats={dashboardStats}
                logs={dataset.logs}
                isLoading={isLoadingData}
                onEditCrane={(cid, tab) => openEditStatusModal(cid, tab || 'install')}
                onViewCraneDetail={(cid) => {
                  setDetailCraneId(cid);
                  setCurrentPage('detail');
                }}
                onOpenSummaryWithStatus={(status) => {
                  setSummaryStatus(status);
                  setCurrentPage('summary');
                }}
                onGoToCranes={() => setCurrentPage('cranes')}
              />
            ) : currentPage === 'cranes' ? (
              <CranesTableView
                items={cranesWithRecords}
                isLoading={isLoadingData}
                onEditStatus={(cid, tab) => openEditStatusModal(cid, tab || 'install')}
                onViewDetail={(cid) => {
                  setDetailCraneId(cid);
                  setCurrentPage('detail');
                }}
              />
            ) : currentPage === 'summary' ? (
              <SummaryView
                dataset={dataset}
                selectedYearId={selectedYear?.year_id || ''}
                onSelectYear={setSelectedYearId}
                statusFilter={summaryStatus}
                onChangeStatusFilter={setSummaryStatus}
                onOpenLightbox={(img) =>
                  setLightboxState({
                    open: true,
                    ...img,
                  })
                }
                onViewDetail={(cid) => {
                  setDetailCraneId(cid);
                  setCurrentPage('detail');
                }}
              />
            ) : currentPage === 'detail' ? (
              <CraneDetailView
                item={detailItem}
                selectedYear={selectedYear}
                logs={dataset.logs}
                onBack={() => setCurrentPage('cranes')}
                onEditStatus={(cid, tab) => openEditStatusModal(cid, tab)}
                onOpenLightbox={(img) =>
                  setLightboxState({
                    open: true,
                    ...img,
                  })
                }
              />
            ) : currentPage === 'years' ? (
              <YearsManagementView
                years={dataset.years}
                records={dataset.records}
                selectedYearId={selectedYear?.year_id || ''}
                onSelectYear={setSelectedYearId}
                onRefresh={() => loadSheetsData(false)}
                onNotify={notify}
              />
            ) : currentPage === 'manage-cranes' ? (
              <CranesManagementView
                cranes={dataset.cranes}
                records={dataset.records}
                logs={dataset.logs}
                onRefresh={() => loadSheetsData(false)}
                onNotify={notify}
              />
            ) : null}
          </div>
        </main>
      </div>

      <StatusEditModal
        open={editModalState.open}
        items={cranesWithRecords}
        selectedYear={selectedYear}
        initialCraneId={editModalState.craneId}
        initialTab={editModalState.tab}
        onClose={() => setEditModalState((s) => ({ ...s, open: false }))}
        onSaved={() => loadSheetsData(false)}
        onNotify={notify}
      />

      <LightboxModal
        open={lightboxState.open}
        fileId={lightboxState.fileId}
        fileUrl={lightboxState.fileUrl}
        title={lightboxState.title}
        subtitle={lightboxState.subtitle}
        onClose={() => setLightboxState((s) => ({ ...s, open: false }))}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
