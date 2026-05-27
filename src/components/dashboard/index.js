import { el } from '../../utils/helper.js';
import { getTodayStats, getWeekStats, getHistoricalStats, getDailyTrend, loadGoal, saveGoal, getGoalProgress } from '../../core/wordStats.js';
import { getBookStats } from '../../core/bookProject.js';
import { getStats as getCharacterStats } from '../../store/characterStore.js';
import { getStats as getMaterialStats } from '../../store/materialStore.js';
import bus from '../../event/bus.js';

function closeDashboard() {
  var overlay = document.getElementById('dashboard-overlay');
  if (overlay) overlay.classList.remove('open');
}

function buildSectionTitle(text) {
  return el('div', { className: 'dashboard-section-title' }, text);
}

function buildProgressBar(id, label) {
  var pctText = el('span', { id: id + '-pct', className: 'dashboard-pct-text' }, '0%');
  var barInner = el('div', { id: id + '-bar-inner', className: 'dashboard-bar-inner' });
  var barOuter = el('div', { className: 'dashboard-bar-outer' }, barInner);
  return el('div', { className: 'dashboard-progress-row' },
    el('div', { className: 'dashboard-progress-label' }, label, pctText),
    barOuter,
  );
}

function buildOverviewSection() {
  var todayWords = el('div', { id: 'db-today-words', className: 'dashboard-big-number' }, '0');
  var todaySessions = el('div', { id: 'db-today-sessions', className: 'dashboard-sub-text' }, '0');

  return el('div', { className: 'dashboard-section' },
    buildSectionTitle('今日概览'),
    el('div', { className: 'dashboard-overview-grid' },
      el('div', { className: 'dashboard-overview-card' },
        el('div', { className: 'dashboard-overview-label' }, '今日字数'),
        todayWords,
      ),
      el('div', { className: 'dashboard-overview-card' },
        el('div', { className: 'dashboard-overview-label' }, '写作次数'),
        todaySessions,
      ),
    ),
    buildProgressBar('db-daily', '每日目标'),
    buildProgressBar('db-weekly', '每周目标'),
  );
}

function buildStatsRow(label, valueId) {
  return el('div', { className: 'dashboard-stat-row' },
    el('span', { className: 'dashboard-stat-label' }, label),
    el('span', { id: valueId, className: 'dashboard-stat-value' }, '0'),
  );
}

function buildWritingStatsSection() {
  var dailyGoalInput = el('input', { id: 'db-daily-goal-input', className: 'modal-input', type: 'number', placeholder: '2000', value: '2000' });
  var weeklyGoalInput = el('input', { id: 'db-weekly-goal-input', className: 'modal-input', type: 'number', placeholder: '14000', value: '14000' });
  var btnGoalSave = el('button', { className: 'modal-btn modal-btn-primary' }, '保存目标');
  btnGoalSave.addEventListener('click', handleSaveGoals);

  return el('div', { className: 'dashboard-section' },
    buildSectionTitle('写作统计'),
    el('div', { className: 'dashboard-stats-list' },
      buildStatsRow('今日码字', 'db-stat-today'),
      buildStatsRow('本周码字', 'db-stat-week'),
      buildStatsRow('历史总字数', 'db-stat-historical'),
      buildStatsRow('写作天数', 'db-stat-days'),
      buildStatsRow('活跃天数', 'db-stat-active-days'),
      buildStatsRow('本周日均', 'db-stat-daily-avg'),
    ),
    el('div', { className: 'dashboard-goal-settings' },
      el('div', { className: 'dashboard-goal-row' },
        el('label', { className: 'dashboard-goal-label' }, '每日目标'),
        dailyGoalInput,
      ),
      el('div', { className: 'dashboard-goal-row' },
        el('label', { className: 'dashboard-goal-label' }, '每周目标'),
        weeklyGoalInput,
      ),
      el('div', { className: 'dashboard-goal-actions' }, btnGoalSave),
    ),
  );
}

function buildTrendSection() {
  var chartContainer = el('div', { id: 'db-trend-chart', className: 'dashboard-trend-chart' });
  return el('div', { className: 'dashboard-section' },
    buildSectionTitle('数据趋势'),
    chartContainer,
  );
}

function buildProjectSection() {
  return el('div', { className: 'dashboard-section' },
    buildSectionTitle('项目数据'),
    el('div', { className: 'dashboard-stats-list' },
      buildStatsRow('总字数', 'db-proj-words'),
      buildStatsRow('章节数', 'db-proj-chapters'),
      buildStatsRow('卷数', 'db-proj-volumes'),
      buildStatsRow('人物卡', 'db-proj-characters'),
      buildStatsRow('素材数', 'db-proj-materials'),
    ),
    el('div', { className: 'dashboard-stat-row' },
      el('span', { className: 'dashboard-stat-label' }, '最后更新'),
      el('span', { id: 'db-proj-updated', className: 'dashboard-stat-value dashboard-stat-time' }, '--'),
    ),
  );
}

function buildFooter() {
  var btnRefresh = el('button', { className: 'modal-btn modal-btn-secondary' }, '刷新');
  btnRefresh.addEventListener('click', refreshDashboard);

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '关闭');
  btnClose.addEventListener('click', closeDashboard);

  return el('div', { className: 'modal-footer' }, btnRefresh, btnClose);
}

