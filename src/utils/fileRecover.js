var RECOVERY_KEY_PREFIX = 'qingchen-recovery-';
var MAX_BACKUPS = 5;
var BACKUP_INTERVAL = 300000;

function createBackup(manuscriptId, content) {
  try {
    var key = RECOVERY_KEY_PREFIX + manuscriptId;
    var raw = localStorage.getItem(key);
    var backups = raw ? JSON.parse(raw) : [];
    backups.unshift({
      content: content,
      timestamp: Date.now(),
      wordCount: content ? content.length : 0,
    });
    if (backups.length > MAX_BACKUPS) {
      backups = backups.slice(0, MAX_BACKUPS);
    }
    localStorage.setItem(key, JSON.stringify(backups));
    return true;
  } catch (e) {
    console.error('[FileRecover] 创建备份失败:', e);
    return false;
  }
}

function getBackups(manuscriptId) {
  try {
    var key = RECOVERY_KEY_PREFIX + manuscriptId;
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function restoreBackup(manuscriptId, backupIndex) {
  var backups = getBackups(manuscriptId);
  if (backupIndex < 0 || backupIndex >= backups.length) return null;
  return backups[backupIndex].content;
}

function getLatestBackup(manuscriptId) {
  var backups = getBackups(manuscriptId);
  return backups.length > 0 ? backups[0].content : null;
}

function clearBackups(manuscriptId) {
  try {
    var key = RECOVERY_KEY_PREFIX + manuscriptId;
    localStorage.removeItem(key);
  } catch (e) {
    console.error('[FileRecover] 清除备份失败:', e);
  }
}

function detectCorruption(content) {
  if (!content) return { corrupted: false, reason: '' };
  if (typeof content !== 'string') return { corrupted: true, reason: '内容类型异常' };
  if (content.indexOf('\u0000') !== -1) return { corrupted: true, reason: '检测到空字节，文件可能已损坏' };
  return { corrupted: false, reason: '' };
}

function repairContent(content) {
  if (!content || typeof content !== 'string') return '';
  var repaired = content.replace(/\u0000/g, '');
  repaired = repaired.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return repaired;
}

function checkManuscriptIntegrity(manuscript) {
  var issues = [];
  if (!manuscript) return { valid: false, issues: ['书稿数据不存在'] };
  if (!manuscript.id) issues.push('缺少书稿ID');
  if (!manuscript.title) issues.push('缺少书稿标题');
  if (manuscript.content === undefined || manuscript.content === null) {
    issues.push('缺少书稿内容');
  }
  var corruption = detectCorruption(manuscript.content);
  if (corruption.corrupted) issues.push(corruption.reason);
  return { valid: issues.length === 0, issues: issues };
}

function autoSaveRecoveryData(manuscripts) {
  try {
    for (var i = 0; i < manuscripts.length; i++) {
      var ms = manuscripts[i];
      if (ms && ms.content) {
        createBackup(ms.id, ms.content);
      }
    }
  } catch (e) {
    console.error('[FileRecover] 自动保存恢复数据失败:', e);
  }
}

function getAllRecoveryManuscripts() {
  var results = [];
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf(RECOVERY_KEY_PREFIX) === 0) {
        var manuscriptId = key.slice(RECOVERY_KEY_PREFIX.length);
        var backups = getBackups(manuscriptId);
        if (backups.length > 0) {
          results.push({
            manuscriptId: manuscriptId,
            latestBackup: backups[0],
            backupCount: backups.length,
          });
        }
      }
    }
  } catch (e) {
    console.error('[FileRecover] 获取恢复数据失败:', e);
  }
  return results;
}

export {
  createBackup,
  getBackups,
  restoreBackup,
  getLatestBackup,
  clearBackups,
  detectCorruption,
  repairContent,
  checkManuscriptIntegrity,
  autoSaveRecoveryData,
  getAllRecoveryManuscripts,
  BACKUP_INTERVAL,
};
