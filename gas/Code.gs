/**
 * Google Apps Script Web App API for CCTV Installation & Removal Management System
 * Target Google Sheet ID: 13QVZGyyxjqNvAXD1X0r8KmWIyk3iW53bJF0u0LUphI8
 * Target Google Drive Folder ID: 1kbLUdllMc-WhXXGlXg9UA_2i87SyS4aB
 *
 * วิธีตั้งค่า:
 * 1. เปิด Google Apps Script (https://script.google.com) สร้างโปรเจกต์ใหม่
 * 2. วางโค้ดนี้ลงในไฟล์ Code.gs
 * 3. (แนะนำเพื่อความปลอดภัย) ไปที่ Project Settings -> Script Properties เพิ่ม API_SECRET = <รหัสผ่านลับของคุณ>
 * 4. กด Deploy -> New deployment -> เลือก Web app
 *    - Execute as: Me (เจ้าของสิทธิ์ Sheet และ Drive)
 *    - Who has access: Anyone (ระบบ Backend Proxy ของเว็บจะตรวจสอบ API_SECRET ก่อนส่งต่อเสมอ)
 * 5. คัดลอก Web App URL ไปตั้งค่าในแอปพลิเคชันหรือไฟล์ .env (GAS_WEB_APP_URL)
 */

var SPREADSHEET_ID = '13QVZGyyxjqNvAXD1X0r8KmWIyk3iW53bJF0u0LUphI8';
var DRIVE_FOLDER_ID = '1kbLUdllMc-WhXXGlXg9UA_2i87SyS4aB';
var DEFAULT_YEAR_NAME = '2569/70';

var INITIAL_CRANES = [
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

var HEADERS = {
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
};

function verifySecret_(secret) {
  var configuredSecret = PropertiesService.getScriptProperties().getProperty('API_SECRET');
  if (configuredSecret && configuredSecret !== '' && secret !== configuredSecret) {
    throw new Error('Unauthorized: API secret mismatch');
  }
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    verifySecret_(params.secret || '');
    var action = params.action || 'getData';

    if (action === 'getData') {
      return jsonResponse_({ ok: true, data: getAllData_() });
    }
    if (action === 'getImage') {
      var fileId = params.fileId;
      if (!fileId) throw new Error('Missing fileId');
      var file = DriveApp.getFileById(fileId);
      var blob = file.getBlob();
      return jsonResponse_({
        ok: true,
        mimeType: blob.getContentType(),
        name: file.getName(),
        base64: Utilities.base64Encode(blob.getBytes()),
      });
    }
    return jsonResponse_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    verifySecret_(body.secret || '');
    var action = body.action;

    if (action === 'bootstrap') {
      return jsonResponse_({ ok: true, data: bootstrapSheets_() });
    }
    if (action === 'getData') {
      return jsonResponse_({ ok: true, data: getAllData_() });
    }
    if (action === 'uploadImage') {
      return jsonResponse_({ ok: true, data: uploadImageToDrive_(body) });
    }
    if (action === 'createYear') {
      return jsonResponse_({ ok: true, data: createYear_(body) });
    }
    if (action === 'updateYear') {
      return jsonResponse_({ ok: true, data: updateYear_(body) });
    }
    if (action === 'deleteYear') {
      return jsonResponse_({ ok: true, data: deleteYear_(body) });
    }
    if (action === 'createCrane') {
      return jsonResponse_({ ok: true, data: createCrane_(body) });
    }
    if (action === 'updateCrane') {
      return jsonResponse_({ ok: true, data: updateCrane_(body) });
    }
    if (action === 'deleteCrane') {
      return jsonResponse_({ ok: true, data: deleteCrane_(body) });
    }
    if (action === 'reorderCranes') {
      return jsonResponse_({ ok: true, data: reorderCranes_(body) });
    }
    if (action === 'saveInstall') {
      return jsonResponse_({ ok: true, data: saveInstallRecord_(body) });
    }
    if (action === 'saveRemoval') {
      return jsonResponse_({ ok: true, data: saveRemovalRecord_(body) });
    }

    return jsonResponse_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sheetToObjects_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var rowObj = {};
    var hasValue = false;
    for (var j = 0; j < headers.length; j++) {
      var val = values[i][j];
      if (val !== '' && val !== null && val !== undefined) hasValue = true;
      rowObj[headers[j]] = val instanceof Date ? val.toISOString() : val;
    }
    if (hasValue) rows.push(rowObj);
  }
  return rows;
}

