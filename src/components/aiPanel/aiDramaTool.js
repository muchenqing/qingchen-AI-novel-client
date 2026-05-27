import { el } from '../../utils/helper.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';
import * as voice from '../../api/ai/voice.js';
import { checkDrama, getIssueStats } from '../../api/ai/dramaCheck.js';
import { detectForeshadows, getForeshadowStats } from '../../api/ai/foreshadow.js';
import { generateEndings, getEndingStyles } from '../../api/ai/endingGen.js';

function getSourceText() {
  var sourceArea = document.getElementById('ai-panel-source');
  var text = ((sourceArea && sourceArea.value) || '').trim();
  if (!text) {
    var editor = document.getElementById('editor');
    text = (editor && editor.innerText) || '';
  }
  return text;
}

function buildVoiceSection() {
  var voiceState = voice.getState();
  var voices = voice.getVoices();
  var cfg = voice.getVoiceConfig();

  var statusEl = el('div', { className: 'drama-voice-status', id: 'voice-status' },
    el('span', { className: 'drama-voice-dot' + (voiceState.isSpeaking ? ' active' : '') }),
    el('span', null, voiceState.isSpeaking ? (voiceState.isPaused ? '已暂停' : '朗读中...') : '未朗读'),
  );

  var voiceSelect = el('select', { className: 'drama-select', id: 'voice-select' });
  var emptyOpt = el('option', { value: '' }, '默认音色');
  voiceSelect.appendChild(emptyOpt);
  for (var i = 0; i < voices.length; i++) {
    var opt = el('option', { value: voices[i].name }, voices[i].name + ' (' + voices[i].lang + ')');
    if (voices[i].name === cfg.voiceName) opt.selected = true;
    voiceSelect.appendChild(opt);
  }

  var rateSlider = el('input', {
    className: 'drama-slider',
    type: 'range',
    id: 'voice-rate',
    min: '0.5',
    max: '3',
    step: '0.1',
    value: String(cfg.rate),
  });
  var rateLabel = el('span', { className: 'drama-slider-value', id: 'voice-rate-value' }, cfg.rate.toFixed(1) + 'x');

  var volumeSlider = el('input', {
    className: 'drama-slider',
    type: 'range',
    id: 'voice-volume',
    min: '0',
    max: '1',
    step: '0.1',
    value: String(cfg.volume),
  });
  var volumeLabel = el('span', { className: 'drama-slider-value', id: 'voice-volume-value' }, Math.round(cfg.volume * 100) + '%');

  rateSlider.addEventListener('input', function () {
    var val = parseFloat(this.value);
    voice.setVoiceConfig({ rate: val });
    if (rateLabel) rateLabel.textContent = val.toFixed(1) + 'x';
  });

  volumeSlider.addEventListener('input', function () {
    var val = parseFloat(this.value);
    voice.setVoiceConfig({ volume: val });
    if (volumeLabel) volumeLabel.textContent = Math.round(val * 100) + '%';
  });

  voiceSelect.addEventListener('change', function () {
    voice.setVoiceConfig({ voiceName: this.value });
  });

  var btnSpeakSelection = el('button', { className: 'drama-btn' }, '朗读选中');
  btnSpeakSelection.addEventListener('click', function () { voice.speakSelection(); });

  var btnSpeakAll = el('button', { className: 'drama-btn' }, '朗读全文');
  btnSpeakAll.addEventListener('click', function () { voice.speakAll(); });

  var btnPause = el('button', { className: 'drama-btn', id: 'voice-pause-btn' }, voiceState.isPaused ? '继续' : '暂停');
  btnPause.addEventListener('click', function () {
    if (voiceState.isPaused) voice.resume();
    else voice.pause();
  });

  var btnStop = el('button', { className: 'drama-btn drama-btn-danger' }, '停止');
  btnStop.addEventListener('click', function () { voice.stop(); });

  var controlRow = el('div', { className: 'drama-btn-row' },
    btnSpeakSelection, btnSpeakAll, btnPause, btnStop,
  );

  var section = el('div', { className: 'drama-section' },
    el('h4', { className: 'drama-section-title' }, '语音朗读'),
    statusEl,
    el('div', { className: 'drama-form-row' },
      el('label', null, '音色'),
      voiceSelect,
    ),
    el('div', { className: 'drama-form-row' },
      el('label', null, '语速'),
      rateSlider,
      rateLabel,
    ),
    el('div', { className: 'drama-form-row' },
      el('label', null, '音量'),
      volumeSlider,
      volumeLabel,
    ),
    controlRow,
  );

  bus.on('voice:started', function () {
    var dot = statusEl.querySelector('.drama-voice-dot');
    var txt = statusEl.querySelector('span:last-child');
    if (dot) dot.classList.add('active');
    if (txt) txt.textContent = '朗读中...';
  });
  bus.on('voice:paused', function () {
    var txt = statusEl.querySelector('span:last-child');
    if (txt) txt.textContent = '已暂停';
    if (btnPause) btnPause.textContent = '继续';
  });
  bus.on('voice:resumed', function () {
    var txt = statusEl.querySelector('span:last-child');
    if (txt) txt.textContent = '朗读中...';
    if (btnPause) btnPause.textContent = '暂停';
  });
  bus.on('voice:ended', function () {
    var dot = statusEl.querySelector('.drama-voice-dot');
    var txt = statusEl.querySelector('span:last-child');
    if (dot) dot.classList.remove('active');
    if (txt) txt.textContent = '未朗读';
    if (btnPause) btnPause.textContent = '暂停';
  });
  bus.on('voice:stopped', function () {
    var dot = statusEl.querySelector('.drama-voice-dot');
    var txt = statusEl.querySelector('span:last-child');
    if (dot) dot.classList.remove('active');
    if (txt) txt.textContent = '未朗读';
    if (btnPause) btnPause.textContent = '暂停';
  });

  return section;
}

