import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  FolderOpen,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_SPREADSHEET_ID,
} from '../constants/initialData';
import { apiClient } from '../services/apiClient';
import type { ConnectionMode } from '../types/cctv';

interface ConnectionSetupViewProps {
  connectionMode: ConnectionMode;
  userEmail?: string;
  spreadsheetId: string;
  driveFolderId: string;
  spreadsheetTitle?: string;
  hasServerGasUrl: boolean;
  gasUrlInput: string;
  gasSecretInput: string;
  isSigningIn: boolean;
  isConnectingGas: boolean;
  isBootstrapping: boolean;
  lastError: string | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleLogout: () => Promise<void>;
  onConnectGas: (url: string, secret: string) => Promise<void>;
  onDisconnectGas: () => void;
  onBootstrapSheets: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export function ConnectionSetupView({
  connectionMode,
  userEmail,
  spreadsheetId,
  driveFolderId,
  spreadsheetTitle,
  hasServerGasUrl,
  gasUrlInput,
  gasSecretInput,
  isSigningIn,
  isConnectingGas,
  isBootstrapping,
  lastError,
  onGoogleSignIn,
  onGoogleLogout,
  onConnectGas,
  onDisconnectGas,
  onBootstrapSheets,
  onNotify,
}: ConnectionSetupViewProps) {
  const [urlValue, setUrlValue] = useState(gasUrlInput);
  const [secretValue, setSecretValue] = useState(gasSecretInput);
  const [gasCode, setGasCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setUrlValue(gasUrlInput);
  }, [gasUrlInput]);

  useEffect(() => {
    setSecretValue(gasSecretInput);
  }, [gasSecretInput]);

  useEffect(() => {
    setLoadingCode(true);
    apiClient
      .getGasTemplate()
      .then((text) => setGasCode(text))
      .catch(() => setGasCode('// ไม่สามารถโหลดไฟล์แม่แบบ Code.gs ได้'))
      .finally(() => setLoadingCode(false));
  }, []);

