import { useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Download,
  FileSpreadsheet,
  Printer,
  Search,
} from 'lucide-react';
import type {
  Crane,
  CraneRecord,
  ProductionYear,
  SheetsDataset,
  SummaryFilterStatus,
} from '../types/cctv';
import { downloadTextFile, formatThaiDate } from '../utils/imageProcessor';
import { DriveImage } from './DriveImage';

interface SummaryViewProps {
  dataset: SheetsDataset;
  selectedYearId: string;
  onSelectYear: (yearId: string) => void;
  statusFilter: SummaryFilterStatus;
  onChangeStatusFilter: (status: SummaryFilterStatus) => void;
  onOpenLightbox: (img: {
    fileId: string;
    fileUrl?: string;
    title: string;
    subtitle?: string;
  }) => void;
  onViewDetail: (craneId: string) => void;
}

const STATUS_OPTIONS: Array<{ value: SummaryFilterStatus; label: string }> = [
  { value: 'INSTALLED', label: 'ติดตั้งแล้ว' },
  { value: 'NOT_INSTALLED', label: 'ยังไม่ติดตั้ง' },
  { value: 'REMOVED', label: 'รื้อถอนแล้ว' },
  { value: 'NOT_REMOVED', label: 'ยังไม่รื้อถอน' },
];