function buildDictationSection() {
  var statusEl = el('div', { className: 'drama-voice-status', id: 'dictation-status' },
    el('span', { className: 'drama-voice-dot' }),
    el('span', null, '未录音'),
  );

  var interimEl = el('div', { className: 'drama-dictation-interim', id: 'dictation-interim' });
  interimEl.style.display = 'none';

  var btnDictation = el('button', { className: 'drama-btn drama-btn-primary', id: 'dictation-btn' }, '开始录音');
  var btnInsert = el('button', { className: 'drama-btn', id: 'dictation-insert-btn' }, '插入编辑器');
  btnInsert.style.display = 'none';

  var finalText = '';

  btnDictation.addEventListener('click', function () {
    if (voice.isDictating()) {
      voice.stopDictation();
      btnDictation.textContent = '开始录音';
      return;
    }
    var started = voice.startDictation(function (result) {
      if (result.interim) {
        interimEl.textContent = result.interim;
        interimEl.style.display = 'block';
      }
      if (result.final) {
        finalText += result.final;
        interimEl.textContent = '';
        interimEl.style.display = 'none';
        btnInsert.style.display = '';
      }
    });
    if (started) {
      btnDictation.textContent = '停止录音';
      finalText = '';
      btnInsert.style.display = 'none';
    }
  });

  btnInsert.addEventListener('click', function () {
    if (finalText) {
      bus.emit('editor:apply-content', finalText);
      bus.emit('status:set', '已插入语音转写文本');
    }
  });

  bus.on('voice:dictation-started', function () {
    var dot = statusEl.querySelector('.drama-voice-dot');
    var txt = statusEl.querySelector('span:last-child');
    if (dot) dot.classList.add('active');
    if (txt) txt.textContent = '录音中...';
  });
  bus.on('voice:dictation-stopped', function () {
    var dot = statusEl.querySelector('.drama-voice-dot');
    var txt = statusEl.querySelector('span:last-child');
    if (dot) dot.classList.remove('active');
    if (txt) txt.textContent = '未录音';
    btnDictation.textContent = '开始录音';
  });

  var section = el('div', { className: 'drama-section' },
    el('h4', { className: 'drama-section-title' }, '语音转文字'),
    statusEl,
    interimEl,
    el('div', { className: 'drama-btn-row' },
      btnDictation,
      btnInsert,
    ),
  );

  return section;
}

