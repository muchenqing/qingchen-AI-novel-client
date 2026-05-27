import bus from '../event/bus.js';
import appState from '../core/appState.js';

var registeredApis = {};

function createPluginApi(pluginId, permissions) {
  var allowed = {};
  var permSet = {};
  if (Array.isArray(permissions)) {
    for (var i = 0; i < permissions.length; i++) {
      permSet[permissions[i]] = true;
    }
  }

  if (permSet['manuscript:read']) {
    allowed.getManuscripts = function () {
      return appState.getManuscripts().map(function (m) {
        return { id: m.id, title: m.title, wordCount: m.wordCount, updatedAt: m.updatedAt };
      });
    };
    allowed.getCurrentManuscript = function () {
      var ms = appState.getManuscript(appState.getCurrentManuscriptId());
      if (!ms) return null;
      return { id: ms.id, title: ms.title, content: ms.content, wordCount: ms.wordCount };
    };
  }

  if (permSet['manuscript:write']) {
    allowed.updateManuscript = function (id, fields) {
      appState.updateManuscript(id, fields);
    };
  }

  if (permSet['editor:read']) {
    allowed.getEditorContent = function () {
      var editor = document.getElementById('editor');
      return editor ? editor.textContent || '' : '';
    };
    allowed.getEditorSelection = function () {
      var sel = window.getSelection();
      return sel ? sel.toString() : '';
    };
  }

  if (permSet['editor:write']) {
    allowed.setEditorContent = function (text) {
      var editor = document.getElementById('editor');
      if (editor) {
        editor.textContent = text;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };
    allowed.insertEditorText = function (text) {
      var editor = document.getElementById('editor');
      if (editor) {
        editor.focus();
        document.execCommand('insertText', false, text);
      }
    };
  }

  if (permSet['ai:invoke']) {
    allowed.callAI = function (prompt, options) {
      return new Promise(function (resolve, reject) {
        bus.emit('ai:plugin-request', {
          pluginId: pluginId,
          prompt: prompt,
          options: options || {},
          callback: function (err, result) {
            if (err) reject(err);
            else resolve(result);
          },
        });
      });
    };
  }

  if (permSet['ui:toast']) {
    allowed.showToast = function (message, type) {
      bus.emit('tips:show', { type: type || 'info', message: message, duration: 3000 });
    };
  }

  if (permSet['ui:dialog']) {
    allowed.showDialog = function (title, message) {
      return new Promise(function (resolve) {
        bus.emit('plugin:confirm-dialog', { title: title, message: message, resolve: resolve });
      });
    };
  }

  if (permSet['config:read']) {
    allowed.getConfig = function () {
      return appState.getAppConfig();
    };
  }

  if (permSet['event:emit']) {
    allowed.emit = function (event) {
      var args = Array.prototype.slice.call(arguments, 1);
      bus.emit.apply(bus, [event].concat(args));
    };
    allowed.on = function (event, callback) {
      bus.on(event, callback);
    };
    allowed.off = function (event, callback) {
      bus.off(event, callback);
    };
  }

  allowed.log = function (level, msg) {
    console.log('[Plugin:' + pluginId + '] [' + level + ']', msg);
  };

  allowed.version = '2.0.0';
  allowed.appName = '卿辰 Mercey';

  registeredApis[pluginId] = allowed;
  return allowed;
}

function getPluginApi(pluginId) {
  return registeredApis[pluginId] || null;
}

function removePluginApi(pluginId) {
  delete registeredApis[pluginId];
}

function getRegisteredPluginIds() {
  return Object.keys(registeredApis);
}

export {
  createPluginApi,
  getPluginApi,
  removePluginApi,
  getRegisteredPluginIds,
};
