import { Menu, Plus, RefreshCw } from 'lucide-react';
import type { AppPage, ConnectionMode, ProductionYear } from '../types/cctv';
import { formatThaiDate, formatThaiDateTime } from '../utils/imageProcessor';

interface TopBarProps {
  currentPage: AppPage;
  onOpenMobileMenu: () => void;
  years: ProductionYear[];
  selectedYearId: string;
  onSelectYear: (yearId: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: string;
  onQuickRecord: () => void;
  connectionMode: ConnectionMode;
}

const PAGE_TITLES: Record<AppPage, string> = {
  dashboard: 'ภาพรวมระบบ (Dashboard)',
  cranes: 'รายการเครนทั้งหมด',
  summary: 'สรุปข้อมูลและออกรายงาน',
  detail: 'รายละเอียดและประวัติเครน',
  years: 'จัดการปีการผลิต',
  'manage-cranes': 'จัดการรายชื่อเครน',
};

export function TopBar({
  currentPage,
  onOpenMobileMenu,
  years,
  selectedYearId,
  onSelectYear,
  onRefresh,
  isRefreshing,
  lastUpdated,
  onQuickRecord,
  connectionMode,
}: TopBarProps) {
  const activeYears = years.filter((y) => y.is_active);
  const todayFormatted = formatThaiDate(new Date().toISOString());

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Left: Hamburger + Page Title & Date */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 lg:hidden"
            aria-label="เปิดเมนูนำทาง"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
              {PAGE_TITLES[currentPage]}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span>ระบบบันทึกการติดตั้งและรื้อถอนกล้องวงจรปิด</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">วันที่ {todayFormatted}</span>
              {lastUpdated && (
                <>
                  <span aria-hidden="true" className="hidden sm:inline">
                    ·
                  </span>
                  <span className="hidden tabular-nums sm:inline">
                    อัปเดตล่าสุด {formatThaiDateTime(lastUpdated)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Production Year Selector + Refresh + Quick Record */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {activeYears.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="global-year-select"
                className="hidden text-xs font-medium text-slate-500 sm:inline"
              >
                ปีการผลิต:
              </label>
              <select
                id="global-year-select"
                value={selectedYearId}
                onChange={(e) => onSelectYear(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-blue-500 focus:bg-white"
              >
                {activeYears.map((y) => (
                  <option key={y.year_id} value={y.year_id}>
                    ปี {y.year_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing || connectionMode !== 'connected'}
            className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="รีเฟรชข้อมูลจาก Google Sheets"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={onQuickRecord}
            disabled={connectionMode !== 'connected' || activeYears.length === 0}
            className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>บันทึกงาน</span>
          </button>
        </div>
      </div>
    </header>
  );
}