function bootstrapSheets_() {
  var ss = getSpreadsheet_();
  var yearsSheet = ensureSheet_(ss, 'ProductionYears', HEADERS.ProductionYears);
  var cranesSheet = ensureSheet_(ss, 'Cranes', HEADERS.Cranes);
  var recordsSheet = ensureSheet_(ss, 'CraneRecords', HEADERS.CraneRecords);
  ensureSheet_(ss, 'ActivityLogs', HEADERS.ActivityLogs);

  var now = new Date().toISOString();
  var existingYears = sheetToObjects_(yearsSheet);
  var defaultYearId = '';

  if (existingYears.length === 0) {
    defaultYearId = Utilities.getUuid();
    yearsSheet.appendRow([defaultYearId, DEFAULT_YEAR_NAME, now, true]);
  } else {
    defaultYearId = existingYears[0].year_id;
  }

  var existingCranes = sheetToObjects_(cranesSheet);
  var craneIds = [];
  if (existingCranes.length === 0) {
    var craneRows = [];
    for (var i = 0; i < INITIAL_CRANES.length; i++) {
      var cid = Utilities.getUuid();
      craneIds.push(cid);
      craneRows.push([cid, INITIAL_CRANES[i], i + 1, true, now]);
    }
    cranesSheet.getRange(2, 1, craneRows.length, HEADERS.Cranes.length).setValues(craneRows);
  } else {
    for (var k = 0; k < existingCranes.length; k++) {
      if (String(existingCranes[k].is_active) !== 'false') {
        craneIds.push(existingCranes[k].crane_id);
      }
    }
  }

  var existingRecords = sheetToObjects_(recordsSheet);
  var existingKeys = {};
  for (var r = 0; r < existingRecords.length; r++) {
    existingKeys[existingRecords[r].year_id + '::' + existingRecords[r].crane_id] = true;
  }

  var missingRows = [];
  for (var c = 0; c < craneIds.length; c++) {
    var key = defaultYearId + '::' + craneIds[c];
    if (!existingKeys[key]) {
      missingRows.push([
        Utilities.getUuid(),
        defaultYearId,
        craneIds[c],
        'NOT_INSTALLED',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'NOT_REMOVED',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        now,
        'system',
      ]);
    }
  }
  if (missingRows.length > 0) {
    recordsSheet
      .getRange(recordsSheet.getLastRow() + 1, 1, missingRows.length, HEADERS.CraneRecords.length)
      .setValues(missingRows);
  }

  return getAllData_();
}

function getAllData_() {
  var ss = getSpreadsheet_();
  var yearsSheet = ss.getSheetByName('ProductionYears');
  var cranesSheet = ss.getSheetByName('Cranes');
  var recordsSheet = ss.getSheetByName('CraneRecords');
  var logsSheet = ss.getSheetByName('ActivityLogs');

  return {
    spreadsheetTitle: ss.getName(),
    years: yearsSheet ? sheetToObjects_(yearsSheet) : [],
    cranes: cranesSheet ? sheetToObjects_(cranesSheet) : [],
    records: recordsSheet ? sheetToObjects_(recordsSheet) : [],
    logs: logsSheet ? sheetToObjects_(logsSheet) : [],
    fetchedAt: new Date().toISOString(),
  };
}