function buildDramaCheckSection() {
  var resultEl = el('div', { className: 'drama-result', id: 'drama-check-result' });
  var statsEl = el('div', { className: 'drama-stats', id: 'drama-check-stats' });
  var btnCheck = el('button', { className: 'drama-btn drama-btn-primary', id: 'drama-check-btn' }, '开始检测');
  var loadingEl = el('div', { className: 'drama-loading', id: 'drama-check-loading' },
    el('div', { className: 'drama-loading-spinner' }),
    el('span', null, 'AI 正在分析剧情逻辑...'),
  );
  loadingEl.style.display = 'none';

  btnCheck.addEventListener('click', async function () {
    var text = getSourceText();
    if (!text) {
      bus.emit('status:set', '请先输入内容');
      return;
    }
    btnCheck.disabled = true;
    loadingEl.style.display = 'flex';
    resultEl.innerHTML = '';
    statsEl.innerHTML = '';

    try {
      var res = await checkDrama(text);
      if (res.success) {
        var stats = getIssueStats(res.report);
        statsEl.innerHTML = '';
        statsEl.appendChild(el('div', { className: 'drama-stats-row' },
          el('span', { className: 'drama-stat drama-stat-severe' }, '严重: ' + stats.severe),
          el('span', { className: 'drama-stat drama-stat-normal' }, '一般: ' + stats.normal),
          el('span', { className: 'drama-stat drama-stat-detail' }, '细节: ' + stats.detail),
        ));
        resultEl.innerHTML = '';
        var contentEl = el('div', { className: 'drama-report-content' }, res.content);
        resultEl.appendChild(contentEl);

        var btnCopy = el('button', { className: 'drama-btn' }, '复制报告');
        btnCopy.addEventListener('click', function () {
          navigator.clipboard.writeText(res.content);
          bus.emit('status:set', '已复制到剪贴板');
        });
        resultEl.appendChild(btnCopy);
      } else {
        resultEl.appendChild(el('div', { className: 'drama-error' }, res.errors.join(', ')));
      }
    } catch (err) {
      resultEl.appendChild(el('div', { className: 'drama-error' }, '检测失败: ' + err.message));
    } finally {
      btnCheck.disabled = false;
      loadingEl.style.display = 'none';
    }
  });

  var section = el('div', { className: 'drama-section' },
    el('h4', { className: 'drama-section-title' }, '剧情逻辑校验'),
    el('p', { className: 'drama-desc' }, 'AI 全文检测时间线冲突、人设崩塌、逻辑BUG、前后矛盾'),
    loadingEl,
    btnCheck,
    statsEl,
    resultEl,
  );

  return section;
}