export function SummaryView({
  dataset,
  selectedYearId,
  onSelectYear,
  statusFilter,
  onChangeStatusFilter,
  onOpenLightbox,
  onViewDetail,
}: SummaryViewProps) {
  const [search, setSearch] = useState('');
  const [dateSort, setDateSort] = useState<'order' | 'date_desc' | 'date_asc'>('date_desc');

  const activeYears = useMemo(
    () => dataset.years.filter((y) => y.is_active),
    [dataset.years]
  );

  const selectedYear = useMemo(
    () => activeYears.find((y) => y.year_id === selectedYearId) || activeYears[0] || null,
    [activeYears, selectedYearId]
  );

  const activeCranes = useMemo(
    () =>
      dataset.cranes
        .filter((c) => c.is_active)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    [dataset.cranes]
  );

  const recordMap = useMemo(() => {
    const map = new Map<string, CraneRecord>();
    dataset.records
      .filter((r) => selectedYear && r.year_id === selectedYear.year_id)
      .forEach((r) => map.set(r.crane_id, r));
    return map;
  }, [dataset.records, selectedYear]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const isInstallGroup =
      statusFilter === 'INSTALLED' || statusFilter === 'NOT_INSTALLED';

    const list: Array<{
      crane: Crane;
      record?: CraneRecord;
      workDate: string;
      technician: string;
      note: string;
      img1Id: string;
      img1Url: string;
      img2Id: string;
      img2Url: string;
    }> = [];

    for (const crane of activeCranes) {
      if (q && !crane.crane_name.toLowerCase().includes(q)) continue;
      const rec = recordMap.get(crane.crane_id);
      const installStatus = rec?.install_status || 'NOT_INSTALLED';
      const removalStatus = rec?.removal_status || 'NOT_REMOVED';

      const matches =
        (statusFilter === 'INSTALLED' && installStatus === 'INSTALLED') ||
        (statusFilter === 'NOT_INSTALLED' && installStatus === 'NOT_INSTALLED') ||
        (statusFilter === 'REMOVED' && removalStatus === 'REMOVED') ||
        (statusFilter === 'NOT_REMOVED' && removalStatus === 'NOT_REMOVED');

      if (!matches) continue;

      list.push({
        crane,
        record: rec,
        workDate: isInstallGroup ? rec?.install_date || '' : rec?.removal_date || '',
        technician: isInstallGroup
          ? rec?.install_technician || ''
          : rec?.removal_technician || '',
        note: isInstallGroup ? rec?.install_note || '' : rec?.removal_note || '',
        img1Id: isInstallGroup
          ? rec?.install_image_1_id || ''
          : rec?.removal_image_1_id || '',
        img1Url: isInstallGroup
          ? rec?.install_image_1_url || ''
          : rec?.removal_image_1_url || '',
        img2Id: isInstallGroup
          ? rec?.install_image_2_id || ''
          : rec?.removal_image_2_id || '',
        img2Url: isInstallGroup
          ? rec?.install_image_2_url || ''
          : rec?.removal_image_2_url || '',
      });
    }

    list.sort((a, b) => {
      if (dateSort === 'order') return a.crane.sort_order - b.crane.sort_order;
      if (dateSort === 'date_asc') {
        return (a.workDate || '9999-99-99').localeCompare(b.workDate || '9999-99-99');
      }
      return (b.workDate || '').localeCompare(a.workDate || '');
    });

    return list;
  }, [activeCranes, recordMap, search, statusFilter, dateSort]);

  const currentStatusLabel =
    STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label || '';

  const handlePrintPdf = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const header = [
      'ลำดับ',
      'ชื่อเครน',
      'ปีการผลิต',
      'สถานะรายงาน',
      'วันที่ดำเนินงาน',
      'ช่างผู้ปฏิบัติงาน',
      'หมายเหตุ',
      'ลิงก์รูปที่ 1',
      'ลิงก์รูปที่ 2',
    ];
    const csvRows = rows.map((row) => [
      row.crane.sort_order,
      row.crane.crane_name,
      selectedYear?.year_name || '',
      currentStatusLabel,
      row.workDate || '-',
      row.technician || '-',
      (row.note || '-').replace(/\r?\n/g, ' '),
      row.img1Url || '-',
      row.img2Url || '-',
    ]);
    const csvContent =
      '\uFEFF' +
      [header, ...csvRows]
        .map((cols) =>
          cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');
    downloadTextFile(
      `cctv-summary-${selectedYear?.year_name || 'all'}-${statusFilter}.csv`,
      csvContent,
      'text/csv;charset=utf-8;'
    );
  };

  const handleExportJsonBackup = () => {
    downloadTextFile(
      `cctv-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(dataset, null, 2),
      'application/json'
    );
  };

  return (
    <div className="space-y-5">
      {/* Filter & Export Bar */}
      <div className="no-print flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {/* 4-status Dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-500">
              สถานะที่ต้องการตรวจสอบ
            </label>
            <select
              value={statusFilter}
              onChange={(e) => onChangeStatusFilter(e.target.value as SummaryFilterStatus)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Production Year Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500">ปีการผลิต</label>
            <select
              value={selectedYear?.year_id || ''}
              onChange={(e) => onSelectYear(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            >
              {activeYears.map((y) => (
                <option key={y.year_id} value={y.year_id}>
                  ปีการผลิต {y.year_name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-slate-500">ค้นหาชื่อเครน</label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="พิมพ์ชื่อเครน..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Sort by Date */}
          <div>
            <label className="block text-xs font-medium text-slate-500">เรียงลำดับ</label>
            <div className="mt-1 flex items-center gap-2">
              <select
                value={dateSort}
                onChange={(e) =>
                  setDateSort(e.target.value as 'order' | 'date_desc' | 'date_asc')
                }
                className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
              >
                <option value="date_desc">วันที่ล่าสุดก่อน</option>
                <option value="date_asc">วันที่เก่าสุดก่อน</option>
                <option value="order">ตามลำดับเครน</option>
              </select>
              {dateSort === 'date_asc' ? (
                <ArrowUpNarrowWide className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <ArrowDownWideNarrow className="h-4 w-4 shrink-0 text-slate-400" />
              )}
            </div>
          </div>
        </div>

        {/* Summary Action Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="text-sm text-slate-700">
            พบรายการสถานะ{' '}
            <strong className="font-semibold text-slate-900">{currentStatusLabel}</strong>{' '}
            จำนวน{' '}
            <strong className="font-mono-num text-blue-700">{rows.length}</strong>{' '}
            รายการ จากทั้งหมด{' '}
            <strong className="font-mono-num">{activeCranes.length}</strong> เครน
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportJsonBackup}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Backup JSON
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
            >
              <Printer className="h-3.5 w-3.5" />
              พิมพ์รายงาน / Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Print Report Header (Visible on Print/PDF) */}
      <div className="hidden print-only border-b border-slate-300 pb-3">
        <h2 className="text-lg font-bold text-slate-900">
          รายงานสรุปสถานะกล้องวงจรปิดประจำเครน — {currentStatusLabel}
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          ปีการผลิต: {selectedYear?.year_name || '-'} · จำนวน: {rows.length} เครน · พิมพ์เมื่อ:{' '}
          {formatThaiDate(new Date().toISOString())}
        </p>
      </div>

      {/* Summary List */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-800">
            ไม่มีเครนที่ตรงกับสถานะ "{currentStatusLabel}"
          </p>
          <p className="mt-1 text-xs text-slate-500">
            ลองเลือกสถานะอื่น หรือเปลี่ยนคำค้นหาในตัวกรองด้านบน
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <article
              key={row.crane.crane_id}
              className="print-break-inside-avoid flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 md:flex-row md:items-start"
            >
              {/* Left Text Info */}
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={() => onViewDetail(row.crane.crane_id)}
                    className="text-left text-base font-semibold text-slate-900 hover:text-blue-600"
                  >
                    {row.crane.sort_order}. {row.crane.crane_name}
                  </button>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      statusFilter === 'INSTALLED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : statusFilter === 'NOT_INSTALLED'
                          ? 'bg-amber-50 text-amber-700'
                          : statusFilter === 'REMOVED'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {currentStatusLabel}
                  </span>
                </div>

                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-slate-500">ปีการผลิต</dt>
                    <dd className="font-medium text-slate-800">
                      {selectedYear?.year_name || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">วันที่ดำเนินงาน</dt>
                    <dd className="font-mono-num font-medium text-slate-800">
                      {formatThaiDate(row.workDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">ชื่อช่างผู้รับผิดชอบ</dt>
                    <dd className="font-medium text-slate-800">{row.technician || '-'}</dd>
                  </div>
                </dl>

                <div>
                  <span className="text-xs text-slate-500">หมายเหตุ: </span>
                  <span className="text-sm text-slate-700">{row.note || '-'}</span>
                </div>
              </div>

              {/* Right 2 Photo Thumbnails at 4:5 Ratio (~4cm x 5cm) */}
              <div className="flex shrink-0 flex-wrap items-start gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="summary-photo-thumb h-[5cm] w-[4cm] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <DriveImage
                      fileId={row.img1Id}
                      alt={`${row.crane.crane_name} รูปที่ 1`}
                      className="h-full w-full"
                      fallbackLabel="ไม่มีรูปที่ 1"
                      onClick={
                        row.img1Id
                          ? () =>
                              onOpenLightbox({
                                fileId: row.img1Id,
                                fileUrl: row.img1Url,
                                title: `${row.crane.crane_name} — รูปภาพที่ 1`,
                                subtitle: `${currentStatusLabel} · ${formatThaiDate(row.workDate)}`,
                              })
                          : undefined
                      }
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">รูปที่ 1 (4:5)</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="summary-photo-thumb h-[5cm] w-[4cm] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <DriveImage
                      fileId={row.img2Id}
                      alt={`${row.crane.crane_name} รูปที่ 2`}
                      className="h-full w-full"
                      fallbackLabel="ไม่มีรูปที่ 2"
                      onClick={
                        row.img2Id
                          ? () =>
                              onOpenLightbox({
                                fileId: row.img2Id,
                                fileUrl: row.img2Url,
                                title: `${row.crane.crane_name} — รูปภาพที่ 2`,
                                subtitle: `${currentStatusLabel} · ${formatThaiDate(row.workDate)}`,
                              })
                          : undefined
                      }
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">รูปที่ 2 (4:5)</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
