const IPC_EVENTS = require('../constants.js');
const path = require('path');
const fs = require('fs');

function getVersionDir(app) {
  var dir = path.join(app.getPath('userData'), 'versions');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getBackupDir(app) {
  var dir = path.join(app.getPath('userData'), 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function register(ipcMain, app) {
  ipcMain.handle(IPC_EVENTS.VERSION_SNAPSHOT, function (_, manuscriptId, data) {
    try {
      var versionDir = getVersionDir(app);
      var msDir = path.join(versionDir, manuscriptId);
      if (!fs.existsSync(msDir)) {
        fs.mkdirSync(msDir, { recursive: true });
      }
      var snapshotId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      var filePath = path.join(msDir, snapshotId + '.json');
      fs.writeFileSync(filePath, JSON.stringify({
        id: snapshotId,
        manuscriptId: manuscriptId,
        content: data.content || '',
        tag: data.tag || '',
        note: data.note || '',
        branch: data.branch || 'main',
        timestamp: Date.now(),
      }, null, 2), 'utf-8');
      return { success: true, snapshotId: snapshotId, filePath: filePath };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.VERSION_LIST, function (_, manuscriptId) {
    try {
      var versionDir = getVersionDir(app);
      var msDir = path.join(versionDir, manuscriptId);
      if (!fs.existsSync(msDir)) {
        return { success: true, versions: [] };
      }
      var files = fs.readdirSync(msDir).filter(function (f) { return f.endsWith('.json'); });
      var versions = [];
      for (var i = 0; i < files.length; i++) {
        try {
          var content = fs.readFileSync(path.join(msDir, files[i]), 'utf-8');
          versions.push(JSON.parse(content));
        } catch (e) { /* skip corrupted */ }
      }
      return { success: true, versions: versions.sort(function (a, b) { return b.timestamp - a.timestamp; }) };
    } catch (err) {
      return { success: false, message: err.message, versions: [] };
    }
  });

  ipcMain.handle(IPC_EVENTS.VERSION_RESTORE, function (_, manuscriptId, versionId) {
    try {
      var versionDir = getVersionDir(app);
      var filePath = path.join(versionDir, manuscriptId, versionId + '.json');
      if (!fs.existsSync(filePath)) {
        return { success: false, message: '版本文件不存在' };
      }
      var data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { success: true, content: data.content || '' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.VERSION_DELETE, function (_, manuscriptId, versionId) {
    try {
      var filePath = path.join(getVersionDir(app), manuscriptId, versionId + '.json');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.VERSION_MARK, function (_, manuscriptId, versionId, tag) {
    try {
      var filePath = path.join(getVersionDir(app), manuscriptId, versionId + '.json');
      if (!fs.existsSync(filePath)) {
        return { success: false, message: '版本文件不存在' };
      }
      var data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      data.tag = tag || '';
      data.marked = true;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.VERSION_DIFF, function (_, manuscriptId, versionIdA, versionIdB) {
    try {
      var dir = path.join(getVersionDir(app), manuscriptId);
      var fileA = path.join(dir, versionIdA + '.json');
      var fileB = path.join(dir, versionIdB + '.json');
      if (!fs.existsSync(fileA) || !fs.existsSync(fileB)) {
        return { success: false, message: '版本文件不存在' };
      }
      var dataA = JSON.parse(fs.readFileSync(fileA, 'utf-8'));
      var dataB = JSON.parse(fs.readFileSync(fileB, 'utf-8'));
      return { success: true, contentA: dataA.content || '', contentB: dataB.content || '' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.BACKUP_CREATE, function (_, data) {
    try {
      var backupDir = getBackupDir(app);
      var backupId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      var filePath = path.join(backupDir, backupId + '.json');
      fs.writeFileSync(filePath, JSON.stringify({
        id: backupId,
        manuscriptId: data.manuscriptId || '',
        content: data.content || '',
        title: data.title || '',
        wordCount: data.wordCount || 0,
        timestamp: Date.now(),
        type: data.type || 'manual',
      }, null, 2), 'utf-8');
      return { success: true, backupId: backupId };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.BACKUP_LIST, function () {
    try {
      var backupDir = getBackupDir(app);
      if (!fs.existsSync(backupDir)) {
        return { success: true, backups: [] };
      }
      var files = fs.readdirSync(backupDir).filter(function (f) { return f.endsWith('.json'); });
      var backups = [];
      for (var i = 0; i < files.length; i++) {
        try {
          var content = fs.readFileSync(path.join(backupDir, files[i]), 'utf-8');
          var parsed = JSON.parse(content);
          backups.push({
            id: parsed.id,
            manuscriptId: parsed.manuscriptId,
            title: parsed.title,
            wordCount: parsed.wordCount,
            timestamp: parsed.timestamp,
            type: parsed.type,
          });
        } catch (e) { /* skip */ }
      }
      return { success: true, backups: backups.sort(function (a, b) { return b.timestamp - a.timestamp; }) };
    } catch (err) {
      return { success: false, message: err.message, backups: [] };
    }
  });

  ipcMain.handle(IPC_EVENTS.BACKUP_RESTORE, function (_, backupId) {
    try {
      var filePath = path.join(getBackupDir(app), backupId + '.json');
      if (!fs.existsSync(filePath)) {
        return { success: false, message: '备份文件不存在' };
      }
      var data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { success: true, content: data.content || '', manuscriptId: data.manuscriptId };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.BACKUP_DELETE, function (_, backupId) {
    try {
      var filePath = path.join(getBackupDir(app), backupId + '.json');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.BACKUP_CLEAN, function () {
    try {
      var backupDir = getBackupDir(app);
      if (!fs.existsSync(backupDir)) return { success: true, removed: 0 };
      var files = fs.readdirSync(backupDir).filter(function (f) { return f.endsWith('.json'); });
      var thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      var removed = 0;
      for (var i = 0; i < files.length; i++) {
        try {
          var content = fs.readFileSync(path.join(backupDir, files[i]), 'utf-8');
          var parsed = JSON.parse(content);
          if (parsed.timestamp && parsed.timestamp < thirtyDaysAgo) {
            fs.unlinkSync(path.join(backupDir, files[i]));
            removed++;
          }
        } catch (e) { /* skip */ }
      }
      return { success: true, removed: removed };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.BRANCH_LIST, function (_, manuscriptId) {
    try {
      var branchFile = path.join(getVersionDir(app), manuscriptId + '-branches.json');
      if (!fs.existsSync(branchFile)) {
        return { success: true, branches: [{ name: 'main', displayName: '主线', isDefault: true }] };
      }
      var data = JSON.parse(fs.readFileSync(branchFile, 'utf-8'));
      return { success: true, branches: data };
    } catch (err) {
      return { success: false, message: err.message, branches: [] };
    }
  });

  ipcMain.handle(IPC_EVENTS.BRANCH_CREATE, function (_, manuscriptId, branchData) {
    try {
      var branchFile = path.join(getVersionDir(app), manuscriptId + '-branches.json');
      var branches = [];
      if (fs.existsSync(branchFile)) {
        branches = JSON.parse(fs.readFileSync(branchFile, 'utf-8'));
      }
      branches.push({
        name: branchData.name,
        displayName: branchData.displayName || branchData.name,
        createdAt: Date.now(),
        isDefault: false,
      });
      fs.writeFileSync(branchFile, JSON.stringify(branches, null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.BRANCH_DELETE, function (_, manuscriptId, branchName) {
    try {
      var branchFile = path.join(getVersionDir(app), manuscriptId + '-branches.json');
      if (!fs.existsSync(branchFile)) return { success: true };
      var branches = JSON.parse(fs.readFileSync(branchFile, 'utf-8'));
      branches = branches.filter(function (b) { return b.name !== branchName; });
      fs.writeFileSync(branchFile, JSON.stringify(branches, null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.BRANCH_SWITCH, function (_, manuscriptId, branchName) {
    try {
      var branchFile = path.join(getVersionDir(app), manuscriptId + '-branches.json');
      if (!fs.existsSync(branchFile)) return { success: false, message: '分支文件不存在' };
      var branches = JSON.parse(fs.readFileSync(branchFile, 'utf-8'));
      var found = false;
      for (var i = 0; i < branches.length; i++) {
        if (branches[i].name === branchName) { found = true; break; }
      }
      if (!found) return { success: false, message: '分支不存在' };
      return { success: true, branch: branchName };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.BRANCH_MERGE, function (_, manuscriptId, sourceBranch, targetBranch) {
    try {
      var versionDir = getVersionDir(app);
      var files = fs.readdirSync(path.join(versionDir, manuscriptId)).filter(function (f) {
        return f.endsWith('.json');
      });
      var merged = 0;
      for (var i = 0; i < files.length; i++) {
        try {
          var filePath = path.join(versionDir, manuscriptId, files[i]);
          var data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (data.branch === sourceBranch) {
            data.branch = targetBranch;
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
            merged++;
          }
        } catch (e) { /* skip */ }
      }
      return { success: true, merged: merged };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  console.log('[VersionHandler] 版本管理IPC已注册');
}

module.exports = { register };
