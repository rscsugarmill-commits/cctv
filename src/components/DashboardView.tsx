import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  History,
  PackageCheck,
  PackageX,
  Wrench,
} from 'lucide-react';
import type {
  ActivityLog,
  CraneWithRecord,
  DashboardStats,
  ProductionYear,
  SummaryFilterStatus,
} from '../types/cctv';
import { formatThaiDate, formatThaiDateTime } from '../utils/imageProcessor';

interface DashboardViewProps {
  selectedYear: ProductionYear | null;
  items: CraneWithRecord[];
  stats: DashboardStats;
  logs: ActivityLog[];
  isLoading: boolean;
  onEditCrane: (craneId: string, initialTab?: 'install' | 'removal') => void;
  onViewCraneDetail: (craneId: string) => void;
  onOpenSummaryWithStatus: (status: SummaryFilterStatus) => void;
  onGoToCranes: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  UPDATE_INSTALL: 'บันทึกงานติดตั้ง',
  UPDATE_REMOVAL: 'บันทึกงานรื้อถอน',
  CREATE_YEAR: 'เพิ่มปีการผลิต',
  UPDATE_YEAR: 'แก้ไขปีการผลิต',
  DELETE_YEAR: 'ลบปีการผลิต',
  CREATE_CRANE: 'เพิ่มเครนใหม่',
  UPDATE_CRANE: 'แก้ไขชื่อเครน',
  ARCHIVE_CRANE: 'ลบ/เก็บถาวรเครน',
};

