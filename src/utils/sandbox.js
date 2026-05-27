var FORBIDDEN_GLOBALS = [
  'require', 'module', 'exports', 'process',
  '__dirname', '__filename', 'Buffer',
  'global', 'eval', 'Function',
];

var ALLOWED_DOM_METHODS = [
  'getElementById', 'querySelector', 'querySelectorAll',
  'createElement', 'createTextNode', 'addEventListener',
  'removeEventListener', 'appendChild', 'removeChild',
  'insertBefore', 'setAttribute', 'getAttribute',
  'classList', 'style', 'textContent', 'innerHTML',
];

var PLUGIN_API_WHITELIST = [
  'getManuscripts', 'getCurrentManuscript', 'updateManuscript',
  'getContent', 'setContent', 'getSelection', 'insertText',
  'callAI', 'showToast', 'showDialog', 'getConfig',
  'on', 'off', 'emit', 'log',
];

function createSandboxContext(pluginId) {
  var context = {
    pluginId: pluginId,
    _allowed: {},
    _denied: [],
    _logBuffer: [],
  };

  return context;
}

function validatePluginCode(code) {
  var errors = [];
  if (!code || typeof code !== 'string') {
    errors.push('插件代码不能为空');
    return { valid: false, errors: errors };
  }

  for (var i = 0; i < FORBIDDEN_GLOBALS.length; i++) {
    var pattern = new RegExp('\\b' + FORBIDDEN_GLOBALS[i] + '\\b', 'g');
    if (pattern.test(code)) {
      errors.push('禁止访问全局对象: ' + FORBIDDEN_GLOBALS[i]);
    }
  }

  var dangerousPatterns = [
    { pattern: /eval\s*\(/g, name: 'eval()' },
    { pattern: /new\s+Function\s*\(/g, name: 'new Function()' },
    { pattern: /import\s*\(/g, name: '动态import()' },
    { pattern: /fetch\s*\(/g, name: 'fetch()' },
    { pattern: /XMLHttpRequest/g, name: 'XMLHttpRequest' },
    { pattern: /WebSocket/g, name: 'WebSocket' },
    { pattern: /navigator\./g, name: 'navigator' },
    { pattern: /localStorage\./g, name: 'localStorage' },
    { pattern: /sessionStorage\./g, name: 'sessionStorage' },
    { pattern: /indexedDB/g, name: 'indexedDB' },
    { pattern: /document\.cookie/g, name: 'document.cookie' },
    { pattern: /location\./g, name: 'location' },
    { pattern: /window\./g, name: 'window' },
  ];

  for (var j = 0; j < dangerousPatterns.length; j++) {
    if (dangerousPatterns[j].pattern.test(code)) {
      errors.push('禁止使用: ' + dangerousPatterns[j].name);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
}

function wrapPluginCode(code, pluginId) {
  var validation = validatePluginCode(code);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  var wrapped = [
    '(function(pluginApi) {',
    '  "use strict";',
    '  var exports = {};',
    '  var module = { exports: exports };',
    '  ' + code,
    '  return module.exports || exports;',
    '})',
  ].join('\n');

  return { success: true, wrapped: wrapped };
}

function createPluginApiBridge(pluginId, appApi) {
  var allowed = {};
  for (var i = 0; i < PLUGIN_API_WHITELIST.length; i++) {
    var method = PLUGIN_API_WHITELIST[i];
    if (typeof appApi[method] === 'function') {
      allowed[method] = appApi[method];
    }
  }

  allowed.log = function (level, msg) {
    console.log('[Plugin:' + pluginId + '] [' + level + ']', msg);
  };

  return allowed;
}

function isPluginAllowed(pluginId) {
  return typeof pluginId === 'string' && /^[\w\-\.]+$/.test(pluginId) && pluginId.length <= 64;
}

export {
  validatePluginCode,
  wrapPluginCode,
  createPluginApiBridge,
  createSandboxContext,
  isPluginAllowed,
  PLUGIN_API_WHITELIST,
  FORBIDDEN_GLOBALS,
};