function uploadImageToDrive_(body) {
  var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var base64Data = body.base64Data;
  var mimeType = body.mimeType || 'image/jpeg';
  var fileName = body.fileName || 'cctv_' + new Date().getTime() + '.jpg';
  if (!base64Data) throw new Error('Missing base64Data');

  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, mimeType, fileName);
  var file = folder.createFile(blob);

  // Keep Drive permissions private to owner/authorized users (do NOT share publicly)
  return {
    fileId: file.getId(),
    fileName: file.getName(),
    fileUrl: 'https://drive.google.com/file/d/' + file.getId() + '/view',
  };
}

function appendLog_(ss, yearId, craneId, actionType, oldData, newData, updatedBy) {
  var sheet = ensureSheet_(ss, 'ActivityLogs', HEADERS.ActivityLogs);
  sheet.appendRow([
    Utilities.getUuid(),
    yearId || '',
    craneId || '',
    actionType,
    typeof oldData === 'string' ? oldData : JSON.stringify(oldData || {}),
    typeof newData === 'string' ? newData : JSON.stringify(newData || {}),
    new Date().toISOString(),
    updatedBy || 'user',
  ]);
}

function findRowIndex_(sheet, idColIndex, targetId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, idColIndex, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(targetId)) {
      return i + 2;
    }
  }
  return -1;
}

function createYear_(body) {
  var ss = getSpreadsheet_();
  var yearsSheet = ensureSheet_(ss, 'ProductionYears', HEADERS.ProductionYears);
  var cranesSheet = ensureSheet_(ss, 'Cranes', HEADERS.Cranes);
  var recordsSheet = ensureSheet_(ss, 'CraneRecords', HEADERS.CraneRecords);
  var now = new Date().toISOString();
  var yearId = Utilities.getUuid();

  yearsSheet.appendRow([yearId, body.yearName, now, true]);

  var cranes = sheetToObjects_(cranesSheet);
  var activeCranes = cranes.filter(function (c) {
    return String(c.is_active) !== 'false';
  });

  if (activeCranes.length > 0) {
    var rows = activeCranes.map(function (c) {
      return [
        Utilities.getUuid(),
        yearId,
        c.crane_id,
        'NOT_INSTALLED',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'NOT_REMOVED',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        now,
        body.updatedBy || 'user',
      ];
    });
    recordsSheet
      .getRange(recordsSheet.getLastRow() + 1, 1, rows.length, HEADERS.CraneRecords.length)
      .setValues(rows);
  }

  appendLog_(ss, yearId, '', 'CREATE_YEAR', {}, { year_name: body.yearName }, body.updatedBy);
  return { year_id: yearId };
}

function updateYear_(body) {
  var ss = getSpreadsheet_();
  var yearsSheet = ensureSheet_(ss, 'ProductionYears', HEADERS.ProductionYears);
  var rowIdx = findRowIndex_(yearsSheet, 1, body.yearId);
  if (rowIdx === -1) throw new Error('Production year not found');
  var oldName = yearsSheet.getRange(rowIdx, 2).getValue();
  yearsSheet.getRange(rowIdx, 2).setValue(body.yearName);
  appendLog_(
    ss,
    body.yearId,
    '',
    'UPDATE_YEAR',
    { year_name: oldName },
    { year_name: body.yearName },
    body.updatedBy
  );
  return { updated: true };
}

function deleteYear_(body) {
  var ss = getSpreadsheet_();
  var yearsSheet = ensureSheet_(ss, 'ProductionYears', HEADERS.ProductionYears);
  var rowIdx = findRowIndex_(yearsSheet, 1, body.yearId);
  if (rowIdx === -1) throw new Error('Production year not found');
  var oldName = yearsSheet.getRange(rowIdx, 2).getValue();
  yearsSheet.getRange(rowIdx, 4).setValue(false);
  appendLog_(
    ss,
    body.yearId,
    '',
    'DELETE_YEAR',
    { year_name: oldName, is_active: true },
    { year_name: oldName, is_active: false },
    body.updatedBy
  );
  return { deleted: true };
}

