var REQUIRED_FIELDS = ['id', 'name', 'version', 'description', 'author'];
var VALID_FIELDS = [
  'id', 'name', 'version', 'description', 'author', 'license',
  'main', 'entry', 'icon', 'homepage', 'repository',
  'permissions', 'hooks', 'dependencies', 'minAppVersion',
];

var VALID_HOOKS = [
  'onLoad', 'onEnable', 'onDisable', 'onUnload',
  'onManuscriptOpen', 'onManuscriptSave', 'onManuscriptClose',
  'onContentChange', 'onAIResponse', 'onExport',
  'onThemeChange', 'onConfigChange',
];

var VALID_PERMISSIONS = [
  'manuscript:read', 'manuscript:write',
  'ai:invoke', 'editor:read', 'editor:write',
  'ui:toast', 'ui:dialog', 'ui:panel',
  'config:read', 'event:emit',
];

var VERSION_REGEX = /^\d+\.\d+\.\d+(-[\w\.]+)?$/;
var ID_REGEX = /^[\w\-\.]+$/;

function validateManifest(manifest) {
  var errors = [];
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['清单文件必须是一个JSON对象'] };
  }

  for (var i = 0; i < REQUIRED_FIELDS.length; i++) {
    var field = REQUIRED_FIELDS[i];
    if (!manifest[field]) {
      errors.push('缺少必填字段: ' + field);
    }
  }

  if (manifest.id && !ID_REGEX.test(manifest.id)) {
    errors.push('插件ID格式无效，仅允许字母、数字、连字符和点号');
  }

  if (manifest.version && !VERSION_REGEX.test(manifest.version)) {
    errors.push('版本号格式无效，应为 x.y.z 格式');
  }

  if (manifest.permissions && Array.isArray(manifest.permissions)) {
    for (var p = 0; p < manifest.permissions.length; p++) {
      if (VALID_PERMISSIONS.indexOf(manifest.permissions[p]) === -1) {
        errors.push('未知权限: ' + manifest.permissions[p]);
      }
    }
  }

  if (manifest.hooks && Array.isArray(manifest.hooks)) {
    for (var h = 0; h < manifest.hooks.length; h++) {
      if (VALID_HOOKS.indexOf(manifest.hooks[h]) === -1) {
        errors.push('未知生命周期钩子: ' + manifest.hooks[h]);
      }
    }
  }

  var keys = Object.keys(manifest);
  for (var k = 0; k < keys.length; k++) {
    if (VALID_FIELDS.indexOf(keys[k]) === -1) {
      errors.push('未知字段: ' + keys[k]);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
}

function parseManifest(jsonStr) {
  try {
    var manifest = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    var validation = validateManifest(manifest);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    return { success: true, manifest: manifest };
  } catch (e) {
    return { success: false, errors: ['清单文件解析失败: ' + e.message] };
  }
}

function createManifest(data) {
  return {
    id: data.id || '',
    name: data.name || '',
    version: data.version || '1.0.0',
    description: data.description || '',
    author: data.author || '',
    license: data.license || 'MIT',
    main: data.main || 'index.js',
    entry: data.entry || 'index.js',
    icon: data.icon || '',
    homepage: data.homepage || '',
    repository: data.repository || '',
    permissions: data.permissions || [],
    hooks: data.hooks || ['onLoad'],
    dependencies: data.dependencies || [],
    minAppVersion: data.minAppVersion || '2.0.0',
  };
}

function manifestToString(manifest) {
  return JSON.stringify(manifest, null, 2);
}

export {
  validateManifest,
  parseManifest,
  createManifest,
  manifestToString,
  REQUIRED_FIELDS,
  VALID_FIELDS,
  VALID_HOOKS,
  VALID_PERMISSIONS,
};
