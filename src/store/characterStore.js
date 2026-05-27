import { generateId } from '../utils/helper.js';
import bus from '../event/bus.js';

var STORAGE_KEY = 'qingchen-characters';
var MAX_CHARACTERS = 200;

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
    console.error('[CharacterStore] save failed:', e);
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
  if (list.length >= MAX_CHARACTERS) {
    return { success: false, errors: ['人物卡数量已达上限 (' + MAX_CHARACTERS + ')'] };
  }
  var character = {
    id: generateId(),
    name: (data && data.name) || '新角色',
    gender: (data && data.gender) || '',
    appearance: (data && data.appearance) || '',
    personality: (data && data.personality) || '',
    backstory: (data && data.backstory) || '',
    relationships: (data && data.relationships) || '',
    quotes: (data && data.quotes) || '',
    notes: (data && data.notes) || '',
    group: (data && data.group) || '默认',
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  list.unshift(character);
  save(list);
  bus.emit('character:created', character);
  return { success: true, character: character };
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
      bus.emit('character:updated', list[i]);
      return { success: true, character: list[i] };
    }
  }
  return { success: false, errors: ['人物卡不存在'] };
}

function remove(id) {
  var list = load();
  var found = false;
  var result = list.filter(function (c) {
    if (c.id === id) { found = true; return false; }
    return true;
  });
  if (!found) return { success: false, errors: ['人物卡不存在'] };
  save(result);
  bus.emit('character:deleted', { id: id });
  return { success: true };
}

function search(query) {
  if (!query) return load();
  var q = query.toLowerCase();
  return load().filter(function (c) {
    return (c.name && c.name.toLowerCase().indexOf(q) !== -1) ||
      (c.personality && c.personality.toLowerCase().indexOf(q) !== -1) ||
      (c.backstory && c.backstory.toLowerCase().indexOf(q) !== -1) ||
      (c.notes && c.notes.toLowerCase().indexOf(q) !== -1);
  });
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

function getGroups() {
  var list = load();
  var groups = {};
  for (var i = 0; i < list.length; i++) {
    var g = list[i].group || '默认';
    if (!groups[g]) groups[g] = [];
    groups[g].push(list[i]);
  }
  return groups;
}

function getStats() {
  var list = load();
  var favorites = 0;
  for (var i = 0; i < list.length; i++) {
    if (list[i].favorite) favorites++;
  }
  return { total: list.length, favorites: favorites };
}

export { getAll, getById, create, update, remove, search, toggleFavorite, getGroups, getStats };
