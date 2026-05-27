function debounce(fn, delay) {
  var timer = null;
  var debounced = function () {
    var ctx = this;
    var args = arguments;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(ctx, args);
      timer = null;
    }, delay);
  };
  debounced.cancel = function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced;
}

function throttle(fn, interval) {
  var lastTime = 0;
  var timer = null;
  var throttled = function () {
    var ctx = this;
    var args = arguments;
    var now = Date.now();
    var remaining = interval - (now - lastTime);
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn.apply(ctx, args);
    } else if (!timer) {
      timer = setTimeout(function () {
        lastTime = Date.now();
        timer = null;
        fn.apply(ctx, args);
      }, remaining);
    }
  };
  throttled.cancel = function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return throttled;
}

function chunkedRender(items, renderFn, chunkSize, delay) {
  var _chunkSize = chunkSize || 50;
  var _delay = delay || 0;
  var index = 0;
  var cancelled = false;

  function processChunk() {
    if (cancelled) return;
    var end = Math.min(index + _chunkSize, items.length);
    for (var i = index; i < end; i++) {
      renderFn(items[i], i);
    }
    index = end;
    if (index < items.length) {
      setTimeout(processChunk, _delay);
    }
  }

  processChunk();

  return {
    cancel: function () {
      cancelled = true;
    },
    isDone: function () {
      return index >= items.length;
    },
  };
}

function requestIdleCallbackShim(callback) {
  if (typeof window !== 'undefined' && window.requestIdleCallback) {
    return window.requestIdleCallback(callback);
  }
  return setTimeout(function () {
    callback({ timeRemaining: function () { return 0; }, didTimeout: false });
  }, 1);
}

function memoize(fn) {
  var cache = {};
  return function () {
    var key = JSON.stringify(arguments);
    if (cache[key] !== undefined) return cache[key];
    var result = fn.apply(this, arguments);
    cache[key] = result;
    return result;
  };
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export { debounce, throttle, chunkedRender, requestIdleCallbackShim, memoize, formatFileSize };
