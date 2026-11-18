import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import type { ActivityLog, Crane, CraneRecord } from '../types/cctv';
import { ConfirmModal } from './ConfirmModal';

interface CranesManagementViewProps {
  cranes: Crane[];
  records: CraneRecord[];
  logs: ActivityLog[];
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export function CranesManagementView({
  cranes,
  records,
  logs,
  onRefresh,
  onNotify,
}: CranesManagementViewProps) {
  const [search, setSearch] = useState('');
  const [newCraneName, setNewCraneName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{
    crane: Crane;
    hasHistory: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const activeCranes = useMemo(
    () =>
      cranes
        .filter((c) => c.is_active)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    [cranes]
  );

  const filteredCranes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeCranes;
    return activeCranes.filter((c) => c.crane_name.toLowerCase().includes(q));
  }, [activeCranes, search]);

  const handleAddCrane = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCraneName.trim();
    if (!trimmed) {
      onNotify('warning', 'กรุณาระบุชื่อเครน');
      return;
    }
    setBusy(true);
    try {
      await apiClient.createCrane(trimmed);
      setNewCraneName('');
      await onRefresh();
      onNotify(
        'success',
        `เพิ่มเครน "${trimmed}" สำเร็จ`,
        'สร้างรายการในทุกปีการผลิตที่ใช้งานอยู่เรียบร้อยแล้ว'
      );
    } catch (err: any) {
      onNotify('error', 'เพิ่มเครนไม่สำเร็จ', err?.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (craneId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      onNotify('warning', 'ชื่อเครนต้องไม่ว่าง');
      return;
    }
    setBusy(true);
    try {
      await apiClient.updateCrane(craneId, trimmed);
      setEditingId(null);
      await onRefresh();
      onNotify('success', 'แก้ไขชื่อเครนสำเร็จ');
    } catch (err: any) {
      onNotify('error', 'แก้ไขชื่อเครนไม่สำเร็จ', err?.message);
    } finally {
      setBusy(false);
    }
  };

  const handleMoveOrder = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= activeCranes.length) return;
    const swapped = activeCranes.slice();
    const temp = swapped[index];
    swapped[index] = swapped[targetIndex];
    swapped[targetIndex] = temp;

    const orders: Record<string, number> = {};
    swapped.forEach((c, idx) => {
      orders[c.crane_id] = idx + 1;
    });

    setBusy(true);
    try {
      await apiClient.reorderCranes(orders);
      await onRefresh();
      onNotify('success', 'อัปเดตลำดับเครนเรียบร้อยแล้ว');
    } catch (err: any) {
      onNotify('error', 'เรียงลำดับเครนไม่สำเร็จ', err?.message);
    } finally {
      setBusy(false);
    }
  };

  const requestDelete = (crane: Crane) => {
    const hasRec = records.some(
      (r) =>
        r.crane_id === crane.crane_id &&
        (r.install_status === 'INSTALLED' || r.removal_status === 'REMOVED')
    );
    const hasLog = logs.some((l) => l.crane_id === crane.crane_id);
    setDeleteTarget({ crane, hasHistory: hasRec || hasLog });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.deleteCrane(deleteTarget.crane.crane_id);
      setDeleteTarget(null);
      await onRefresh();
      onNotify(
        'success',
        `ลบเครน "${deleteTarget.crane.crane_name}" แล้ว`,
        'ประวัติการทำงานเดิมยังคงถูกเก็บรักษาไว้ในฐานข้อมูล'
      );
    } catch (err: any) {
      onNotify('error', 'ลบเครนไม่สำเร็จ', err?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Crane Box */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Wrench className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">เพิ่มรายชื่อเครนใหม่</h2>
              <p className="text-xs text-slate-500">
                จำนวนเครนทั้งหมดในระบบปัจจุบัน{' '}
                <strong className="font-mono-num text-slate-800">{activeCranes.length}</strong>{' '}
                จุด
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddCrane} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={newCraneName}
            onChange={(e) => setNewCraneName(e.target.value)}
            disabled={busy}
            placeholder="ระบุชื่อเครนใหม่ เช่น เครน..."
            className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มเครนใหม่</span>
          </button>
        </form>
      </section>

      {/* Search & Master List */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
          <h3 className="text-sm font-semibold text-slate-900">
            รายชื่อเครนทั้งหมด ({filteredCranes.length} รายการ)
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหารายชื่อเครน..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredCranes.map((crane) => {
            const fullIndex = activeCranes.findIndex((c) => c.crane_id === crane.crane_id);
            const isEditing = editingId === crane.crane_id;
            return (
              <div
                key={crane.crane_id}
                className="flex flex-col justify-between gap-3 px-5 py-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="font-mono-num w-8 shrink-0 text-center text-xs font-semibold text-slate-400">
                    {crane.sort_order}
                  </span>
                  {isEditing ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        disabled={busy}
                        className="h-9 flex-1 max-w-sm rounded-lg border border-blue-400 px-3 text-sm text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleSaveEdit(crane.crane_id)}
                        className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                        บันทึก
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <span className="truncate text-sm font-medium text-slate-900">
                      {crane.crane_name}
                    </span>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!search.trim() && (
                      <>
                        <button
                          type="button"
                          disabled={busy || fullIndex === 0}
                          onClick={() => handleMoveOrder(fullIndex, -1)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          title="เลื่อนขึ้น"
                          aria-label="เลื่อนขึ้น"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busy || fullIndex === activeCranes.length - 1}
                          onClick={() => handleMoveOrder(fullIndex, 1)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          title="เลื่อนลง"
                          aria-label="เลื่อนลง"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(crane.crane_id);
                        setEditingName(crane.crane_name);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      แก้ไขชื่อ
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => requestDelete(crane)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      ลบ
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        variant="danger"
        loading={busy}
        title={`ยืนยันลบเครน "${deleteTarget?.crane.crane_name || ''}"`}
        description={
          deleteTarget?.hasHistory
            ? 'คำเตือน: เครนนี้มีประวัติการติดตั้ง/รื้อถอนหรือบันทึกกิจกรรมอยู่แล้ว\nหากยืนยันลบ ระบบจะซ่อนเครนจากรายการใช้งานปัจจุบัน แต่ยังคงเก็บรักษาประวัติเดิมไว้ใน Google Sheets เพื่อป้องกันข้อมูลสูญหาย'
            : 'ยืนยันการนำเครนนี้ออกจากรายการเครนที่ใช้งานอยู่ (ประวัติเดิมใน Google Sheets ยังคงถูกเก็บรักษาไว้)'
        }
        confirmLabel="ยืนยันลบเครน"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
