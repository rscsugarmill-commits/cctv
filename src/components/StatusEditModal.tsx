import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Trash2,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import type {
  CraneWithRecord,
  InstallStatus,
  ProductionYear,
  RemovalStatus,
} from '../types/cctv';
import {
  formatBytes,
  getTodayYmd,
  processImageFile,
  type ProcessedImage,
} from '../utils/imageProcessor';
import { ConfirmModal } from './ConfirmModal';
import { DriveImage } from './DriveImage';

interface StatusEditModalProps {
  open: boolean;
  items: CraneWithRecord[];
  selectedYear: ProductionYear | null;
  initialCraneId: string | null;
  initialTab: 'install' | 'removal';
  onClose: () => void;
  onSaved: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

interface ImageSlotState {
  existingFileId: string;
  existingFileUrl: string;
  newFile: ProcessedImage | null;
}

export function StatusEditModal({
  open,
  items,
  selectedYear,
  initialCraneId,
  initialTab,
  onClose,
  onSaved,
  onNotify,
}: StatusEditModalProps) {
  const [activeTab, setActiveTab] = useState<'install' | 'removal'>(initialTab);
  const [craneId, setCraneId] = useState<string>(initialCraneId || '');

  // Installation Form State
  const [installStatus, setInstallStatus] = useState<InstallStatus>('INSTALLED');
  const [installDate, setInstallDate] = useState<string>(getTodayYmd());
  const [installTechnician, setInstallTechnician] = useState<string>('');
  const [installNote, setInstallNote] = useState<string>('');
  const [installImg1, setInstallImg1] = useState<ImageSlotState>({
    existingFileId: '',
    existingFileUrl: '',
    newFile: null,
  });
  const [installImg2, setInstallImg2] = useState<ImageSlotState>({
    existingFileId: '',
    existingFileUrl: '',
    newFile: null,
  });

  // Removal Form State
  const [removalStatus, setRemovalStatus] = useState<RemovalStatus>('REMOVED');
  const [removalDate, setRemovalDate] = useState<string>(getTodayYmd());
  const [removalTechnician, setRemovalTechnician] = useState<string>('');
  const [removalNote, setRemovalNote] = useState<string>('');
  const [removalImg1, setRemovalImg1] = useState<ImageSlotState>({
    existingFileId: '',
    existingFileUrl: '',
    newFile: null,
  });
  const [removalImg2, setRemovalImg2] = useState<ImageSlotState>({
    existingFileId: '',
    existingFileUrl: '',
    newFile: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const technicianSuggestions = useMemo(() => {
    const set = new Set<string>();
    items.forEach(({ record }) => {
      if (record.install_technician) set.add(record.install_technician);
      if (record.removal_technician) set.add(record.removal_technician);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [items]);

  const currentItem = useMemo(
    () => items.find((i) => i.crane.crane_id === craneId) || items[0] || null,
    [items, craneId]
  );

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
    setCraneId(initialCraneId || items[0]?.crane.crane_id || '');
  }, [open, initialTab, initialCraneId, items]);

  useEffect(() => {
    if (!open || !currentItem) return;
    const rec = currentItem.record;
    setInstallStatus(rec.install_status === 'INSTALLED' ? 'INSTALLED' : 'INSTALLED');
    setInstallDate(rec.install_date || getTodayYmd());
    setInstallTechnician(rec.install_technician || '');
    setInstallNote(rec.install_note || '');
    setInstallImg1({
      existingFileId: rec.install_image_1_id || '',
      existingFileUrl: rec.install_image_1_url || '',
      newFile: null,
    });
    setInstallImg2({
      existingFileId: rec.install_image_2_id || '',
      existingFileUrl: rec.install_image_2_url || '',
      newFile: null,
    });

    setRemovalStatus(rec.removal_status === 'REMOVED' ? 'REMOVED' : 'REMOVED');
    setRemovalDate(rec.removal_date || getTodayYmd());
    setRemovalTechnician(rec.removal_technician || '');
    setRemovalNote(rec.removal_note || '');
    setRemovalImg1({
      existingFileId: rec.removal_image_1_id || '',
      existingFileUrl: rec.removal_image_1_url || '',
      newFile: null,
    });
    setRemovalImg2({
      existingFileId: rec.removal_image_2_id || '',
      existingFileUrl: rec.removal_image_2_url || '',
      newFile: null,
    });
  }, [open, currentItem]);

  if (!open || !currentItem || !selectedYear) return null;

  const handleFileChange = async (
    file: File | undefined,
    setter: React.Dispatch<React.SetStateAction<ImageSlotState>>
  ) => {
    if (!file) return;
    try {
      const processed = await processImageFile(file);
      setter({
        existingFileId: '',
        existingFileUrl: '',
        newFile: processed,
      });
    } catch (err: any) {
      onNotify('error', 'ไฟล์รูปภาพไม่ถูกต้อง', err?.message || 'กรุณาตรวจสอบไฟล์อีกครั้ง');
    }
  };

  const validateBeforeSave = (): boolean => {
    if (activeTab === 'install') {
      if (installStatus === 'INSTALLED') {
        if (!installDate) {
          onNotify('warning', 'กรุณาเลือกวันที่ติดตั้ง');
          return false;
        }
        if (!installTechnician.trim()) {
          onNotify('warning', 'กรุณาระบุชื่อช่างผู้ติดตั้ง');
          return false;
        }
        const hasImg1 = Boolean(installImg1.newFile || installImg1.existingFileId);
        const hasImg2 = Boolean(installImg2.newFile || installImg2.existingFileId);
        if (!hasImg1 || !hasImg2) {
          onNotify('warning', 'กรุณาแนบรูปภาพประกอบการติดตั้งให้ครบทั้ง 2 รูป');
          return false;
        }
      }
      return true;
    } else {
      if (removalStatus === 'REMOVED') {
        if (!removalDate) {
          onNotify('warning', 'กรุณาเลือกวันที่รื้อถอน');
          return false;
        }
        if (!removalTechnician.trim()) {
          onNotify('warning', 'กรุณาระบุชื่อช่างผู้รื้อถอน');
          return false;
        }
        const hasImg1 = Boolean(removalImg1.newFile || removalImg1.existingFileId);
        const hasImg2 = Boolean(removalImg2.newFile || removalImg2.existingFileId);
        if (!hasImg1 || !hasImg2) {
          onNotify('warning', 'กรุณาแนบรูปภาพประกอบการรื้อถอนให้ครบทั้ง 2 รูป');
          return false;
        }
      }
      return true;
    }
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateBeforeSave()) return;
    setConfirmOpen(true);
  };

  const executeSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setConfirmOpen(false);

    try {
      const cranePrefix = currentItem.crane.crane_name.replace(/\s+/g, '_');
      const yearPrefix = selectedYear.year_name.replace(/\//g, '-');

      if (activeTab === 'install') {
        let img1Id = installImg1.existingFileId;
        let img1Url = installImg1.existingFileUrl;
        let img2Id = installImg2.existingFileId;
        let img2Url = installImg2.existingFileUrl;

        if (installImg1.newFile) {
          setUploadProgressText('กำลังอัปโหลดรูปภาพติดตั้งที่ 1 ไปยัง Google Drive...');
          const up1 = await apiClient.uploadImageToDrive({
            fileName: `${yearPrefix}_${cranePrefix}_install_1_${installImg1.newFile.fileName}`,
            mimeType: installImg1.newFile.mimeType,
            base64Data: installImg1.newFile.base64Data,
          });
          img1Id = up1.fileId;
          img1Url = up1.fileUrl;
        }

        if (installImg2.newFile) {
          setUploadProgressText('กำลังอัปโหลดรูปภาพติดตั้งที่ 2 ไปยัง Google Drive...');
          const up2 = await apiClient.uploadImageToDrive({
            fileName: `${yearPrefix}_${cranePrefix}_install_2_${installImg2.newFile.fileName}`,
            mimeType: installImg2.newFile.mimeType,
            base64Data: installImg2.newFile.base64Data,
          });
          img2Id = up2.fileId;
          img2Url = up2.fileUrl;
        }

        setUploadProgressText('กำลังบันทึกข้อมูลงานติดตั้งลง Google Sheets...');
        await apiClient.saveInstallRecord({
          yearId: selectedYear.year_id,
          craneId: currentItem.crane.crane_id,
          installStatus,
          installDate: installStatus === 'INSTALLED' ? installDate : '',
          installTechnician: installStatus === 'INSTALLED' ? installTechnician.trim() : '',
          image1Id: installStatus === 'INSTALLED' ? img1Id : '',
          image1Url: installStatus === 'INSTALLED' ? img1Url : '',
          image2Id: installStatus === 'INSTALLED' ? img2Id : '',
          image2Url: installStatus === 'INSTALLED' ? img2Url : '',
          installNote: installNote.trim(),
        });

        onNotify(
          'success',
          'บันทึกงานติดตั้งสำเร็จ',
          `${currentItem.crane.crane_name} · อัปโหลดรูปและบันทึกข้อมูลลง Google Sheets เรียบร้อย`
        );
      } else {
        let img1Id = removalImg1.existingFileId;
        let img1Url = removalImg1.existingFileUrl;
        let img2Id = removalImg2.existingFileId;
        let img2Url = removalImg2.existingFileUrl;

        if (removalImg1.newFile) {
          setUploadProgressText('กำลังอัปโหลดรูปภาพรื้อถอนที่ 1 ไปยัง Google Drive...');
          const up1 = await apiClient.uploadImageToDrive({
            fileName: `${yearPrefix}_${cranePrefix}_removal_1_${removalImg1.newFile.fileName}`,
            mimeType: removalImg1.newFile.mimeType,
            base64Data: removalImg1.newFile.base64Data,
          });
          img1Id = up1.fileId;
          img1Url = up1.fileUrl;
        }

        if (removalImg2.newFile) {
          setUploadProgressText('กำลังอัปโหลดรูปภาพรื้อถอนที่ 2 ไปยัง Google Drive...');
          const up2 = await apiClient.uploadImageToDrive({
            fileName: `${yearPrefix}_${cranePrefix}_removal_2_${removalImg2.newFile.fileName}`,
            mimeType: removalImg2.newFile.mimeType,
            base64Data: removalImg2.newFile.base64Data,
          });
          img2Id = up2.fileId;
          img2Url = up2.fileUrl;
        }

        setUploadProgressText('กำลังบันทึกข้อมูลงานรื้อถอนลง Google Sheets...');
        await apiClient.saveRemovalRecord({
          yearId: selectedYear.year_id,
          craneId: currentItem.crane.crane_id,
          removalStatus,
          removalDate: removalStatus === 'REMOVED' ? removalDate : '',
          removalTechnician: removalStatus === 'REMOVED' ? removalTechnician.trim() : '',
          image1Id: removalStatus === 'REMOVED' ? img1Id : '',
          image1Url: removalStatus === 'REMOVED' ? img1Url : '',
          image2Id: removalStatus === 'REMOVED' ? img2Id : '',
          image2Url: removalStatus === 'REMOVED' ? img2Url : '',
          removalNote: removalNote.trim(),
        });

        onNotify(
          'success',
          'บันทึกงานรื้อถอนสำเร็จ',
          `${currentItem.crane.crane_name} · อัปโหลดรูปและบันทึกข้อมูลลง Google Sheets เรียบร้อย`
        );
      }

      await onSaved();
      onClose();
    } catch (err: any) {
      onNotify(
        'error',
        'บันทึกข้อมูลไม่สำเร็จ',
        err?.message || 'เกิดข้อผิดพลาดระหว่างอัปโหลดรูปภาพหรือบันทึกลง Google Sheets'
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgressText('');
    }
  };

  const renderImageUploader = (
    label: string,
    slot: ImageSlotState,
    setter: React.Dispatch<React.SetStateAction<ImageSlotState>>
  ) => {
    const hasImage = Boolean(slot.newFile || slot.existingFileId);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-700">{label} *</span>
          {slot.newFile && (
            <span className="font-mono-num text-[11px] text-emerald-700">
              พร้อมอัปโหลด ({formatBytes(slot.newFile.compressedSizeBytes)})
            </span>
          )}
          {!slot.newFile && slot.existingFileId && (
            <span className="text-[11px] text-blue-600">มีรูปเดิมใน Google Drive</span>
          )}
        </div>

        {hasImage ? (
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
              {slot.newFile ? (
                <img
                  src={slot.newFile.previewUrl}
                  alt={label}
                  className="h-full w-full object-cover"
                />
              ) : (
                <DriveImage
                  fileId={slot.existingFileId}
                  alt={label}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2">
              <label className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700">
                เปลี่ยนรูป
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isSubmitting}
                  onChange={(e) => {
                    handleFileChange(e.target.files?.[0], setter);
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  setter({ existingFileId: '', existingFileUrl: '', newFile: null })
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                ลบรูป
              </button>
            </div>
          </div>
        ) : (
          <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/40">
            <Upload className="h-6 w-6 text-slate-400" />
            <span className="mt-2 text-xs font-medium text-slate-700">
              คลิกเพื่อเลือกรูปภาพ
            </span>
            <span className="mt-0.5 text-[11px] text-slate-400">
              JPG, JPEG, PNG, WEBP (ย่อขนาดอัตโนมัติ)
            </span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={isSubmitting}
              onChange={(e) => {
                handleFileChange(e.target.files?.[0], setter);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className="no-print fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[1px] sm:p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Wrench className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-slate-900">
                  บันทึกข้อมูลและแก้ไขสถานะเครน
                </h2>
                <p className="truncate text-xs text-slate-500">
                  ปีการผลิต {selectedYear.year_name} · แยกข้อมูลงานติดตั้งและรื้อถอนอิสระจากกัน
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mode Tabs A / B */}
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-2.5">
            <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-200/70 p-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setActiveTab('install')}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                  activeTab === 'install'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A. งานติดตั้ง (Installation)
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setActiveTab('removal')}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                  activeTab === 'removal'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                B. งานรื้อถอน (Removal)
              </button>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleRequestSubmit} className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              {/* Crane & Production Year */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ชื่อเครน *
                  </label>
                  <select
                    value={currentItem.crane.crane_id}
                    onChange={(e) => setCraneId(e.target.value)}
                    disabled={isSubmitting}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500"
                  >
                    {items.map(({ crane }) => (
                      <option key={crane.crane_id} value={crane.crane_id}>
                        {crane.sort_order}. {crane.crane_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ปีการผลิต
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`ปีการผลิต ${selectedYear.year_name}`}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              {activeTab === 'install' ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        สถานะงานติดตั้ง *
                      </label>
                      <select
                        value={installStatus}
                        onChange={(e) => setInstallStatus(e.target.value as InstallStatus)}
                        disabled={isSubmitting}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                      >
                        <option value="INSTALLED">ติดตั้งแล้ว</option>
                        <option value="NOT_INSTALLED">ยังไม่ติดตั้ง</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        วันที่ติดตั้ง {installStatus === 'INSTALLED' && '*'}
                      </label>
                      <input
                        type="date"
                        value={installDate}
                        onChange={(e) => setInstallDate(e.target.value)}
                        disabled={isSubmitting || installStatus === 'NOT_INSTALLED'}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        ช่างผู้ติดตั้ง {installStatus === 'INSTALLED' && '*'}
                      </label>
                      <input
                        type="text"
                        list="technician-options"
                        value={installTechnician}
                        onChange={(e) => setInstallTechnician(e.target.value)}
                        disabled={isSubmitting || installStatus === 'NOT_INSTALLED'}
                        placeholder="พิมพ์หรือเลือกชื่อช่าง"
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {installStatus === 'INSTALLED' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {renderImageUploader('รูปภาพการติดตั้งที่ 1', installImg1, setInstallImg1)}
                      {renderImageUploader('รูปภาพการติดตั้งที่ 2', installImg2, setInstallImg2)}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      หมายเหตุงานติดตั้ง
                    </label>
                    <textarea
                      rows={2}
                      value={installNote}
                      onChange={(e) => setInstallNote(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="รายละเอียดเพิ่มเติม เช่น จุดติดตั้งกล้อง มุมกล้อง หรืออุปกรณ์เสริม..."
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        สถานะงานรื้อถอน *
                      </label>
                      <select
                        value={removalStatus}
                        onChange={(e) => setRemovalStatus(e.target.value as RemovalStatus)}
                        disabled={isSubmitting}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                      >
                        <option value="REMOVED">รื้อถอนแล้ว</option>
                        <option value="NOT_REMOVED">ยังไม่รื้อถอน</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        วันที่รื้อถอน {removalStatus === 'REMOVED' && '*'}
                      </label>
                      <input
                        type="date"
                        value={removalDate}
                        onChange={(e) => setRemovalDate(e.target.value)}
                        disabled={isSubmitting || removalStatus === 'NOT_REMOVED'}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        ช่างผู้รื้อถอน {removalStatus === 'REMOVED' && '*'}
                      </label>
                      <input
                        type="text"
                        list="technician-options"
                        value={removalTechnician}
                        onChange={(e) => setRemovalTechnician(e.target.value)}
                        disabled={isSubmitting || removalStatus === 'NOT_REMOVED'}
                        placeholder="พิมพ์หรือเลือกชื่อช่าง"
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {removalStatus === 'REMOVED' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {renderImageUploader('รูปภาพการรื้อถอนที่ 1', removalImg1, setRemovalImg1)}
                      {renderImageUploader('รูปภาพการรื้อถอนที่ 2', removalImg2, setRemovalImg2)}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      หมายเหตุงานรื้อถอน
                    </label>
                    <textarea
                      rows={2}
                      value={removalNote}
                      onChange={(e) => setRemovalNote(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="รายละเอียดการรื้อถอน สภาพอุปกรณ์ หรือจุดจัดเก็บ..."
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              <datalist id="technician-options">
                {technicianSuggestions.map((tech) => (
                  <option key={tech} value={tech} />
                ))}
              </datalist>

              {isSubmitting && (
                <div className="flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-800">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
                  <span>{uploadProgressText || 'กำลังบันทึกข้อมูล...'}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {activeTab === 'install' ? 'บันทึกงานติดตั้ง' : 'บันทึกงานรื้อถอน'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        variant="primary"
        title={
          activeTab === 'install'
            ? `ยืนยันบันทึกงานติดตั้ง "${currentItem.crane.crane_name}"`
            : `ยืนยันบันทึกงานรื้อถอน "${currentItem.crane.crane_name}"`
        }
        description={
          activeTab === 'install'
            ? `ระบบจะอัปโหลดรูปภาพ (ถ้ามี) ไปยัง Google Drive และอัปเดตสถานะงานติดตั้งสำหรับปีการผลิต ${selectedYear.year_name} ลง Google Sheets โดยไม่กระทบข้อมูลงานรื้อถอนเดิม`
            : `ระบบจะอัปโหลดรูปภาพ (ถ้ามี) ไปยัง Google Drive และอัปเดตสถานะงานรื้อถอนสำหรับปีการผลิต ${selectedYear.year_name} ลง Google Sheets โดยไม่กระทบข้อมูลงานติดตั้งเดิม`
        }
        confirmLabel="ยืนยันบันทึกข้อมูล"
        onConfirm={executeSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
