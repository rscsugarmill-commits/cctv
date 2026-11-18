export const DEFAULT_SPREADSHEET_ID = '13QVZGyyxjqNvAXD1X0r8KmWIyk3iW53bJF0u0LUphI8';
export const DEFAULT_DRIVE_FOLDER_ID = '1kbLUdllMc-WhXXGlXg9UA_2i87SyS4aB';
export const DEFAULT_PRODUCTION_YEAR_NAME = '2569/70';

export const SHEET_NAMES = {
  PRODUCTION_YEARS: 'ProductionYears',
  CRANES: 'Cranes',
  CRANE_RECORDS: 'CraneRecords',
  ACTIVITY_LOGS: 'ActivityLogs',
} as const;

export const SHEET_HEADERS = {
  ProductionYears: ['year_id', 'year_name', 'created_at', 'is_active'],
  Cranes: ['crane_id', 'crane_name', 'sort_order', 'is_active', 'created_at'],
  CraneRecords: [
    'record_id',
    'year_id',
    'crane_id',
    'install_status',
    'install_date',
    'install_technician',
    'install_image_1_id',
    'install_image_1_url',
    'install_image_2_id',
    'install_image_2_url',
    'install_note',
    'removal_status',
    'removal_date',
    'removal_technician',
    'removal_image_1_id',
    'removal_image_1_url',
    'removal_image_2_id',
    'removal_image_2_url',
    'removal_note',
    'updated_at',
    'updated_by',
  ],
  ActivityLogs: [
    'log_id',
    'year_id',
    'crane_id',
    'action_type',
    'old_data',
    'new_data',
    'created_at',
    'updated_by',
  ],
} as const;

export const INITIAL_CRANE_NAMES: readonly string[] = [
  'เครนขามสะแกแสง1',
  'เครนขามสะแกแสง2',
  'เครนคูเมือง',
  'เครนซับใหญ่',
  'เครนวังโพธิ์(บ้านเหลื่อม1)',
  'เครนดอนทอง(บ้านเหลื่อม2)',
  'เครนดอนหัน',
  'เครนทำนบ 2',
  'เครนทำนบพัฒนา',
  'เครนนาเสียว',
  'เครนเนินสง่า',
  'เครนบ้านเขว้า1',
  'เครนบ้านเขว้า2',
  'เครนบ้านเขว้า3',
  'เครนบ้านค่าย 1',
  'เครนบ้านค่าย 2',
  'เครนบ้านเดื่อ',
  'เครนบ้านปรางค์',
  'เครนภูแลนคา',
  'เครนรกฟ้า',
  'เครนวังชมภู',
  'เครนสระสี่เหลี่ยม 1',
  'เครนสระสี่เหลี่ยม2',
  'เครนหนองโคบาล',
  'เครนหนองบัวแดง',
  'เครนหนองบัวระเหว',
  'เครนหนองบัวระเหว2',
  'เครนหนองบัวลาย',
  'เครนหนองพลวง',
  'เครนหนองแวง',
  'เครนหนองหอย',
  'เครนหนองหัวฟาน',
  'เครนห้วยต้อน',
  'เครนห้วยไร่',
  'เครนหินกอง',
  'เครนท่าหินโงม',
  'เครนเนินสง่า 2',
  'เครนโนนตาลเสี้ยน',
  'เครนบ้านเขว้า 4',
  'เครนภูแลนคา 2',
  'เครนสงแดง',
  'เครนหนองม่วงช่างพิมพ์',
  'เครนจัตุรัส',
];

export const INSTALL_STATUS_LABELS: Record<'INSTALLED' | 'NOT_INSTALLED', string> = {
  INSTALLED: 'ติดตั้งแล้ว',
  NOT_INSTALLED: 'ยังไม่ติดตั้ง',
};

export const REMOVAL_STATUS_LABELS: Record<'REMOVED' | 'NOT_REMOVED', string> = {
  REMOVED: 'รื้อถอนแล้ว',
  NOT_REMOVED: 'ยังไม่รื้อถอน',
};
