import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Database } from 'lucide-react';
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
import { ConnectionSetupView } from './components/ConnectionSetupView';
import {
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_SPREADSHEET_ID,
} from './constants/initialData';
import { apiClient, setApiAuthSession } from './services/apiClient';
import { googleSignIn, initAuth, logout } from './services/firebaseAuth';
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

  // Connection State
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('disconnected');
  const [userEmail, setUserEmail] = useState<string>('');
  const [gasUrl, setGasUrl] = useState<string>('');
  const [gasSecret, setGasSecret] = useState<string>('');
  const [serverConfig, setServerConfig] = useState({
    spreadsheetId: DEFAULT_SPREADSHEET_ID,
    driveFolderId: DEFAULT_DRIVE_FOLDER_ID,
    hasServerGasUrl: false,
  });

  // Loading & Error State
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isConnectingGas, setIsConnectingGas] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
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
        let data = await apiClient.fetchAllData();
        const activeYears = data.years.filter((y) => y.is_active);
        const activeCranes = data.cranes.filter((c) => c.is_active);

        if (autoBootstrapIfEmpty && (activeYears.length === 0 || activeCranes.length === 0)) {
          data = await apiClient.bootstrapSheets();
        }

        setDataset(data);
        clearDriveImageCache();

        const validYears = data.years.filter((y) => y.is_active);
        setSelectedYearId((prev) => {
          if (prev && validYears.some((y) => y.year_id === prev)) return prev;
          return validYears[0]?.year_id || '';
        });
      } catch (err: any) {
        const msg = err?.message || 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้';
        setLastError(msg);
        if (err?.code === 'INSUFFICIENT_SCOPE') {
          notify(
            'warning',
            'บัญชี Google ยังไม่มีสิทธิ์เข้าถึง Sheets/Drive',
            'สามารถเชื่อมต่อผ่าน Google Apps Script Web App ในหน้าตั้งค่าได้ทันที'
          );
        } else {
          notify('error', 'โหลดข้อมูลไม่สำเร็จ', msg);
        }
        throw err;
      } finally {
        setIsLoadingData(false);
      }
    },
    [notify]
  );

  // Initial server config + Firebase auth listener
  useEffect(() => {
    apiClient
      .getConfig()
      .then((cfg) => {
        setServerConfig(cfg);
        if (cfg.hasServerGasUrl) {
          setApiAuthSession({ mode: 'apps_script', userEmail: 'server-env' });
          setConnectionMode('apps_script');
          loadSheetsData(true).catch(() => {
            setConnectionMode('disconnected');
            setApiAuthSession({ mode: 'disconnected' });
          });
        }
      })
      .catch(() => {
        // ignore config fetch error
      });

    const unsub = initAuth(
      (user, token) => {
        setApiAuthSession({
          mode: 'google_oauth',
          accessToken: token,
          userEmail: user.email || user.displayName || 'google-user',
        });
        setUserEmail(user.email || '');
        setConnectionMode('google_oauth');
        loadSheetsData(true).catch(() => {});
      },
      (user) => {
        if (user?.email) setUserEmail(user.email);
      }
    );

    return () => unsub();
  }, [loadSheetsData]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setLastError(null);
    try {
      const { user, accessToken } = await googleSignIn();
      setApiAuthSession({
        mode: 'google_oauth',
        accessToken,
        userEmail: user.email || user.displayName || 'google-user',
      });
      setUserEmail(user.email || '');
      setConnectionMode('google_oauth');
      await loadSheetsData(true);
      notify('success', 'เข้าสู่ระบบ Google สำเร็จ', 'เชื่อมต่อ Google Sheets และ Drive เรียบร้อย');
      setCurrentPage('dashboard');
    } catch (err: any) {
      const msg = err?.message || 'เข้าสู่ระบบไม่สำเร็จ';
      setLastError(msg);
      setConnectionMode('disconnected');
      setApiAuthSession({ mode: 'disconnected' });
      notify('error', 'ไม่สามารถเชื่อมต่อ Google ได้', msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setApiAuthSession({ mode: 'disconnected' });
    setConnectionMode('disconnected');
    setUserEmail('');
    setDataset(EMPTY_DATASET);
    clearDriveImageCache();
    notify('info', 'ออกจากระบบแล้ว');
  };

  const handleConnectGas = async (url: string, secret: string) => {
    setIsConnectingGas(true);
    setLastError(null);
    try {
      setApiAuthSession({
        mode: 'apps_script',
        gasUrl: url,
        gasSecret: secret,
        userEmail: userEmail || 'apps-script-user',
      });
      setGasUrl(url);
      setGasSecret(secret);
      await loadSheetsData(true);
      setConnectionMode('apps_script');
      notify(
        'success',
        'เชื่อมต่อ Google Apps Script สำเร็จ',
        'ดึงข้อมูลจริงจาก Google Sheets เรียบร้อยแล้ว'
      );
      setCurrentPage('dashboard');
    } catch (err: any) {
      setApiAuthSession({ mode: 'disconnected' });
      setConnectionMode('disconnected');
      setLastError(err?.message || 'เชื่อมต่อ Google Apps Script ไม่สำเร็จ');
    } finally {
      setIsConnectingGas(false);
    }
  };

  const handleDisconnectGas = () => {
    setApiAuthSession({ mode: 'disconnected' });
    setConnectionMode('disconnected');
    setGasUrl('');
    setGasSecret('');
    setDataset(EMPTY_DATASET);
    clearDriveImageCache();
    notify('info', 'ตัดการเชื่อมต่อ Apps Script แล้ว');
  };

  const handleBootstrapSheets = async () => {
    setIsBootstrapping(true);
    setLastError(null);
    try {
      const data = await apiClient.bootstrapSheets();
      setDataset(data);
      const validYears = data.years.filter((y) => y.is_active);
      if (!selectedYearId && validYears[0]) {
        setSelectedYearId(validYears[0].year_id);
      }
      notify(
        'success',
        'ตรวจสอบและเตรียมโครงสร้าง Google Sheets สำเร็จ',
        'พบข้อมูล 4 ตาราง พร้อมปี 2569/70 และรายชื่อเครนครบถ้วน'
      );
    } catch (err: any) {
      setLastError(err?.message || 'สร้างโครงสร้าง Google Sheets ไม่สำเร็จ');
      notify('error', 'เตรียมโครงสร้าง Google Sheets ไม่สำเร็จ', err?.message);
    } finally {
      setIsBootstrapping(false);
    }
  };

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

  const renderDisconnectedNotice = () => (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-amber-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              ยังไม่ได้เชื่อมต่อฐานข้อมูล Google Sheets และ Google Drive
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              ระบบนี้เชื่อมต่อข้อมูลจริงจาก Google Sheets และรูปภาพจริงจาก Google Drive เท่านั้น
              (ไม่มีการใช้ข้อมูลจำลองหรือ Local Storage แทนฐานข้อมูล)
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentPage('setup')}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Database className="h-4 w-4" />
                <span>ไปหน้าตั้งค่าและเชื่อมต่อ Google</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
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
        userEmail={userEmail}
        onLogout={handleGoogleLogout}
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
            {currentPage === 'setup' ? (
              <ConnectionSetupView
                connectionMode={connectionMode}
                userEmail={userEmail}
                spreadsheetId={serverConfig.spreadsheetId}
                driveFolderId={serverConfig.driveFolderId}
                spreadsheetTitle={dataset.spreadsheetTitle}
                hasServerGasUrl={serverConfig.hasServerGasUrl}
                gasUrlInput={gasUrl}
                gasSecretInput={gasSecret}
                isSigningIn={isSigningIn}
                isConnectingGas={isConnectingGas}
                isBootstrapping={isBootstrapping}
                lastError={lastError}
                onGoogleSignIn={handleGoogleSignIn}
                onGoogleLogout={handleGoogleLogout}
                onConnectGas={handleConnectGas}
                onDisconnectGas={handleDisconnectGas}
                onBootstrapSheets={handleBootstrapSheets}
                onNotify={notify}
              />
            ) : connectionMode === 'disconnected' ? (
              renderDisconnectedNotice()
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
