import {
  CalendarRange,
  Camera,
  ClipboardCheck,
  Database,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  Wrench,
  X,
} from 'lucide-react';
import type { AppPage, ConnectionMode } from '../types/cctv';

interface SidebarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  connectionMode: ConnectionMode;
  userEmail?: string;
  onLogout?: () => void;
}

const NAV_ITEMS: Array<{ id: AppPage; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'ภาพรวม Dashboard', icon: LayoutDashboard },
  { id: 'cranes', label: 'รายการเครนทั้งหมด', icon: ListChecks },
  { id: 'summary', label: 'สรุปข้อมูล & รายงาน', icon: ClipboardCheck },
  { id: 'years', label: 'จัดการปีการผลิต', icon: CalendarRange },
  { id: 'manage-cranes', label: 'จัดการรายชื่อเครน', icon: Wrench },
  { id: 'setup', label: 'เชื่อมต่อ Google & คู่มือ', icon: Settings },
];

export function Sidebar({
  currentPage,
  onNavigate,
  mobileOpen,
  onCloseMobile,
  connectionMode,
  userEmail,
  onLogout,
}: SidebarProps) {
  const handleNav = (page: AppPage) => {
    onNavigate(page);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      {/* Brand Block */}
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Camera className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">
              CCTV Crane Ops
            </p>
            <p className="truncate text-xs text-slate-400">
              บันทึกติดตั้ง &amp; รื้อถอน
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="ปิดเมนู"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="เมนูหลัก">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            currentPage === item.id ||
            (item.id === 'cranes' && currentPage === 'detail');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Connection Summary Footer */}
      <div className="border-t border-slate-800 p-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <Database className="h-3.5 w-3.5 shrink-0 text-blue-400" />
            <span className="truncate">
              {connectionMode === 'google_oauth'
                ? 'เชื่อมต่อ Google Workspace'
                : connectionMode === 'apps_script'
                  ? 'เชื่อมต่อ Apps Script API'
                  : 'ยังไม่ได้เชื่อมต่อฐานข้อมูล'}
            </span>
          </div>
          {userEmail && (
            <p className="mt-1 truncate text-[11px] text-slate-400">{userEmail}</p>
          )}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleNav('setup')}
              className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-center text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
            >
              {connectionMode === 'disconnected' ? 'ตั้งค่าการเชื่อมต่อ' : 'จัดการเชื่อมต่อ'}
            </button>
            {connectionMode === 'google_oauth' && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                title="ออกจากระบบ Google"
                aria-label="ออกจากระบบ Google"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="no-print hidden w-[260px] shrink-0 border-r border-slate-800 lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 h-full w-[270px] max-w-[85vw] shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
