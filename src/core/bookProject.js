import { generateId } from '../utils/helper.js';
import { countWords } from '../utils/format.js';
import bus from '../event/bus.js';
import appState from './appState.js';

var STORAGE_KEY = 'qingchen-book-project';
var ACTIVE_BOOK_KEY = 'qingchen-active-book';

var _cache = null;

function load() {
  if (_cache) return _cache;
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    _cache = raw ? JSON.parse(raw) : null;
  } catch (e) {
    _cache = null;
  }
  return _cache;
}

function save(project) {
  _cache = project;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch (e) {
    console.error('[BookProject] save failed:', e);
  }
}

function getActiveBookId() {
  try {
    return localStorage.getItem(ACTIVE_BOOK_KEY) || null;
  } catch (e) {
    return null;
  }
}

function setActiveBookId(id) {
  try {
    localStorage.setItem(ACTIVE_BOOK_KEY, id);
  } catch (e) { /* ignore */ }
}

function createBook(data) {
  var book = {
    id: generateId(),
    title: (data && data.title) || '新书籍',
    author: (data && data.author) || '',
    description: (data && data.description) || '',
    volumes: [
      {
        id: generateId(),
        name: '第一卷',
        chapters: [
          { id: generateId(), name: '第一章', content: '', wordCount: 0, bookmark: false, createdAt: Date.now(), updatedAt: Date.now() },
        ],
        collapsed: false,
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  save(book);
  setActiveBookId(book.id);
  bus.emit('book:created', book);
  return book;
}

function getBook() {
  return load();
}

function updateBookInfo(fields) {
  var book = load();
  if (!book) return null;
  var keys = Object.keys(fields);
  for (var i = 0; i < keys.length; i++) {
    book[keys[i]] = fields[keys[i]];
  }
  book.updatedAt = Date.now();
  save(book);
  return book;
}

function addVolume(name) {
  var book = load();
  if (!book) return { success: false, errors: ['未创建书籍'] };
  var volume = {
    id: generateId(),
    name: name || ('第' + (book.volumes.length + 1) + '卷'),
    chapters: [
      { id: generateId(), name: '第一章', content: '', wordCount: 0, bookmark: false, createdAt: Date.now(), updatedAt: Date.now() },
    ],
    collapsed: false,
  };
  book.volumes.push(volume);
  book.updatedAt = Date.now();
  save(book);
  bus.emit('book:structure-changed');
  return { success: true, volume: volume };
}

function removeVolume(volumeId) {
  var book = load();
  if (!book) return { success: false };
  book.volumes = book.volumes.filter(function (v) { return v.id !== volumeId; });
  book.updatedAt = Date.now();
  save(book);
  bus.emit('book:structure-changed');
  return { success: true };
}

function addChapter(volumeId, name) {
  var book = load();
  if (!book) return { success: false, errors: ['未创建书籍'] };
  for (var i = 0; i < book.volumes.length; i++) {
    if (book.volumes[i].id === volumeId) {
      var chapter = {
        id: generateId(),
        name: name || ('第' + (book.volumes[i].chapters.length + 1) + '章'),
        content: '',
        wordCount: 0,
        bookmark: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      book.volumes[i].chapters.push(chapter);
      book.updatedAt = Date.now();
      save(book);
      bus.emit('book:structure-changed');
      return { success: true, chapter: chapter };
    }
  }
  return { success: false, errors: ['分卷不存在'] };
}

function removeChapter(chapterId) {
  var book = load();
  if (!book) return { success: false };
  for (var i = 0; i < book.volumes.length; i++) {
    var found = false;
    book.volumes[i].chapters = book.volumes[i].chapters.filter(function (ch) {
      if (ch.id === chapterId) { found = true; return false; }
      return true;
    });
    if (found) break;
  }
  book.updatedAt = Date.now();
  save(book);
  bus.emit('book:structure-changed');
  return { success: true };
}

function updateChapter(chapterId, fields) {
  var book = load();
  if (!book) return { success: false };
  for (var i = 0; i < book.volumes.length; i++) {
    for (var j = 0; j < book.volumes[i].chapters.length; j++) {
      if (book.volumes[i].chapters[j].id === chapterId) {
        var keys = Object.keys(fields);
        for (var k = 0; k < keys.length; k++) {
          book.volumes[i].chapters[j][keys[k]] = fields[keys[k]];
        }
        if (fields.content !== undefined) {
          book.volumes[i].chapters[j].wordCount = countWords(fields.content);
        }
        book.volumes[i].chapters[j].updatedAt = Date.now();
        book.updatedAt = Date.now();
        save(book);
        return { success: true };
      }
    }
  }
  return { success: false };
}

function getChapter(chapterId) {
  var book = load();
  if (!book) return null;
  for (var i = 0; i < book.volumes.length; i++) {
    for (var j = 0; j < book.volumes[i].chapters.length; j++) {
      if (book.volumes[i].chapters[j].id === chapterId) {
        return book.volumes[i].chapters[j];
      }
    }
  }
  return null;
}

function toggleBookmark(chapterId) {
  var book = load();
  if (!book) return;
  for (var i = 0; i < book.volumes.length; i++) {
    for (var j = 0; j < book.volumes[i].chapters.length; j++) {
      if (book.volumes[i].chapters[j].id === chapterId) {
        book.volumes[i].chapters[j].bookmark = !book.volumes[i].chapters[j].bookmark;
        save(book);
        bus.emit('book:chapter-bookmarked', { chapterId: chapterId, bookmark: book.volumes[i].chapters[j].bookmark });
        return;
      }
    }
  }
}

function moveChapter(volumeId, chapterId, newIndex) {
  var book = load();
  if (!book) return { success: false };
  for (var i = 0; i < book.volumes.length; i++) {
    if (book.volumes[i].id === volumeId) {
      var chapters = book.volumes[i].chapters;
      var oldIndex = -1;
      for (var j = 0; j < chapters.length; j++) {
        if (chapters[j].id === chapterId) { oldIndex = j; break; }
      }
      if (oldIndex === -1) return { success: false };
      var item = chapters.splice(oldIndex, 1)[0];
      chapters.splice(Math.min(newIndex, chapters.length), 0, item);
      book.updatedAt = Date.now();
      save(book);
      bus.emit('book:structure-changed');
      return { success: true };
    }
  }
  return { success: false };
}

function renameChapter(chapterId, newName) {
  return updateChapter(chapterId, { name: newName });
}

function toggleVolumeCollapse(volumeId) {
  var book = load();
  if (!book) return;
  for (var i = 0; i < book.volumes.length; i++) {
    if (book.volumes[i].id === volumeId) {
      book.volumes[i].collapsed = !book.volumes[i].collapsed;
      save(book);
      return;
    }
  }
}

function getBookStats() {
  var book = load();
  if (!book) return { totalWords: 0, totalChapters: 0, totalVolumes: 0, bookmarkedChapters: 0 };
  var totalWords = 0;
  var totalChapters = 0;
  var bookmarked = 0;
  for (var i = 0; i < book.volumes.length; i++) {
    for (var j = 0; j < book.volumes[i].chapters.length; j++) {
      totalWords += book.volumes[i].chapters[j].wordCount || 0;
      totalChapters++;
      if (book.volumes[i].chapters[j].bookmark) bookmarked++;
    }
  }
  return { totalWords: totalWords, totalChapters: totalChapters, totalVolumes: book.volumes.length, bookmarkedChapters: bookmarked };
}

function exportChapterContent(chapterId) {
  var ch = getChapter(chapterId);
  if (!ch) return null;
  return ch.name + '\n\n' + (ch.content || '');
}

export {
  createBook, getBook, updateBookInfo,
  addVolume, removeVolume,
  addChapter, removeChapter, updateChapter, getChapter,
  toggleBookmark, moveChapter, renameChapter,
  toggleVolumeCollapse, getBookStats, exportChapterContent,
  getActiveBookId, setActiveBookId,
};
