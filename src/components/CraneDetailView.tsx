import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  User,
  Wrench,
} from 'lucide-react';
import type { ActivityLog, CraneWithRecord, ProductionYear } from '../types/cctv';
import { formatThaiDate, formatThaiDateTime } from '../utils/imageProcessor';
import { DriveImage } from './DriveImage';

interface CraneDetailViewProps {
  item: CraneWithRecord | null;
  selectedYear: ProductionYear | null;
  logs: ActivityLog[];
  onBack: () => void;
  onEditStatus: (craneId: string, tab: 'install' | 'removal') => void;
  onOpenLightbox: (img: {
    fileId: string;
    fileUrl?: string;
    title: string;
    subtitle?: string;
  }) => void;
}

export function CraneDetailView({
  item,
  selectedYear,
  logs,
  onBack,
  onEditStatus,
  onOpenLightbox,
}: CraneDetailViewProps) {
  if (!item) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-slate-800">ไม่พบข้อมูลเครนที่เลือก</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับหน้ารายการเครน
        </button>
      </div>
    );
  }

  const { crane, record } = item;
  const installed = record.install_status === 'INSTALLED';
  const removed = record.removal_status === 'REMOVED';

  const craneLogs = logs
    .filter(
      (l) =>
        l.crane_id === crane.crane_id &&
        (!selectedYear || !l.year_id || l.year_id === selectedYear.year_id)
    )
    .slice()
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>ย้อนกลับ</span>
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {crane.sort_order}. {crane.crane_name}
            </h2>
            <p className="text-xs text-slate-500">
              ปีการผลิต {selectedYear?.year_name || '-'} · อัปเดตล่าสุด{' '}
              {record.updated_at ? formatThaiDateTime(record.updated_at) : '-'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onEditStatus(crane.crane_id, 'install')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <Wrench className="h-3.5 w-3.5" />
            แก้ไขงานติดตั้ง
          </button>
          <button
            type="button"
            onClick={() => onEditStatus(crane.crane_id, 'removal')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <Wrench className="h-3.5 w-3.5" />
            แก้ไขงานรื้อถอน
          </button>
        </div>
      </div>

      {/* Chronological Timeline */}
      <div className="relative space-y-6 pl-6 before:absolute before:bottom-4 before:left-2.5 before:top-4 before:w-0.5 before:bg-slate-200">
        {/* Step 1: Installation Timeline Node */}
        <section className="relative rounded-xl border border-slate-200 bg-white p-5">
          <span
            className={`absolute -left-[22px] top-6 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${
              installed ? 'bg-emerald-600' : 'bg-amber-500'
            }`}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-medium text-slate-500">ขั้นตอนที่ 1</span>
              <h3 className="text-base font-semibold text-slate-900">
                การติดตั้งกล้องวงจรปิด (Installation)
              </h3>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
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
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">วันที่ติดตั้ง</p>
                <p className="font-mono-num text-sm font-medium text-slate-900">
                  {formatThaiDate(record.install_date)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">ช่างผู้ติดตั้ง</p>
                <p className="text-sm font-medium text-slate-900">
                  {record.install_technician || '-'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">หมายเหตุ</p>
              <p className="text-sm text-slate-800">{record.install_note || '-'}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">รูปภาพการติดตั้งที่ 1</p>
              <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <DriveImage
                  fileId={record.install_image_1_id}
                  alt="รูปภาพการติดตั้งที่ 1"
                  className="h-full w-full"
                  onClick={
                    record.install_image_1_id
                      ? () =>
                          onOpenLightbox({
                            fileId: record.install_image_1_id,
                            fileUrl: record.install_image_1_url,
                            title: `${crane.crane_name} — รูปภาพการติดตั้งที่ 1`,
                            subtitle: `ติดตั้งเมื่อ ${formatThaiDate(record.install_date)}`,
                          })
                      : undefined
                  }
                />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">รูปภาพการติดตั้งที่ 2</p>
              <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <DriveImage
                  fileId={record.install_image_2_id}
                  alt="รูปภาพการติดตั้งที่ 2"
                  className="h-full w-full"
                  onClick={
                    record.install_image_2_id
                      ? () =>
                          onOpenLightbox({
                            fileId: record.install_image_2_id,
                            fileUrl: record.install_image_2_url,
                            title: `${crane.crane_name} — รูปภาพการติดตั้งที่ 2`,
                            subtitle: `ติดตั้งเมื่อ ${formatThaiDate(record.install_date)}`,
                          })
                      : undefined
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Removal Timeline Node */}
        <section className="relative rounded-xl border border-slate-200 bg-white p-5">
          <span
            className={`absolute -left-[22px] top-6 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${
              removed ? 'bg-blue-600' : 'bg-red-600'
            }`}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-medium text-slate-500">ขั้นตอนที่ 2</span>
              <h3 className="text-base font-semibold text-slate-900">
                การรื้อถอนกล้องวงจรปิด (Removal)
              </h3>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                removed ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {removed ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              {removed ? 'รื้อถอนแล้ว' : 'ยังไม่รื้อถอน'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">วันที่รื้อถอน</p>
                <p className="font-mono-num text-sm font-medium text-slate-900">
                  {formatThaiDate(record.removal_date)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">ช่างผู้รื้อถอน</p>
                <p className="text-sm font-medium text-slate-900">
                  {record.removal_technician || '-'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">หมายเหตุ</p>
              <p className="text-sm text-slate-800">{record.removal_note || '-'}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">รูปภาพการรื้อถอนที่ 1</p>
              <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <DriveImage
                  fileId={record.removal_image_1_id}
                  alt="รูปภาพการรื้อถอนที่ 1"
                  className="h-full w-full"
                  onClick={
                    record.removal_image_1_id
                      ? () =>
                          onOpenLightbox({
                            fileId: record.removal_image_1_id,
                            fileUrl: record.removal_image_1_url,
                            title: `${crane.crane_name} — รูปภาพการรื้อถอนที่ 1`,
                            subtitle: `รื้อถอนเมื่อ ${formatThaiDate(record.removal_date)}`,
                          })
                      : undefined
                  }
                />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">รูปภาพการรื้อถอนที่ 2</p>
              <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <DriveImage
                  fileId={record.removal_image_2_id}
                  alt="รูปภาพการรื้อถอนที่ 2"
                  className="h-full w-full"
                  onClick={
                    record.removal_image_2_id
                      ? () =>
                          onOpenLightbox({
                            fileId: record.removal_image_2_id,
                            fileUrl: record.removal_image_2_url,
                            title: `${crane.crane_name} — รูปภาพการรื้อถอนที่ 2`,
                            subtitle: `รื้อถอนเมื่อ ${formatThaiDate(record.removal_date)}`,
                          })
                      : undefined
                  }
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Activity Logs for this Crane */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <History className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">
            ประวัติการเปลี่ยนแปลงข้อมูลของเครนนี้
          </h3>
        </div>
        {craneLogs.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            ยังไม่มีประวัติการเปลี่ยนแปลงสำหรับเครนนี้ในปีการผลิตที่เลือก
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {craneLogs.map((log) => (
              <div
                key={log.log_id}
                className="flex flex-col justify-between gap-1 py-3 text-xs sm:flex-row sm:items-center"
              >
                <div>
                  <span className="font-semibold text-slate-800">{log.action_type}</span>
                  <span className="ml-2 text-slate-500">โดย {log.updated_by || 'ผู้ใช้งาน'}</span>
                </div>
                <span className="font-mono-num text-slate-400">
                  {formatThaiDateTime(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