function createCrane_(body) {
  var ss = getSpreadsheet_();
  var cranesSheet = ensureSheet_(ss, 'Cranes', HEADERS.Cranes);
  var yearsSheet = ensureSheet_(ss, 'ProductionYears', HEADERS.ProductionYears);
  var recordsSheet = ensureSheet_(ss, 'CraneRecords', HEADERS.CraneRecords);
  var now = new Date().toISOString();
  var craneId = Utilities.getUuid();

  var existing = sheetToObjects_(cranesSheet);
  var maxSort = 0;
  for (var i = 0; i < existing.length; i++) {
    var s = Number(existing[i].sort_order) || 0;
    if (s > maxSort) maxSort = s;
  }

  cranesSheet.appendRow([craneId, body.craneName, maxSort + 1, true, now]);

  var years = sheetToObjects_(yearsSheet).filter(function (y) {
    return String(y.is_active) !== 'false';
  });
  if (years.length > 0) {
    var rows = years.map(function (y) {
      return [
        Utilities.getUuid(),
        y.year_id,
        craneId,
        'NOT_INSTALLED',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'NOT_REMOVED',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        now,
        body.updatedBy || 'user',
      ];
    });
    recordsSheet
      .getRange(recordsSheet.getLastRow() + 1, 1, rows.length, HEADERS.CraneRecords.length)
      .setValues(rows);
  }

  appendLog_(ss, '', craneId, 'CREATE_CRANE', {}, { crane_name: body.craneName }, body.updatedBy);
  return { crane_id: craneId };
}

function updateCrane_(body) {
  var ss = getSpreadsheet_();
  var cranesSheet = ensureSheet_(ss, 'Cranes', HEADERS.Cranes);
  var rowIdx = findRowIndex_(cranesSheet, 1, body.craneId);
  if (rowIdx === -1) throw new Error('Crane not found');
  var oldName = cranesSheet.getRange(rowIdx, 2).getValue();
  cranesSheet.getRange(rowIdx, 2).setValue(body.craneName);
  if (body.sortOrder !== undefined) {
    cranesSheet.getRange(rowIdx, 3).setValue(Number(body.sortOrder));
  }
  appendLog_(
    ss,
    '',
    body.craneId,
    'UPDATE_CRANE',
    { crane_name: oldName },
    { crane_name: body.craneName },
    body.updatedBy
  );
  return { updated: true };
}

function deleteCrane_(body) {
  var ss = getSpreadsheet_();
  var cranesSheet = ensureSheet_(ss, 'Cranes', HEADERS.Cranes);
  var rowIdx = findRowIndex_(cranesSheet, 1, body.craneId);
  if (rowIdx === -1) throw new Error('Crane not found');
  var oldName = cranesSheet.getRange(rowIdx, 2).getValue();
  // Archive crane (is_active = false) so historical records and logs are preserved
  cranesSheet.getRange(rowIdx, 4).setValue(false);
  appendLog_(
    ss,
    '',
    body.craneId,
    'ARCHIVE_CRANE',
    { crane_name: oldName, is_active: true },
    { crane_name: oldName, is_active: false },
    body.updatedBy
  );
  return { deleted: true };
}

function reorderCranes_(body) {
  var ss = getSpreadsheet_();
  var cranesSheet = ensureSheet_(ss, 'Cranes', HEADERS.Cranes);
  var orderMap = body.orders || {}; // { craneId: sortOrder }
  var lastRow = cranesSheet.getLastRow();
  if (lastRow < 2) return { updated: true };
  var range = cranesSheet.getRange(2, 1, lastRow - 1, 3);
  var values = range.getValues();
  for (var i = 0; i < values.length; i++) {
    var cid = String(values[i][0]);
    if (orderMap[cid] !== undefined) {
      values[i][2] = Number(orderMap[cid]);
    }
  }
  range.setValues(values);
  return { updated: true };
}

function findOrCreateRecordRow_(recordsSheet, yearId, craneId, updatedBy) {
  var lastRow = recordsSheet.getLastRow();
  if (lastRow >= 2) {
    var data = recordsSheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][1]) === String(yearId) && String(data[i][2]) === String(craneId)) {
        return i + 2;
      }
    }
  }
  var now = new Date().toISOString();
  recordsSheet.appendRow([
    Utilities.getUuid(),
    yearId,
    craneId,
    'NOT_INSTALLED',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'NOT_REMOVED',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    now,
    updatedBy || 'user',
  ]);
  return recordsSheet.getLastRow();
}

