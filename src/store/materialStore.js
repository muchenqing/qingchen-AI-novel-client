import { generateId } from '../utils/helper.js';
import bus from '../event/bus.js';

var STORAGE_KEY = 'qingchen-materials';
var MAX_MATERIALS = 500;

var CATEGORIES = [
  { key: 'quote', label: '金句素材' },
  { key: 'scene', label: '桥段素材' },
  { key: 'foreshadow', label: '伏笔素材' },
  { key: 'environment', label: '环境描写' },
  { key: 'dialogue', label: '对话素材' },
  { key: 'other', label: '其他' },
];

var _cache = null;

function load() {
  if (_cache) return _cache;
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    _cache = raw ? JSON.parse(raw) : [];
  } catch (e) {
    _cache = [];
  }
  return _cache;
}

function save(list) {
  _cache = list;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[MaterialStore] save failed:', e);
  }
}

function getAll() {
  return load();
}

function getById(id) {
  var list = load();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

function create(data) {
  var list = load();
  if (list.length >= MAX_MATERIALS) {
    return { success: false, errors: ['素材数量已达上限 (' + MAX_MATERIALS + ')'] };
  }
  var material = {
    id: generateId(),
    title: (data && data.title) || '',
    content: (data && data.content) || '',
    category: (data && data.category) || 'other',
    tags: (data && data.tags) || [],
    source: (data && data.source) || '',
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  list.unshift(material);
  save(list);
  bus.emit('material:created', material);
  return { success: true, material: material };
}

function update(id, fields) {
  var list = load();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      var keys = Object.keys(fields);
      for (var k = 0; k < keys.length; k++) {
        list[i][keys[k]] = fields[keys[k]];
      }
      list[i].updatedAt = Date.now();
      save(list);
      bus.emit('material:updated', list[i]);
      return { success: true, material: list[i] };
    }
  }
  return { success: false, errors: ['素材不存在'] };
}

function remove(id) {
  var list = load();
  var found = false;
  var result = list.filter(function (m) {
    if (m.id === id) { found = true; return false; }
    return true;
  });
  if (!found) return { success: false, errors: ['素材不存在'] };
  save(result);
  bus.emit('material:deleted', { id: id });
  return { success: true };
}

function search(query) {
  if (!query) return load();
  var q = query.toLowerCase();
  return load().filter(function (m) {
    return (m.title && m.title.toLowerCase().indexOf(q) !== -1) ||
      (m.content && m.content.toLowerCase().indexOf(q) !== -1) ||
      (m.tags && m.tags.join(',').toLowerCase().indexOf(q) !== -1);
  });
}

function getByCategory(category) {
  if (!category) return load();
  return load().filter(function (m) { return m.category === category; });
}

function toggleFavorite(id) {
  var list = load();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      list[i].favorite = !list[i].favorite;
      list[i].updatedAt = Date.now();
      save(list);
      return { success: true, favorite: list[i].favorite };
    }
  }
  return { success: false };
}

function getStats() {
  var list = load();
  var stats = {};
  for (var c = 0; c < CATEGORIES.length; c++) {
    stats[CATEGORIES[c].key] = 0;
  }
  for (var i = 0; i < list.length; i++) {
    var cat = list[i].category || 'other';
    stats[cat] = (stats[cat] || 0) + 1;
  }
  return { total: list.length, byCategory: stats };
}

export { getAll, getById, create, update, remove, search, getByCategory, toggleFavorite, getStats, CATEGORIES };
