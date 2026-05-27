var CONFIG_SCHEMA = {
  version: { type: 'string', required: true, default: '1.0.0' },
  configVersion: { type: 'number', required: true, default: 1 },

  ai: {
    currentProvider: { type: 'string', required: true, default: 'openai', enum: ['openai', 'qwen', 'ernie', 'deepseek', 'llama', 'custom'] },
    providers: { type: 'object', required: true },
    parameters: {
      temperature: { type: 'number', required: true, default: 0.8, min: 0, max: 2 },
      topP: { type: 'number', required: false, default: null, min: 0, max: 1 },
      maxTokens: { type: 'number', required: true, default: 2000, min: 1, max: 128000 },
      timeout: { type: 'number', required: true, default: 60000, min: 5000, max: 300000 },
    },
  },

  editor: {
    indent: { type: 'boolean', required: true, default: false },
    autoFormat: { type: 'boolean', required: true, default: false },
    punctuationFix: { type: 'boolean', required: true, default: false },
    fontSize: { type: 'number', required: true, default: 15, min: 12, max: 32 },
    lineHeight: { type: 'number', required: true, default: 1.8, min: 1.0, max: 3.0 },
    autoSaveInterval: { type: 'number', required: true, default: 5000, min: 1000, max: 60000 },
    chunkSize: { type: 'number', required: true, default: 5000, min: 1000, max: 20000 },
    debounceDelay: { type: 'number', required: true, default: 300, min: 50, max: 2000 },
  },

  export: {
    defaultFormat: { type: 'string', required: true, default: 'txt', enum: ['txt', 'md', 'epub', 'json'] },
    includeToc: { type: 'boolean', required: true, default: true },
    autoClean: { type: 'boolean', required: true, default: true },
  },

  theme: {
    current: { type: 'string', required: true, default: 'mint' },
    customThemes: { type: 'array', required: true, default: [] },
  },

  shortcuts: {
    save: { type: 'string', required: true, default: 'Ctrl+S' },
    newManuscript: { type: 'string', required: true, default: 'Ctrl+N' },
    openAI: { type: 'string', required: true, default: 'Ctrl+Shift+A' },
    export: { type: 'string', required: true, default: 'Ctrl+Shift+E' },
    toggleIndent: { type: 'string', required: true, default: 'Ctrl+Shift+I' },
    formatSelection: { type: 'string', required: true, default: 'Ctrl+Shift+F' },
    showWordCount: { type: 'string', required: true, default: 'Ctrl+Shift+D' },
    bold: { type: 'string', required: true, default: 'Ctrl+B' },
    italic: { type: 'string', required: true, default: 'Ctrl+I' },
    openSettings: { type: 'string', required: true, default: 'Ctrl+,' },
    closeWindow: { type: 'string', required: true, default: 'Alt+F4' },
  },

  window: {
    rememberSize: { type: 'boolean', required: true, default: true },
    rememberPosition: { type: 'boolean', required: true, default: true },
    rememberLastDocument: { type: 'boolean', required: true, default: true },
  },

  features: {
    contextMemory: { type: 'boolean', required: true, default: true },
    aiWriteFeatures: { type: 'boolean', required: true, default: true },
    editorEnhance: { type: 'boolean', required: true, default: true },
    exportEngine: { type: 'boolean', required: true, default: true },
    networkCheck: { type: 'boolean', required: true, default: true },
    autoRecover: { type: 'boolean', required: true, default: true },
  },
};

function validateValue(value, schema, path) {
  var errors = [];
  if (!schema) return errors;

  if (schema.type) {
    if (value === undefined || value === null) {
      if (schema.required) {
        errors.push(path + ': 缺少必填项');
      }
      return errors;
    }

    var actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      errors.push(path + ': 类型错误，期望 ' + schema.type + '，实际 ' + actualType);
      return errors;
    }

    if (schema.type === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        errors.push(path + ': 值 ' + value + ' 小于最小值 ' + schema.min);
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push(path + ': 值 ' + value + ' 大于最大值 ' + schema.max);
      }
    }

    if (schema.type === 'string' && schema.enum) {
      if (schema.enum.indexOf(value) === -1) {
        errors.push(path + ': 值 "' + value + '" 不在允许范围 [' + schema.enum.join(', ') + '] 内');
      }
    }
  }

  if (schema.type === 'object' && schema !== CONFIG_SCHEMA && typeof value === 'object' && value !== null) {
    var keys = Object.keys(value);
    for (var i = 0; i < keys.length; i++) {
      var childSchema = schema[keys[i]];
      if (childSchema && typeof childSchema === 'object' && childSchema.type) {
        var childErrors = validateValue(value[keys[i]], childSchema, path + '.' + keys[i]);
        errors = errors.concat(childErrors);
      }
    }
  }

  return errors;
}

function validateConfig(config) {
  var errors = [];
  if (!config || typeof config !== 'object') {
    errors.push('配置必须是非空对象');
    return errors;
  }

  var topKeys = Object.keys(CONFIG_SCHEMA);
  for (var i = 0; i < topKeys.length; i++) {
    var key = topKeys[i];
    var schema = CONFIG_SCHEMA[key];
    if (schema.type) {
      var valErrors = validateValue(config[key], schema, key);
      errors = errors.concat(valErrors);
    } else if (typeof schema === 'object') {
      if (!config[key]) continue;
      var subKeys = Object.keys(schema);
      for (var j = 0; j < subKeys.length; j++) {
        var subKey = subKeys[j];
        var subSchema = schema[subKey];
        if (subSchema && subSchema.type) {
          var subErrors = validateValue(config[key][subKey], subSchema, key + '.' + subKey);
          errors = errors.concat(subErrors);
        }
      }
    }
  }

  return errors;
}

function getDefaultValue(path) {
  var parts = path.split('.');
  var current = CONFIG_SCHEMA;
  for (var i = 0; i < parts.length; i++) {
    if (!current) return undefined;
    current = current[parts[i]];
  }
  if (current && current.default !== undefined) return current.default;
  return undefined;
}

export { CONFIG_SCHEMA, validateConfig, getDefaultValue };
