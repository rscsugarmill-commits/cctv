# คู่มือการติดตั้งและ Deploy ระบบบันทึกการติดตั้งและรื้อถอนกล้องวงจรปิด
**CCTV Installation & Removal Management System**

## 1. ข้อมูลเป้าหมาย Google Ecosystem
- **Google Sheets ID**: `13QVZGyyxjqNvAXD1X0r8KmWIyk3iW53bJF0u0LUphI8`
- **Google Drive Folder ID**: `1kbLUdllMc-WhXXGlXg9UA_2i87SyS4aB`

## 2. โครงสร้างตาราง Google Sheets (4 Sheets)
ระบบจะสร้างและตรวจสอบโครงสร้างให้โดยอัตโนมัติผ่านปุ่ม **"สร้าง/ตรวจสอบชีต 4 ตารางและ 43 เครน"** หรือเมื่อเชื่อมต่อครั้งแรก:

1. **`ProductionYears`**: `year_id`, `year_name`, `created_at`, `is_active` (เริ่มต้นมี `2569/70`)
2. **`Cranes`**: `crane_id`, `crane_name`, `sort_order`, `is_active`, `created_at` (เริ่มต้นมีรายชื่อเครนครบ 43 จุด)
3. **`CraneRecords`**: `record_id`, `year_id`, `crane_id`, `install_status`, `install_date`, `install_technician`, `install_image_1_id`, `install_image_1_url`, `install_image_2_id`, `install_image_2_url`, `install_note`, `removal_status`, `removal_date`, `removal_technician`, `removal_image_1_id`, `removal_image_1_url`, `removal_image_2_id`, `removal_image_2_url`, `removal_note`, `updated_at`, `updated_by`
4. **`ActivityLogs`**: `log_id`, `year_id`, `crane_id`, `action_type`, `old_data`, `new_data`, `created_at`, `updated_by`

## 3. การตั้งค่า Google Apps Script Web App (`gas/Code.gs`)
1. เปิด https://script.google.com ด้วยบัญชี Google เจ้าของไฟล์
2. สร้างโปรเจกต์ใหม่ และคัดลอกโค้ดทั้งหมดจากไฟล์ `gas/Code.gs` ไปวางแทนที่
3. ไปที่ **Project Settings -> Script Properties** เพิ่ม `API_SECRET` เพื่อป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต
4. กด **Deploy -> New deployment** เลือก **Web app**:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone` (Backend Proxy ของระบบจะส่ง `API_SECRET` ตรวจสอบทุกคำขอ)
5. นำ URL ที่ได้ไปกำหนดในหน้า **"เชื่อมต่อ Google & คู่มือ"** หรือในไฟล์ `.env`:
   ```env
   GOOGLE_SPREADSHEET_ID="13QVZGyyxjqNvAXD1X0r8KmWIyk3iW53bJF0u0LUphI8"
   GOOGLE_DRIVE_FOLDER_ID="1kbLUdllMc-WhXXGlXg9UA_2i87SyS4aB"
   GAS_WEB_APP_URL="https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec"
   GAS_API_SECRET="YOUR_SECRET_VALUE"
   ```

## 4. คำสั่ง Build & Run (Production)
```bash
npm install
npm run build
npm start
```
เซิร์ฟเวอร์ Express จะทำงานบน Port `3000` พร้อม Proxy สำหรับ Google Sheets API, Google Drive Image Streaming (แบบส่วนตัว ไม่เปิด Public), และ Google Apps Script Web App
