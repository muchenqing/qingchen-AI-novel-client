/**
 * 渲染进程事件总线模块
 * @description 提供简易发布-订阅机制，解耦组件与业务逻辑之间的直接调用
 * @exports default - bus对象，包含on、off、emit三个方法
 * @method on(event, callback) - 注册事件监听
 * @method off(event, callback) - 移除事件监听
 * @method emit(event, ...args) - 触发事件并传递参数
 */

var listeners = {};

var bus = {
  on: function (event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  },

  off: function (event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(function (fn) { return fn !== callback; });
  },

  emit: function (event) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (!listeners[event]) return;
    for (var i = 0; i < listeners[event].length; i++) {
      try {
        listeners[event][i].apply(null, args);
      } catch (e) {
        console.error('[EventBus] Error in listener for "' + event + '":', e);
      }
    }
  },
};

export default bus;
