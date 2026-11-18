# คู่มือการติดตั้งและ Deploy ระบบบันทึกการติดตั้งและรื้อถอนกล้องวงจรปิด
**CCTV Installation & Removal Management System**

## 1. ฐานข้อมูลกลางถาวร (ไม่ต้อง Login และไม่ใช้ Firebase)
ระบบอ่านและบันทึกข้อมูลทั้งหมดผ่าน **Google Sheets** และ **Google Drive** เท่านั้น โดยผูกไว้ถาวรที่ฝั่งเซิร์ฟเวอร์:
- **Google Sheets ID**: `13QVZGyyxjqNvAXD1X0r8KmWIyk3iW53bJF0u0LUphI8`
- **Google Drive Folder ID**: `1kbLUdllMc-WhXXGlXg9UA_2i87SyS4aB`

ทุกอุปกรณ์ที่เปิดเข้าเว็บจะเห็นและอัปเดตข้อมูลชุดเดียวกันทันทีโดยไม่ต้องเข้าสู่ระบบบัญชี Google

## 2. การตั้งค่าฝั่งเซิร์ฟเวอร์ (เลือก 1 วิธี)

### วิธี ก. ใช้ Google Apps Script Web App (`gas/Code.gs`)
1. เปิด https://script.google.com ด้วยบัญชี Google เจ้าของ Sheet และ Drive
2. สร้างโปรเจกต์ใหม่ และวางโค้ดทั้งหมดจากไฟล์ `gas/Code.gs`
3. (แนะนำ) เพิ่ม Script Property ชื่อ `API_SECRET` ใน Project Settings
4. กด **Deploy -> New deployment -> Web app** (`Execute as: Me`, `Who has access: Anyone`)
5. ตั้งค่า Environment Variables / `.env`:
   ```env
   GAS_WEB_APP_URL="https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec"
   GAS_API_SECRET="YOUR_SECRET_VALUE"
   ```

### วิธี ข. ใช้ Google Service Account
1. สร้าง Service Account บน Google Cloud และแชร์สิทธิ์ Editor ให้กับ `client_email` ของ Service Account ทั้งใน Google Sheet และ Google Drive Folder เป้าหมาย
2. ตั้งค่า Environment Variable:
   ```env
   GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
   ```

## 3. โครงสร้างตาราง Google Sheets (4 Sheets)
เมื่อเซิร์ฟเวอร์เชื่อมต่อสำเร็จครั้งแรก ระบบจะสร้างแท็บและข้อมูลเริ่มต้น (ปี `2569/70` + เครน 43 จุด) ให้อัตโนมัติ:
- `ProductionYears`
- `Cranes`
- `CraneRecords`
- `ActivityLogs`

## 4. คำสั่ง Build & Run
```bash
npm install
npm run build
npm start
```
