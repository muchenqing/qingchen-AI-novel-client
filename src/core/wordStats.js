import { countWords } from '../utils/format.js';
import bus from '../event/bus.js';
import appState from './appState.js';

var STORAGE_KEY = 'qingchen-word-stats';
var GOAL_KEY = 'qingchen-writing-goal';

function loadStats() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { daily: {}, sessions: [], totalHistorical: 0 };
  } catch (e) {
    return { daily: {}, sessions: [], totalHistorical: 0 };
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) { /* ignore */ }
}

function getTodayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getWeekRange() {
  var now = new Date();
  var dayOfWeek = now.getDay() || 7;
  var monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  monday.setHours(0, 0, 0, 0);
  var sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function recordSession(wordCount) {
  var stats = loadStats();
  var today = getTodayKey();

  if (!stats.daily[today]) {
    stats.daily[today] = { words: 0, sessions: 0, firstTime: Date.now() };
  }
  stats.daily[today].words += wordCount;
  stats.daily[today].sessions++;
  stats.daily[today].lastTime = Date.now();

  stats.totalHistorical += wordCount;

  stats.sessions.push({
    timestamp: Date.now(),
    wordCount: wordCount,
    day: today,
  });

  if (stats.sessions.length > 1000) {
    stats.sessions = stats.sessions.slice(-1000);
  }

  saveStats(stats);
}

function getTodayStats() {
  var stats = loadStats();
  var today = getTodayKey();
  var dayData = stats.daily[today] || { words: 0, sessions: 0 };
  var sessionTime = 0;
  for (var i = 0; i < stats.sessions.length; i++) {
    if (stats.sessions[i].day === today) {
      if (i > 0 && stats.sessions[i - 1].day === today) {
        var gap = stats.sessions[i].timestamp - stats.sessions[i - 1].timestamp;
        if (gap > 0 && gap < 600000) sessionTime += gap;
      }
    }
  }
  if (sessionTime === 0 && dayData.sessions > 0) {
    sessionTime = dayData.sessions * 60000;
  }
  return {
    words: dayData.words,
    sessions: dayData.sessions,
    estimatedMinutes: Math.round(sessionTime / 60000),
  };
}

function getWeekStats() {
  var stats = loadStats();
  var week = getWeekRange();
  var total = 0;
  var dayCount = 0;

  var keys = Object.keys(stats.daily);
  for (var i = 0; i < keys.length; i++) {
    var parts = keys[i].split('-');
    if (parts.length === 3) {
      var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (d >= week.start && d <= week.end) {
        total += stats.daily[keys[i]].words || 0;
        dayCount++;
      }
    }
  }

  return {
    words: total,
    activeDays: dayCount,
    dailyAverage: dayCount > 0 ? Math.round(total / dayCount) : 0,
  };
}

function getHistoricalStats() {
  var stats = loadStats();
  return {
    totalWords: stats.totalHistorical,
    totalDays: Object.keys(stats.daily).length,
  };
}

function getDailyTrend(days) {
  days = days || 7;
  var stats = loadStats();
  var result = [];
  var now = new Date();
  for (var i = days - 1; i >= 0; i--) {
    var d = new Date(now);
    d.setDate(d.getDate() - i);
    var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    result.push({
      date: key,
      label: (d.getMonth() + 1) + '/' + d.getDate(),
      words: (stats.daily[key] && stats.daily[key].words) || 0,
    });
  }
  return result;
}

function loadGoal() {
  try {
    var raw = localStorage.getItem(GOAL_KEY);
    return raw ? JSON.parse(raw) : { dailyGoal: 2000, weeklyGoal: 14000 };
  } catch (e) {
    return { dailyGoal: 2000, weeklyGoal: 14000 };
  }
}

function saveGoal(goal) {
  try {
    localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
  } catch (e) { /* ignore */ }
}

function getGoalProgress() {
  var goal = loadGoal();
  var today = getTodayStats();
  var week = getWeekStats();
  return {
    dailyGoal: goal.dailyGoal,
    weeklyGoal: goal.weeklyGoal,
    dailyProgress: goal.dailyGoal > 0 ? Math.min(100, Math.round((today.words / goal.dailyGoal) * 100)) : 0,
    weeklyProgress: goal.weeklyGoal > 0 ? Math.min(100, Math.round((week.words / goal.weeklyGoal) * 100)) : 0,
    dailyWords: today.words,
    weeklyWords: week.words,
  };
}

function initWordStats() {
  var editor = document.getElementById('editor');
  if (!editor) return;

  var lastContent = editor.innerText || '';
  var lastCount = countWords(lastContent);

  setInterval(function () {
    if (!editor) return;
    var current = editor.innerText || '';
    var currentCount = countWords(current);
    var diff = currentCount - lastCount;
    if (diff !== 0) {
      recordSession(diff);
      bus.emit('stats:updated', getGoalProgress());
    }
    lastCount = currentCount;
    lastContent = current;
  }, 60000);
}

export {
  loadStats, recordSession,
  getTodayStats, getWeekStats, getHistoricalStats,
  getDailyTrend, loadGoal, saveGoal, getGoalProgress,
  initWordStats,
};