export function DashboardView({
  selectedYear,
  items,
  stats,
  logs,
  isLoading,
  onEditCrane,
  onViewCraneDetail,
  onOpenSummaryWithStatus,
  onGoToCranes,
}: DashboardViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white p-5"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  const craneMap = new Map(items.map((item) => [item.crane.crane_id, item.crane.crane_name]));

  const statCards: Array<{
    key: SummaryFilterStatus;
    title: string;
    subtitle: string;
    count: number;
    total: number;
    percent: number;
    icon: typeof CheckCircle2;
    iconBg: string;
    iconColor: string;
    barColor: string;
    valueColor: string;
  }> = [
    {
      key: 'INSTALLED',
      title: 'ติดตั้งแล้ว',
      subtitle: 'งานติดตั้งกล้องวงจรปิด',
      count: stats.installedCount,
      total: stats.total,
      percent: stats.installedPercent,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      barColor: 'bg-emerald-600',
      valueColor: 'text-emerald-700',
    },
    {
      key: 'NOT_INSTALLED',
      title: 'ยังไม่ติดตั้ง',
      subtitle: 'รอดำเนินการติดตั้ง',
      count: stats.notInstalledCount,
      total: stats.total,
      percent: stats.notInstalledPercent,
      icon: Clock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      barColor: 'bg-amber-500',
      valueColor: 'text-amber-700',
    },
    {
      key: 'REMOVED',
      title: 'รื้อถอนแล้ว',
      subtitle: 'งานรื้อถอนกล้องวงจรปิด',
      count: stats.removedCount,
      total: stats.total,
      percent: stats.removedPercent,
      icon: PackageCheck,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      barColor: 'bg-blue-600',
      valueColor: 'text-blue-700',
    },
    {
      key: 'NOT_REMOVED',
      title: 'ยังไม่รื้อถอน',
      subtitle: 'ต้องติดตามรื้อถอน',
      count: stats.notRemovedCount,
      total: stats.total,
      percent: stats.notRemovedPercent,
      icon: PackageX,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      barColor: 'bg-red-600',
      valueColor: 'text-red-700',
    },
  ];

  const pendingCranes = items
    .filter(
      (x) =>
        x.record.install_status === 'NOT_INSTALLED' ||
        x.record.removal_status === 'NOT_REMOVED'
    )
    .slice(0, 8);

  const yearLogs = logs
    .filter((l) => !l.year_id || !selectedYear || l.year_id === selectedYear.year_id)
    .slice()
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Year Overview Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div>
          <p className="text-xs font-medium text-slate-500">สรุปสถานะประจำปีการผลิต</p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              ปีการผลิต {selectedYear ? selectedYear.year_name : '-'}
            </h2>
            <span className="text-sm text-slate-500">
              · เครนทั้งหมด{' '}
              <span className="font-mono-num font-semibold text-slate-800">{stats.total}</span> จุด
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGoToCranes}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <span>ดูเครนทั้งหมด</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onOpenSummaryWithStatus(card.key)}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-blue-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{card.subtitle}</p>
                </div>
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconBg} ${card.iconColor}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`font-mono-num text-3xl font-bold ${card.valueColor}`}>
                      {card.count}
                    </span>
                    <span className="font-mono-num text-sm text-slate-400">
                      / {card.total} เครน
                    </span>
                  </div>
                  <span className="font-mono-num text-sm font-semibold text-slate-700">
                    {card.percent.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${card.barColor}`}
                    style={{ width: `${Math.min(100, Math.max(0, card.percent))}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Two-column Operational Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pending Cranes Table */}
        <section className="rounded-xl border border-slate-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                รายการเครนที่รอดำเนินการ
              </h3>
              <p className="text-xs text-slate-500">
                แสดงรายการที่ยังไม่ติดตั้งหรือยังไม่รื้อถอนในรอบปี {selectedYear?.year_name || '-'}
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToCranes}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              ดูทั้งหมด
            </button>
          </div>

          {pendingCranes.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="mt-3 text-sm font-semibold text-slate-900">
                เครนทั้งหมดดำเนินการครบถ้วนแล้ว
              </p>
              <p className="mt-1 text-xs text-slate-500">
                ไม่มีรายการค้างติดตั้งหรือค้างรื้อถอนในปีการผลิตนี้
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingCranes.map(({ crane, record }) => {
                const isInstalled = record.install_status === 'INSTALLED';
                const isRemoved = record.removal_status === 'REMOVED';
                return (
                  <div
                    key={crane.crane_id}
                    className="flex flex-col justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onViewCraneDetail(crane.crane_id)}
                        className="truncate text-left text-sm font-semibold text-slate-900 hover:text-blue-600"
                      >
                        {crane.sort_order}. {crane.crane_name}
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            isInstalled ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {isInstalled ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5" />
                          )}
                          ติดตั้ง: {isInstalled ? 'ติดตั้งแล้ว' : 'ยังไม่ติดตั้ง'}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                          |
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            isRemoved ? 'text-blue-700' : 'text-red-700'
                          }`}
                        >
                          {isRemoved ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <CalendarClock className="h-3.5 w-3.5" />
                          )}
                          รื้อถอน: {isRemoved ? 'รื้อถอนแล้ว' : 'ยังไม่รื้อถอน'}
                        </span>
                        {record.install_date && (
                          <>
                            <span className="text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-slate-500">
                              ติดตั้งเมื่อ {formatThaiDate(record.install_date)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onEditCrane(crane.crane_id, isInstalled ? 'removal' : 'install')
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>แก้ไขสถานะ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Activity Log Feed */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              <h3 className="text-base font-semibold text-slate-900">ประวัติการอัปเดตล่าสุด</h3>
            </div>
          </div>

          {yearLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <History className="h-8 w-8 text-slate-300" />
              <p className="mt-2.5 text-sm font-medium text-slate-700">ยังไม่มีประวัติการเปลี่ยนแปลง</p>
              <p className="mt-1 text-xs text-slate-500">
                เมื่อบันทึกงานติดตั้งหรือรื้อถอน ประวัติจะปรากฏที่นี่
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {yearLogs.map((log) => {
                const craneName = craneMap.get(log.crane_id) || '';
                return (
                  <div key={log.log_id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {ACTION_LABELS[log.action_type] || log.action_type}
                      </span>
                      <span className="font-mono-num text-[11px] text-slate-400">
                        {formatThaiDateTime(log.created_at)}
                      </span>
                    </div>
                    {craneName && (
                      <p className="mt-0.5 text-xs font-medium text-blue-700">{craneName}</p>
                    )}
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      โดย {log.updated_by || 'ผู้ใช้งาน'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
