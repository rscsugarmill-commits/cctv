import { useState } from 'react';
import { CalendarRange, Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import type { CraneRecord, ProductionYear } from '../types/cctv';
import { formatThaiDateTime } from '../utils/imageProcessor';
import { ConfirmModal } from './ConfirmModal';

interface YearsManagementViewProps {
  years: ProductionYear[];
  records: CraneRecord[];
  selectedYearId: string;
  onSelectYear: (yearId: string) => void;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export function YearsManagementView({
  years,
  records,
  selectedYearId,
  onSelectYear,
  onRefresh,
  onNotify,
}: YearsManagementViewProps) {
  const [newYearName, setNewYearName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ProductionYear | null>(null);
  const [busy, setBusy] = useState(false);

  const activeYears = years.filter((y) => y.is_active);

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newYearName.trim();
    if (!trimmed) {
      onNotify('warning', 'กรุณาระบุชื่อปีการผลิต เช่น 2570/71');
      return;
    }
    setBusy(true);
    try {
      const res = await apiClient.createYear(trimmed);
      setNewYearName('');
      await onRefresh();
      if (res.year_id) onSelectYear(res.year_id);
      onNotify(
        'success',
        `เพิ่มปีการผลิต "${trimmed}" สำเร็จ`,
        'สร้างชุดข้อมูลเครนเริ่มต้นสำหรับปีนี้เรียบร้อยแล้ว'
      );
    } catch (err: any) {
      onNotify('error', 'เพิ่มปีการผลิตไม่สำเร็จ', err?.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (yearId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      onNotify('warning', 'ชื่อปีการผลิตต้องไม่ว่าง');
      return;
    }
    setBusy(true);
    try {
      await apiClient.updateYear(yearId, trimmed);
      setEditingId(null);
      await onRefresh();
      onNotify('success', 'แก้ไขชื่อปีการผลิตสำเร็จ');
    } catch (err: any) {
      onNotify('error', 'แก้ไขปีการผลิตไม่สำเร็จ', err?.message);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (activeYears.length <= 1) {
      onNotify('warning', 'ไม่สามารถลบปีการผลิตสุดท้ายได้', 'ต้องมีปีการผลิตอย่างน้อย 1 ปีในระบบ');
      setDeleteTarget(null);
      return;
    }
    setBusy(true);
    try {
      await apiClient.deleteYear(deleteTarget.year_id);
      setDeleteTarget(null);
      await onRefresh();
      onNotify('success', `ลบปีการผลิต "${deleteTarget.year_name}" เรียบร้อยแล้ว`);
    } catch (err: any) {
      onNotify('error', 'ลบปีการผลิตไม่สำเร็จ', err?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Production Year */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2.5">
          <CalendarRange className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">เพิ่มปีการผลิตใหม่</h2>
            <p className="text-xs text-slate-500">
              เมื่อเพิ่มปีการผลิตใหม่ ระบบจะสร้างชุดข้อมูลเครนทั้งหมดให้ปีนั้นโดยอัตโนมัติ (แยกข้อมูลออกจากปีอื่น)
            </p>
          </div>
        </div>

        <form onSubmit={handleAddYear} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={newYearName}
            onChange={(e) => setNewYearName(e.target.value)}
            disabled={busy}
            placeholder="ระบุปีการผลิต เช่น 2570/71"
            className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มปีการผลิต</span>
          </button>
        </form>
      </section>

      {/* Years List */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">
            รายการปีการผลิตทั้งหมด ({activeYears.length} ปี)
          </h3>
        </div>

        {activeYears.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            ยังไม่มีปีการผลิตในระบบ
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeYears.map((y) => {
              const yearRecs = records.filter((r) => r.year_id === y.year_id);
              const installedCount = yearRecs.filter(
                (r) => r.install_status === 'INSTALLED'
              ).length;
              const removedCount = yearRecs.filter(
                (r) => r.removal_status === 'REMOVED'
              ).length;
              const isSelected = y.year_id === selectedYearId;
              const isEditing = editingId === y.year_id;

              return (
                <div
                  key={y.year_id}
                  className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          disabled={busy}
                          className="h-9 w-48 rounded-lg border border-blue-400 px-3 text-sm font-medium text-slate-900 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(y.year_id)}
                          disabled={busy}
                          className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          บันทึก
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={busy}
                          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-semibold text-slate-900">
                          ปีการผลิต {y.year_name}
                        </span>
                        {isSelected && (
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            กำลังดูข้อมูลปีนี้
                          </span>
                        )}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      ติดตั้งแล้ว <span className="font-mono-num">{installedCount}</span> รายการ ·
                      รื้อถอนแล้ว <span className="font-mono-num">{removedCount}</span> รายการ ·
                      สร้างเมื่อ {formatThaiDateTime(y.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!isSelected && (
                      <button
                        type="button"
                        onClick={() => onSelectYear(y.year_id)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        เลือกดูข้อมูล
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(y.year_id);
                        setEditingName(y.year_name);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      แก้ไขชื่อ
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setDeleteTarget(y)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      ลบ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        variant="danger"
        loading={busy}
        title={`ยืนยันลบปีการผลิต "${deleteTarget?.year_name || ''}"`}
        description="การลบปีการผลิตจะซ่อนปีนี้ออกจากหน้าหลัก เพื่อป้องกันการลบข้อมูลโดยไม่ตั้งใจ (ประวัติการทำงานใน Google Sheets ยังคงถูกเก็บรักษาไว้)"
        confirmLabel="ยืนยันลบปีการผลิต"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
