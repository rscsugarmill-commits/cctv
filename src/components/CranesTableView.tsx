import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Eye,
  Search,
  Wrench,
} from 'lucide-react';
import type { CraneWithRecord, InstallStatus, RemovalStatus } from '../types/cctv';
import { formatThaiDate } from '../utils/imageProcessor';

interface CranesTableViewProps {
  items: CraneWithRecord[];
  isLoading: boolean;
  onEditStatus: (craneId: string, initialTab?: 'install' | 'removal') => void;
  onViewDetail: (craneId: string) => void;
}

export function CranesTableView({
  items,
  isLoading,
  onEditStatus,
  onViewDetail,
}: CranesTableViewProps) {
  const [search, setSearch] = useState('');
  const [installFilter, setInstallFilter] = useState<'ALL' | InstallStatus>('ALL');
  const [removalFilter, setRemovalFilter] = useState<'ALL' | RemovalStatus>('ALL');
  const [sortBy, setSortBy] = useState<'order' | 'name'>('order');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter(({ crane, record }) => {
        if (q && !crane.crane_name.toLowerCase().includes(q)) return false;
        if (installFilter !== 'ALL' && record.install_status !== installFilter) return false;
        if (removalFilter !== 'ALL' && record.removal_status !== removalFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.crane.crane_name.localeCompare(b.crane.crane_name, 'th');
        }
        return a.crane.sort_order - b.crane.sort_order;
      });
  }, [items, search, installFilter, removalFilter, sortBy]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อเครน..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={installFilter}
            onChange={(e) => setInstallFilter(e.target.value as 'ALL' | InstallStatus)}
            aria-label="กรองตามสถานะติดตั้ง"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="ALL">ติดตั้ง: ทั้งหมด</option>
            <option value="INSTALLED">ติดตั้งแล้ว</option>
            <option value="NOT_INSTALLED">ยังไม่ติดตั้ง</option>
          </select>

          <select
            value={removalFilter}
            onChange={(e) => setRemovalFilter(e.target.value as 'ALL' | RemovalStatus)}
            aria-label="กรองตามสถานะรื้อถอน"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="ALL">รื้อถอน: ทั้งหมด</option>
            <option value="REMOVED">รื้อถอนแล้ว</option>
            <option value="NOT_REMOVED">ยังไม่รื้อถอน</option>
          </select>

          <button
            type="button"
            onClick={() => setSortBy((prev) => (prev === 'order' ? 'name' : 'order'))}
            className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowUpDown className="h-4 w-4 text-slate-500" />
            <span>{sortBy === 'order' ? 'เรียงตามลำดับ' : 'เรียงตามชื่อ ก-ฮ'}</span>
          </button>
        </div>
      </div>

      {/* Count Line */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500">
        <span>
          แสดง <strong className="font-mono-num text-slate-800">{filtered.length}</strong> จากทั้งหมด{' '}
          <strong className="font-mono-num text-slate-800">{items.length}</strong> เครน
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-800">ไม่พบเครนที่ตรงกับเงื่อนไขการค้นหา</p>
          <p className="mt-1 text-xs text-slate-500">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะใหม่อีกครั้ง</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="px-4 py-3 text-center w-16">ลำดับ</th>
                    <th className="px-4 py-3">ชื่อเครน</th>
                    <th className="px-4 py-3">สถานะการติดตั้ง</th>
                    <th className="px-4 py-3">วันที่ติดตั้ง</th>
                    <th className="px-4 py-3">ช่างผู้ติดตั้ง</th>
                    <th className="px-4 py-3">สถานะการรื้อถอน</th>
                    <th className="px-4 py-3">วันที่รื้อถอน</th>
                    <th className="px-4 py-3">ช่างผู้รื้อถอน</th>
                    <th className="px-4 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(({ crane, record }) => {
                    const installed = record.install_status === 'INSTALLED';
                    const removed = record.removal_status === 'REMOVED';
                    return (
                      <tr
                        key={crane.crane_id}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3 text-center font-mono-num text-xs text-slate-500">
                          {crane.sort_order}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {crane.crane_name}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                              installed
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {installed ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3.5 w-3.5" />
                            )}
                            {installed ? 'ติดตั้งแล้ว' : 'ยังไม่ติดตั้ง'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono-num text-xs text-slate-600">
                          {formatThaiDate(record.install_date)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {record.install_technician || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                              removed
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {removed ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3.5 w-3.5" />
                            )}
                            {removed ? 'รื้อถอนแล้ว' : 'ยังไม่รื้อถอน'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono-num text-xs text-slate-600">
                          {formatThaiDate(record.removal_date)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {record.removal_technician || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onEditStatus(crane.crane_id)}
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Wrench className="h-3.5 w-3.5" />
                              แก้ไขสถานะ
                            </button>
                            <button
                              type="button"
                              onClick={() => onViewDetail(crane.crane_id)}
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              รายละเอียด
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile & Tablet Card Grid */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
            {filtered.map(({ crane, record }) => {
              const installed = record.install_status === 'INSTALLED';
              const removed = record.removal_status === 'REMOVED';
              return (
                <div
                  key={crane.crane_id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        <span className="font-mono-num text-slate-400 mr-1.5">
                          #{crane.sort_order}
                        </span>
                        {crane.crane_name}
                      </h3>
                    </div>

                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500">การติดตั้ง:</span>
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            installed ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {installed ? 'ติดตั้งแล้ว' : 'ยังไม่ติดตั้ง'}
                        </span>
                      </div>
                      {installed && (
                        <div className="flex items-center justify-between gap-2 text-slate-600">
                          <span>วันที่ / ช่าง:</span>
                          <span className="font-mono-num">
                            {formatThaiDate(record.install_date)} ·{' '}
                            {record.install_technician || '-'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-slate-500">การรื้อถอน:</span>
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            removed ? 'text-blue-700' : 'text-red-700'
                          }`}
                        >
                          {removed ? 'รื้อถอนแล้ว' : 'ยังไม่รื้อถอน'}
                        </span>
                      </div>
                      {removed && (
                        <div className="flex items-center justify-between gap-2 text-slate-600">
                          <span>วันที่ / ช่าง:</span>
                          <span className="font-mono-num">
                            {formatThaiDate(record.removal_date)} ·{' '}
                            {record.removal_technician || '-'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => onEditStatus(crane.crane_id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      แก้ไขสถานะ
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewDetail(crane.crane_id)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      รายละเอียด
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
