function textToBase64(text) {
  try {
    var encoder = new TextEncoder();
    var data = encoder.encode(text);
    var binary = '';
    for (var i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  } catch (e) {
    return btoa(unescape(encodeURIComponent(text)));
  }
}

function base64ToText(base64) {
  try {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    var decoder = new TextDecoder();
    return decoder.decode(bytes);
  } catch (e) {
    return decodeURIComponent(escape(atob(base64)));
  }
}

function createArchive(entries) {
  if (!Array.isArray(entries)) {
    entries = [entries];
  }

  var archive = {
    _format: 'qingchen-archive-v1',
    _created: new Date().toISOString(),
    _count: entries.length,
    entries: [],
  };

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    archive.entries.push({
      name: entry.name || ('entry-' + i),
      path: entry.path || '',
      content: entry.content || '',
      metadata: entry.metadata || {},
      size: (entry.content || '').length,
    });
  }

  archive._totalSize = archive.entries.reduce(function (sum, e) {
    return sum + e.size;
  }, 0);

  return archive;
}

function archiveToString(archive) {
  return JSON.stringify(archive);
}

function parseArchive(data) {
  try {
    var archive = typeof data === 'string' ? JSON.parse(data) : data;
    if (!archive || archive._format !== 'qingchen-archive-v1') {
      return { success: false, errors: ['无效的归档格式'] };
    }
    if (!archive.entries || !Array.isArray(archive.entries)) {
      return { success: false, errors: ['归档数据损坏'] };
    }
    return { success: true, archive: archive };
  } catch (e) {
    return { success: false, errors: ['归档解析失败: ' + e.message] };
  }
}

function compressText(text) {
  return textToBase64(text);
}

function decompressText(data) {
  return base64ToText(data);
}

function createManuscriptBackup(manuscript) {
  return createArchive({
    name: manuscript.title || 'untitled',
    path: manuscript.id || '',
    content: manuscript.content || '',
    metadata: {
      id: manuscript.id,
      title: manuscript.title,
      wordCount: manuscript.wordCount || 0,
      createdAt: manuscript.createdAt,
      updatedAt: manuscript.updatedAt,
    },
  });
}

function parseManuscriptBackup(archiveStr) {
  var result = parseArchive(archiveStr);
  if (!result.success) return result;

  var entry = result.archive.entries[0];
  if (!entry) {
    return { success: false, errors: ['归档中无书稿数据'] };
  }

  return {
    success: true,
    manuscript: {
      id: entry.metadata.id,
      title: entry.metadata.title,
      content: entry.content,
      wordCount: entry.metadata.wordCount || 0,
      createdAt: entry.metadata.createdAt,
      updatedAt: entry.metadata.updatedAt,
    },
  };
}

export {
  textToBase64,
  base64ToText,
  createArchive,
  archiveToString,
  parseArchive,
  compressText,
  decompressText,
  createManuscriptBackup,
  parseManuscriptBackup,
};