function saveInstallRecord_(body) {
  var ss = getSpreadsheet_();
  var recordsSheet = ensureSheet_(ss, 'CraneRecords', HEADERS.CraneRecords);
  var rowIdx = findOrCreateRecordRow_(recordsSheet, body.yearId, body.craneId, body.updatedBy);
  var rowVals = recordsSheet.getRange(rowIdx, 1, 1, HEADERS.CraneRecords.length).getValues()[0];

  var oldInstall = {
    install_status: rowVals[3],
    install_date: rowVals[4],
    install_technician: rowVals[5],
    install_image_1_id: rowVals[6],
    install_image_2_id: rowVals[8],
    install_note: rowVals[10],
  };

  var now = new Date().toISOString();
  // Columns D..K (4..11) are strictly installation fields — removal columns (12..19) untouched!
  var installPatch = [
    [
      body.installStatus || 'INSTALLED',
      body.installDate || '',
      body.installTechnician || '',
      body.image1Id || '',
      body.image1Url || '',
      body.image2Id || '',
      body.image2Url || '',
      body.installNote || '',
    ],
  ];
  recordsSheet.getRange(rowIdx, 4, 1, 8).setValues(installPatch);
  recordsSheet.getRange(rowIdx, 20, 1, 2).setValues([[now, body.updatedBy || 'user']]);

  appendLog_(
    ss,
    body.yearId,
    body.craneId,
    'UPDATE_INSTALL',
    oldInstall,
    {
      install_status: body.installStatus || 'INSTALLED',
      install_date: body.installDate || '',
      install_technician: body.installTechnician || '',
      install_image_1_id: body.image1Id || '',
      install_image_2_id: rowVals[8] && !body.image2Id ? '' : body.image2Id || '',
      install_note: body.installNote || '',
    },
    body.updatedBy
  );
  return { saved: true, updatedAt: now };
}

function saveRemovalRecord_(body) {
  var ss = getSpreadsheet_();
  var recordsSheet = ensureSheet_(ss, 'CraneRecords', HEADERS.CraneRecords);
  var rowIdx = findOrCreateRecordRow_(recordsSheet, body.yearId, body.craneId, body.updatedBy);
  var rowVals = recordsSheet.getRange(rowIdx, 1, 1, HEADERS.CraneRecords.length).getValues()[0];

  var oldRemoval = {
    removal_status: rowVals[11],
    removal_date: rowVals[12],
    removal_technician: rowVals[13],
    removal_image_1_id: rowVals[14],
    removal_image_2_id: rowVals[16],
    removal_note: rowVals[18],
  };

  var now = new Date().toISOString();
  // Columns L..S (12..19) are strictly removal fields — installation columns (4..11) untouched!
  var removalPatch = [
    [
      body.removalStatus || 'REMOVED',
      body.removalDate || '',
      body.removalTechnician || '',
      body.image1Id || '',
      body.image1Url || '',
      body.image2Id || '',
      body.image2Url || '',
      body.removalNote || '',
    ],
  ];
  recordsSheet.getRange(rowIdx, 12, 1, 8).setValues(removalPatch);
  recordsSheet.getRange(rowIdx, 20, 1, 2).setValues([[now, body.updatedBy || 'user']]);

  appendLog_(
    ss,
    body.yearId,
    body.craneId,
    'UPDATE_REMOVAL',
    oldRemoval,
    {
      removal_status: body.removalStatus || 'REMOVED',
      removal_date: body.removalDate || '',
      removal_technician: body.removalTechnician || '',
      removal_image_1_id: body.image1Id || '',
      removal_image_2_id: body.image2Id || '',
      removal_note: body.removalNote || '',
    },
    body.updatedBy
  );
  return { saved: true, updatedAt: now };
}