function buildForeshadowSection() {
  var resultEl = el('div', { className: 'drama-result', id: 'foreshadow-result' });
  var statsEl = el('div', { className: 'drama-stats', id: 'foreshadow-stats' });
  var btnDetect = el('button', { className: 'drama-btn drama-btn-primary', id: 'foreshadow-btn' }, '开始检测');
  var loadingEl = el('div', { className: 'drama-loading', id: 'foreshadow-loading' },
    el('div', { className: 'drama-loading-spinner' }),
    el('span', null, 'AI 正在扫描伏笔线索...'),
  );
  loadingEl.style.display = 'none';

  btnDetect.addEventListener('click', async function () {
    var text = getSourceText();
    if (!text) {
      bus.emit('status:set', '请先输入内容');
      return;
    }
    btnDetect.disabled = true;
    loadingEl.style.display = 'flex';
    resultEl.innerHTML = '';
    statsEl.innerHTML = '';

    try {
      var res = await detectForeshadows(text);
      if (res.success) {
        var stats = getForeshadowStats(res.analysis);
        statsEl.innerHTML = '';
        statsEl.appendChild(el('div', { className: 'drama-stats-row' },
          el('span', { className: 'drama-stat' }, '总伏笔: ' + stats.total),
          el('span', { className: 'drama-stat drama-stat-severe' }, '未回收: ' + stats.unrecovered),
          el('span', { className: 'drama-stat drama-stat-normal' }, '已回收: ' + stats.recovered),
        ));
        resultEl.innerHTML = '';
        var contentEl = el('div', { className: 'drama-report-content' }, res.content);
        resultEl.appendChild(contentEl);

        var btnCopy = el('button', { className: 'drama-btn' }, '复制报告');
        btnCopy.addEventListener('click', function () {
          navigator.clipboard.writeText(res.content);
          bus.emit('status:set', '已复制到剪贴板');
        });
        resultEl.appendChild(btnCopy);
      } else {
        resultEl.appendChild(el('div', { className: 'drama-error' }, res.errors.join(', ')));
      }
    } catch (err) {
      resultEl.appendChild(el('div', { className: 'drama-error' }, '检测失败: ' + err.message));
    } finally {
      btnDetect.disabled = false;
      loadingEl.style.display = 'none';
    }
  });

  var section = el('div', { className: 'drama-section' },
    el('h4', { className: 'drama-section-title' }, '伏笔检测'),
    el('p', { className: 'drama-desc' }, 'AI 自动扫描伏笔、未回收线索、密度评估'),
    loadingEl,
    btnDetect,
    statsEl,
    resultEl,
  );

  return section;
}

function buildEndingGenSection() {
  var styles = getEndingStyles();
  var resultEl = el('div', { className: 'drama-result', id: 'ending-result' });
  var progressEl = el('div', { className: 'drama-progress', id: 'ending-progress' });
  progressEl.style.display = 'none';

  var checkboxes = [];
  var checkboxGroup = el('div', { className: 'drama-checkbox-group' });
  for (var i = 0; i < styles.length; i++) {
    var cb = el('label', { className: 'drama-checkbox' },
      el('input', { type: 'checkbox', value: styles[i].key, checked: 'checked' }),
      styles[i].label,
    );
    checkboxes.push({ key: styles[i].key, el: cb });
    checkboxGroup.appendChild(cb);
  }

  var btnGenerate = el('button', { className: 'drama-btn drama-btn-primary', id: 'ending-gen-btn' }, '生成全部结局');

  btnGenerate.addEventListener('click', async function () {
    var text = getSourceText();
    if (!text) {
      bus.emit('status:set', '请先选择或输入需要生成结局的段落');
      return;
    }

    var selectedStyles = [];
    for (var j = 0; j < checkboxes.length; j++) {
      var input = checkboxes[j].el.querySelector('input');
      if (input && input.checked) {
        for (var k = 0; k < styles.length; k++) {
          if (styles[k].key === checkboxes[j].key) {
            selectedStyles.push(styles[k]);
            break;
          }
        }
      }
    }
    if (selectedStyles.length === 0) {
      bus.emit('status:set', '请至少选择一种结局风格');
      return;
    }

    btnGenerate.disabled = true;
    resultEl.innerHTML = '';
    progressEl.style.display = 'block';

    var progressText = el('span', null, '准备生成...');
    progressEl.innerHTML = '';
    progressEl.appendChild(el('div', { className: 'drama-loading-spinner' }));
    progressEl.appendChild(progressText);

    bus.on('ai:ending-progress', function (data) {
      if (progressText) progressText.textContent = data.message;
    });

    try {
      var res = await generateEndings(text, { styles: selectedStyles });
      if (res.success) {
        for (var m = 0; m < res.endings.length; m++) {
          var ending = res.endings[m];
          var card = el('div', { className: 'drama-ending-card' },
            el('div', { className: 'drama-ending-header' },
              el('span', { className: 'drama-ending-style' }, ending.styleLabel),
              el('div', { className: 'drama-ending-actions' },
                el('button', { className: 'drama-btn drama-btn-sm' }, '插入编辑器'),
                el('button', { className: 'drama-btn drama-btn-sm' }, '复制'),
              ),
            ),
            el('div', { className: 'drama-ending-content' }, ending.content || '生成失败: ' + (ending.error || '')),
          );

          var insertBtn = card.querySelector('.drama-ending-actions .drama-btn:first-child');
          var copyBtn = card.querySelector('.drama-ending-actions .drama-btn:last-child');
          (function (content) {
            if (insertBtn) {
              insertBtn.addEventListener('click', function () {
                bus.emit('editor:apply-content', content);
                bus.emit('status:set', '已插入结局到编辑器');
              });
            }
            if (copyBtn) {
              copyBtn.addEventListener('click', function () {
                navigator.clipboard.writeText(content);
                bus.emit('status:set', '已复制到剪贴板');
              });
            }
          })(ending.content);

          resultEl.appendChild(card);
        }
      } else {
        resultEl.appendChild(el('div', { className: 'drama-error' }, res.errors.join(', ')));
      }
    } catch (err) {
      resultEl.appendChild(el('div', { className: 'drama-error' }, '生成失败: ' + err.message));
    } finally {
      btnGenerate.disabled = false;
      progressEl.style.display = 'none';
    }
  });

  var section = el('div', { className: 'drama-section' },
    el('h4', { className: 'drama-section-title' }, '多结局生成'),
    el('p', { className: 'drama-desc' }, '选中段落，AI 自动生成多种不同风格结局'),
    checkboxGroup,
    btnGenerate,
    progressEl,
    resultEl,
  );

  return section;
}