  const handleCopyCode = async () => {
    if (!gasCode) return;
    await navigator.clipboard.writeText(gasCode);
    setCopiedCode(true);
    onNotify('success', 'คัดลอกโค้ด Google Apps Script (Code.gs) แล้ว');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSubmitGas = (e: React.FormEvent) => {
    e.preventDefault();
    onConnectGas(urlValue.trim(), secretValue.trim());
  };

  const targetSheetId = spreadsheetId || DEFAULT_SPREADSHEET_ID;
  const targetFolderId = driveFolderId || DEFAULT_DRIVE_FOLDER_ID;

  return (
    <div className="space-y-6">
      {/* Honest Connection Status Banner */}
      <section
        className={`rounded-xl border p-5 ${
          connectionMode === 'disconnected'
            ? 'border-amber-200 bg-amber-50/60'
            : 'border-emerald-200 bg-emerald-50/50'
        }`}
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            {connectionMode === 'disconnected' ? (
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            )}
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {connectionMode === 'google_oauth'
                  ? 'เชื่อมต่อ Google Workspace (OAuth) สำเร็จ'
                  : connectionMode === 'apps_script'
                    ? 'เชื่อมต่อ Google Apps Script Web App สำเร็จ'
                    : 'ยังไม่ได้เชื่อมต่อฐานข้อมูล Google Sheets และ Google Drive'}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {connectionMode === 'disconnected'
                  ? 'ระบบจะไม่ใช้ข้อมูลจำลองหรือ Local Storage เป็นฐานข้อมูลหลัก กรุณาเชื่อมต่อด้วยบัญชี Google หรือ Google Apps Script Web App ด้านล่างเพื่อใช้งานข้อมูลจริง'
                  : `ฐานข้อมูล: ${spreadsheetTitle || targetSheetId}${userEmail ? ` · บัญชี: ${userEmail}` : ''}`}
              </p>
            </div>
          </div>

          {connectionMode !== 'disconnected' && (
            <button
              type="button"
              onClick={onBootstrapSheets}
              disabled={isBootstrapping}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              {isBootstrapping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>สร้าง/ตรวจสอบชีต 4 ตารางและ 43 เครน</span>
            </button>
          )}
        </div>

        {lastError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-white px-4 py-3 text-xs text-red-700">
            <strong className="font-semibold">รายละเอียดข้อผิดพลาดล่าสุด:</strong> {lastError}
          </div>
        )}
      </section>

      {/* Target IDs Overview */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Database className="h-4 w-4 text-emerald-600" />
              <span>Google Sheets ID (ฐานข้อมูลหลัก)</span>
            </div>
            <a
              href={`https://docs.google.com/spreadsheets/d/${targetSheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <span>เปิด Google Sheets</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="font-mono-num mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
            {targetSheetId}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <FolderOpen className="h-4 w-4 text-blue-600" />
              <span>Google Drive Folder ID (จัดเก็บรูปภาพส่วนตัว)</span>
            </div>
            <a
              href={`https://drive.google.com/drive/folders/${targetFolderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <span>เปิดโฟลเดอร์ Drive</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="font-mono-num mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
            {targetFolderId}
          </p>
        </div>
      </section>

      {/* Two Connection Methods */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Method 1: Google Workspace OAuth */}
        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-semibold text-slate-900">
                วิธีที่ 1: เชื่อมต่อผ่านบัญชี Google โดยตรง
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              เข้าสู่ระบบด้วยบัญชี Google ที่มีสิทธิ์แก้ไข Google Sheets และโฟลเดอร์ Google Drive
              เป้าหมาย ระบบจะเก็บ Token ชั่วคราวในหน่วยความจำเท่านั้น และไม่เปิดแชร์รูปภาพเป็น Public
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {connectionMode === 'google_oauth' ? (
              <button
                type="button"
                onClick={onGoogleLogout}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                ออกจากระบบ Google
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={isSigningIn}
                className="gsi-material-button"
              >
                <div className="gsi-material-button-state" />
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isSigningIn ? 'กำลังเข้าสู่ระบบ...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            )}
          </div>
        </section>

        {/* Method 2: Google Apps Script Web App */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">
              วิธีที่ 2: เชื่อมต่อผ่าน Google Apps Script Web App API (แนะนำสำหรับองค์กร)
            </h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            เชื่อมต่อผ่าน Backend Proxy ไปยัง Google Apps Script Web App ที่รันด้วยสิทธิ์เจ้าของไฟล์โดยตรง
            รองรับทุกอุปกรณ์โดยผู้ใช้ไม่ต้องขอสิทธิ์ Google OAuth รายบุคคล
            {hasServerGasUrl && ' (พบการตั้งค่า GAS_WEB_APP_URL ใน Server Environment แล้ว)'}
          </p>

          <form onSubmit={handleSubmitGas} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Web App URL (https://script.google.com/macros/s/.../exec)
              </label>
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                required
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                API Secret (ถ้าตั้งค่าไว้ใน Script Properties)
              </label>
              <input
                type="password"
                value={secretValue}
                onChange={(e) => setSecretValue(e.target.value)}
                placeholder="ไม่บังคับ หากไม่ได้ตั้งค่า API_SECRET"
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isConnectingGas}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {isConnectingGas && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>เชื่อมต่อ Apps Script</span>
              </button>
              {connectionMode === 'apps_script' && (
                <button
                  type="button"
                  onClick={onDisconnectGas}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  ตัดการเชื่อมต่อ
                </button>
              )}
            </div>
          </form>
        </section>
      </div>

      {/* Deployment Guide & Schema Documentation */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <BookOpen className="h-5 w-5 text-slate-700" />
          <h3 className="text-base font-semibold text-slate-900">
            คู่มือการติดตั้ง Google Apps Script, โครงสร้าง Google Sheets และการ Deploy
          </h3>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3 text-xs leading-relaxed text-slate-700">
            <h4 className="text-sm font-semibold text-slate-900">
              ขั้นตอนการติดตั้ง Google Apps Script Web App
            </h4>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                เปิด{' '}
                <a
                  href="https://script.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 underline"
                >
                  script.google.com
                </a>{' '}
                ด้วยบัญชี Google ที่เป็นเจ้าของ Google Sheet และ Google Drive Folder
              </li>
              <li>
                สร้างโปรเจกต์ใหม่ ตั้งชื่อว่า <strong>CCTV Crane Management API</strong> แล้วคัดลอกโค้ด{' '}
                <code className="rounded bg-slate-100 px-1 py-0.5">Code.gs</code> ด้านขวามือไปวางแทนที่ทั้งหมด
              </li>
              <li>
                (แนะนำด้านความปลอดภัย) ไปที่ <strong>Project Settings &rarr; Script Properties</strong>{' '}
                เพิ่ม Property ชื่อ <code className="rounded bg-slate-100 px-1 py-0.5">API_SECRET</code>{' '}
                เพื่อป้องกันการเรียกใช้ API โดยไม่ได้รับอนุญาต
              </li>
              <li>
                กด <strong>Deploy &rarr; New deployment</strong> เลือกประเภท <strong>Web app</strong>{' '}
                โดยตั้งค่า:
                <ul className="mt-1 list-disc pl-5 text-slate-600">
                  <li>
                    Execute as: <strong>Me</strong>
                  </li>
                  <li>
                    Who has access: <strong>Anyone</strong> (ปลอดภัยเมื่อใช้ร่วมกับ API_SECRET ผ่าน Server Proxy)
                  </li>
                </ul>
              </li>
              <li>
                นำ Web App URL ที่ได้มาเชื่อมต่อในช่องด้านบน หรือกำหนดในไฟล์{' '}
                <code className="rounded bg-slate-100 px-1 py-0.5">.env</code> ของ Server (
                <code className="rounded bg-slate-100 px-1 py-0.5">GAS_WEB_APP_URL</code> และ{' '}
                <code className="rounded bg-slate-100 px-1 py-0.5">GAS_API_SECRET</code>)
              </li>
              <li>
                กดปุ่ม <strong>"สร้าง/ตรวจสอบชีต 4 ตารางและ 43 เครน"</strong>{' '}
                ระบบจะสร้างแท็บทั้งหมด ปี 2569/70 และรายชื่อเครนเริ่มต้น 43 ตัวลงใน Google Sheets ให้อัตโนมัติ
              </li>
            </ol>

            <h4 className="pt-2 text-sm font-semibold text-slate-900">
              โครงสร้างตาราง Google Sheets (4 Sheets)
            </h4>
            <ul className="list-disc space-y-1 pl-5 text-slate-600">
              <li>
                <strong>ProductionYears</strong>: year_id, year_name, created_at, is_active
              </li>
              <li>
                <strong>Cranes</strong>: crane_id, crane_name, sort_order, is_active, created_at
              </li>
              <li>
                <strong>CraneRecords</strong>: record_id, year_id, crane_id, install_status,
                install_date, install_technician, install_image_1_id/url, install_image_2_id/url,
                install_note, removal_status, removal_date, removal_technician,
                removal_image_1_id/url, removal_image_2_id/url, removal_note, updated_at, updated_by
              </li>
              <li>
                <strong>ActivityLogs</strong>: log_id, year_id, crane_id, action_type, old_data,
                new_data, created_at, updated_by
              </li>
            </ul>
          </div>

          {/* Code.gs Preview & Copy */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
              <span className="font-mono-num text-xs font-medium text-slate-300">
                gas/Code.gs
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                disabled={loadingCode || !gasCode}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
              >
                {copiedCode ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>คัดลอก Code.gs</span>
                  </>
                )}
              </button>
            </div>
            <pre className="font-mono-num max-h-[360px] flex-1 overflow-auto p-4 text-[11px] leading-relaxed text-slate-200">
              {loadingCode ? 'กำลังโหลดไฟล์ Code.gs...' : gasCode}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