export function buildDashboard() {
  var overlay = el('div', { className: 'modal-overlay', id: 'dashboard-overlay' });

  var card = el('div', { className: 'modal-card modal-card-settings' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '数据统计'),
    ),
    el('div', { className: 'modal-body' },
      buildOverviewSection(),
      buildWritingStatsSection(),
      buildTrendSection(),
      buildProjectSection(),
    ),
    buildFooter(),
  );

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeDashboard(); });
  card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.appendChild(card);
  return overlay;
}

function setBarProgress(id, pct) {
  var pctText = document.getElementById(id + '-pct');
  var barInner = document.getElementById(id + '-bar-inner');
  if (pctText) pctText.textContent = pct + '%';
  if (barInner) barInner.style.width = pct + '%';
}

function formatTime(ts) {
  if (!ts) return '--';
  var d = new Date(ts);
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  var h = String(d.getHours()).padStart(2, '0');
  var min = String(d.getMinutes()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day + ' ' + h + ':' + min;
}

function renderTrendChart() {
  var container = document.getElementById('db-trend-chart');
  if (!container) return;
  container.innerHTML = '';

  var trend = getDailyTrend(7);
  var maxWords = 0;
  for (var i = 0; i < trend.length; i++) {
    if (trend[i].words > maxWords) maxWords = trend[i].words;
  }

  var barMaxLen = 30;
  for (var j = 0; j < trend.length; j++) {
    var item = trend[j];
    var barLen = maxWords > 0 ? Math.round((item.words / maxWords) * barMaxLen) : 0;
    var bar = '';
    for (var k = 0; k < barLen; k++) bar += '\u2588';
    var row = el('div', { className: 'dashboard-trend-row' },
      el('span', { className: 'dashboard-trend-date' }, item.label),
      el('span', { className: 'dashboard-trend-bar' }, bar || '\u2500'),
      el('span', { className: 'dashboard-trend-value' }, String(item.words)),
    );
    container.appendChild(row);
  }
}

function handleSaveGoals() {
  var dailyInput = document.getElementById('db-daily-goal-input');
  var weeklyInput = document.getElementById('db-weekly-goal-input');
  var dailyVal = parseInt((dailyInput || {}).value, 10) || 2000;
  var weeklyVal = parseInt((weeklyInput || {}).value, 10) || 14000;
  saveGoal({ dailyGoal: dailyVal, weeklyGoal: weeklyVal });
  refreshDashboard();
  bus.emit('status:set', '写作目标已保存');
}

function refreshDashboard() {
  var today = getTodayStats();
  var week = getWeekStats();
  var historical = getHistoricalStats();
  var goalProgress = getGoalProgress();
  var bookStats = getBookStats();
  var charStats = getCharacterStats();
  var matStats = getMaterialStats();

  var elTodayWords = document.getElementById('db-today-words');
  var elTodaySessions = document.getElementById('db-today-sessions');
  if (elTodayWords) elTodayWords.textContent = String(today.words);
  if (elTodaySessions) elTodaySessions.textContent = String(today.sessions);

  setBarProgress('db-daily', goalProgress.dailyProgress);
  setBarProgress('db-weekly', goalProgress.weeklyProgress);

  var elStatToday = document.getElementById('db-stat-today');
  var elStatWeek = document.getElementById('db-stat-week');
  var elStatHistorical = document.getElementById('db-stat-historical');
  var elStatDays = document.getElementById('db-stat-days');
  var elStatActiveDays = document.getElementById('db-stat-active-days');
  var elStatDailyAvg = document.getElementById('db-stat-daily-avg');
  if (elStatToday) elStatToday.textContent = String(today.words);
  if (elStatWeek) elStatWeek.textContent = String(week.words);
  if (elStatHistorical) elStatHistorical.textContent = String(historical.totalWords);
  if (elStatDays) elStatDays.textContent = String(historical.totalDays);
  if (elStatActiveDays) elStatActiveDays.textContent = String(week.activeDays);
  if (elStatDailyAvg) elStatDailyAvg.textContent = String(week.dailyAverage);

  var goal = loadGoal();
  var dailyGoalInput = document.getElementById('db-daily-goal-input');
  var weeklyGoalInput = document.getElementById('db-weekly-goal-input');
  if (dailyGoalInput) dailyGoalInput.value = String(goal.dailyGoal);
  if (weeklyGoalInput) weeklyGoalInput.value = String(goal.weeklyGoal);

  renderTrendChart();

  var elProjWords = document.getElementById('db-proj-words');
  var elProjChapters = document.getElementById('db-proj-chapters');
  var elProjVolumes = document.getElementById('db-proj-volumes');
  var elProjCharacters = document.getElementById('db-proj-characters');
  var elProjMaterials = document.getElementById('db-proj-materials');
  var elProjUpdated = document.getElementById('db-proj-updated');
  if (elProjWords) elProjWords.textContent = String(bookStats.totalWords);
  if (elProjChapters) elProjChapters.textContent = String(bookStats.totalChapters);
  if (elProjVolumes) elProjVolumes.textContent = String(bookStats.totalVolumes);
  if (elProjCharacters) elProjCharacters.textContent = String(charStats.total);
  if (elProjMaterials) elProjMaterials.textContent = String(matStats.total);
  if (elProjUpdated) elProjUpdated.textContent = formatTime(Date.now());
}

function openDashboard() {
  var overlay = document.getElementById('dashboard-overlay');
  if (!overlay) return;
  refreshDashboard();
  overlay.classList.add('open');
}

export function initDashboard() {
  bus.on('modal:open-dashboard', openDashboard);
  bus.on('stats:updated', function () {
    var overlay = document.getElementById('dashboard-overlay');
    if (overlay && overlay.classList.contains('open')) {
      refreshDashboard();
    }
  });
}