function buildAiDramaTool() {
  var tabs = [
    { key: 'voice', label: '语音朗读' },
    { key: 'dictation', label: '语音转文字' },
    { key: 'dramaCheck', label: '剧情校验' },
    { key: 'foreshadow', label: '伏笔检测' },
    { key: 'endingGen', label: '多结局生成' },
  ];

  var tabContainer = el('div', { className: 'drama-tabs' });
  var contentContainer = el('div', { className: 'drama-content' });

  var sections = {};
  sections.voice = buildVoiceSection();
  sections.dictation = buildDictationSection();
  sections.dramaCheck = buildDramaCheckSection();
  sections.foreshadow = buildForeshadowSection();
  sections.endingGen = buildEndingGenSection();

  for (var key in sections) {
    sections[key].style.display = 'none';
  }

  var firstTab = tabs[0].key;
  sections[firstTab].style.display = 'block';

  for (var i = 0; i < tabs.length; i++) {
    (function (tab) {
      var btn = el('button', {
        className: 'drama-tab' + (tab.key === firstTab ? ' active' : ''),
        dataset: { key: tab.key },
      }, tab.label);
      btn.addEventListener('click', function () {
        var allTabs = tabContainer.querySelectorAll('.drama-tab');
        for (var t = 0; t < allTabs.length; t++) {
          allTabs[t].classList.toggle('active', allTabs[t].dataset.key === tab.key);
        }
        for (var s in sections) {
          sections[s].style.display = s === tab.key ? 'block' : 'none';
        }
      });
      tabContainer.appendChild(btn);
    })(tabs[i]);
  }

  for (var s2 in sections) {
    contentContainer.appendChild(sections[s2]);
  }

  var container = el('div', { className: 'ai-drama-tool' },
    el('div', { className: 'drama-header' },
      el('h3', { className: 'drama-title' }, 'AI 剧情工具箱'),
    ),
    tabContainer,
    contentContainer,
  );

  return container;
}

function initAiDramaTool() {
  bus.on('ai:drama-check-progress', function (data) {
    if (data.status === 'done' || data.status === 'error') {
      bus.emit('status:set', data.message);
    }
  });
  bus.on('ai:foreshadow-progress', function (data) {
    if (data.status === 'done' || data.status === 'error') {
      bus.emit('status:set', data.message);
    }
  });
  bus.on('ai:ending-progress', function (data) {
    if (data.status === 'done') {
      bus.emit('status:set', data.message);
    }
  });
}

export { buildAiDramaTool, initAiDramaTool };
