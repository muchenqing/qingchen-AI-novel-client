import { exportConfigJSON, importConfigJSON, resetConfig, getConfig } from './configManager.js';
import bus from '../event/bus.js';

function exportToFile() {
  try {
    var jsonStr = exportConfigJSON();
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    var date = new Date();
    var dateStr = date.getFullYear() + '' +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0') + '_' +
      String(date.getHours()).padStart(2, '0') +
      String(date.getMinutes()).padStart(2, '0');
    a.download = 'qingchen-config-' + dateStr + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    bus.emit('status:set', '配置已导出');
    bus.emit('tips:show', { type: 'success', message: '配置文件导出成功', duration: 3000 });
    return true;
  } catch (e) {
    bus.emit('tips:show', { type: 'error', message: '配置导出失败: ' + e.message, duration: 4000 });
    return false;
  }
}

function importFromFile() {
  return new Promise(function (resolve) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) {
        resolve({ success: false, message: '未选择文件' });
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var result = importConfigJSON(reader.result);
        if (result.success) {
          bus.emit('tips:show', { type: 'success', message: '配置导入成功，新配置已生效', duration: 3000 });
          bus.emit('config:imported', result.config);
          resolve({ success: true, config: result.config });
        } else {
          bus.emit('tips:show', {
            type: 'error',
            message: '配置导入失败: ' + (result.errors ? result.errors.join('; ') : '未知错误'),
            duration: 5000,
          });
          resolve({ success: false, errors: result.errors });
        }
      };
      reader.onerror = function () {
        bus.emit('tips:show', { type: 'error', message: '文件读取失败', duration: 3000 });
        resolve({ success: false, message: '文件读取失败' });
      };
      reader.readAsText(file);
      document.body.removeChild(input);
    });
    document.body.appendChild(input);
    input.click();
  });
}

function resetToDefaults() {
  var config = resetConfig();
  bus.emit('config:reset', config);
  bus.emit('tips:show', { type: 'info', message: '配置已重置为默认值', duration: 3000 });
  return config;
}

function getCurrentConfigSummary() {
  var config = getConfig();
  return {
    version: config.version,
    provider: config.ai ? config.ai.currentProvider : 'unknown',
    theme: config.theme ? config.theme.current : 'mint',
    editorFontSize: config.editor ? config.editor.fontSize : 15,
    exportFormat: config.export ? config.export.defaultFormat : 'txt',
    shortcutCount: config.shortcuts ? Object.keys(config.shortcuts).length : 0,
  };
}

export {
  exportToFile,
  importFromFile,
  resetToDefaults,
  getCurrentConfigSummary,
};
