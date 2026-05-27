import bus from '../../event/bus.js';
import appState from '../../core/appState.js';

var synth = window.speechSynthesis || null;
var currentUtterance = null;
var isSpeaking = false;
var isPaused = false;
var recognition = null;
var isRecording = false;

var voiceConfig = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  voiceName: '',
};

var STORAGE_KEY = 'qingchen-voice-config';

function loadVoiceConfig() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) voiceConfig = Object.assign(voiceConfig, JSON.parse(raw));
  } catch (e) { /* ignore */ }
}

function saveVoiceConfig() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(voiceConfig));
  } catch (e) { /* ignore */ }
}

function getVoices() {
  if (!synth) return [];
  var voices = synth.getVoices();
  var zhVoices = [];
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].lang.indexOf('zh') !== -1 || voices[i].lang.indexOf('cmn') !== -1) {
      zhVoices.push(voices[i]);
    }
  }
  if (zhVoices.length === 0) {
    return voices.slice(0, 20);
  }
  return zhVoices;
}

function setVoiceConfig(cfg) {
  var keys = Object.keys(cfg);
  for (var i = 0; i < keys.length; i++) {
    voiceConfig[keys[i]] = cfg[keys[i]];
  }
  saveVoiceConfig();
}

function getVoiceConfig() {
  return Object.assign({}, voiceConfig);
}

function speak(text, options) {
  if (!synth) {
    bus.emit('tips:show', { type: 'error', message: '当前浏览器不支持语音合成' });
    return;
  }

  if (isSpeaking) {
    stop();
  }

  if (!text || !text.trim()) {
    bus.emit('tips:show', { type: 'warning', message: '没有可朗读的文本' });
    return;
  }

  var cleanText = text.replace(/\s+/g, ' ').trim();
  if (cleanText.length > 5000) {
    cleanText = cleanText.slice(0, 5000);
  }

  currentUtterance = new SpeechSynthesisUtterance(cleanText);
  currentUtterance.rate = (options && options.rate) || voiceConfig.rate;
  currentUtterance.pitch = (options && options.pitch) || voiceConfig.pitch;
  currentUtterance.volume = (options && options.volume) || voiceConfig.volume;
  currentUtterance.lang = 'zh-CN';

  if (voiceConfig.voiceName) {
    var voices = synth.getVoices();
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].name === voiceConfig.voiceName) {
        currentUtterance.voice = voices[i];
        break;
      }
    }
  }

  currentUtterance.onstart = function () {
    isSpeaking = true;
    isPaused = false;
    bus.emit('voice:started');
    bus.emit('status:set', '正在朗读...');
  };

  currentUtterance.onend = function () {
    isSpeaking = false;
    isPaused = false;
    currentUtterance = null;
    bus.emit('voice:ended');
    bus.emit('status:set', '朗读完成');
  };

  currentUtterance.onerror = function (e) {
    isSpeaking = false;
    isPaused = false;
    currentUtterance = null;
    bus.emit('voice:ended');
    if (e.error !== 'canceled') {
      bus.emit('tips:show', { type: 'error', message: '朗读出错: ' + e.error });
    }
  };

  synth.speak(currentUtterance);
}

function speakSelection() {
  var sel = window.getSelection();
  var text = sel ? sel.toString() : '';
  if (!text || !text.trim()) {
    var editor = document.getElementById('editor');
    text = editor ? editor.innerText : '';
  }
  speak(text);
}

function speakAll() {
  var editor = document.getElementById('editor');
  var text = editor ? editor.innerText : '';
  speak(text);
}

function pause() {
  if (synth && isSpeaking && !isPaused) {
    synth.pause();
    isPaused = true;
    bus.emit('voice:paused');
    bus.emit('status:set', '朗读已暂停');
  }
}

function resume() {
  if (synth && isPaused) {
    synth.resume();
    isPaused = false;
    bus.emit('voice:resumed');
    bus.emit('status:set', '继续朗读');
  }
}

function stop() {
  if (synth) {
    synth.cancel();
  }
  isSpeaking = false;
  isPaused = false;
  currentUtterance = null;
  bus.emit('voice:stopped');
}

function getState() {
  return { isSpeaking: isSpeaking, isPaused: isPaused, config: getVoiceConfig() };
}

function startDictation(onResult) {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    bus.emit('tips:show', { type: 'error', message: '当前浏览器不支持语音识别' });
    return false;
  }

  if (isRecording) {
    stopDictation();
    return true;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'zh-CN';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = function (event) {
    var finalTranscript = '';
    var interimTranscript = '';
    for (var i = event.resultIndex; i < event.results.length; i++) {
      var transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    if (onResult) {
      onResult({ final: finalTranscript, interim: interimTranscript });
    }
  };

  recognition.onend = function () {
    isRecording = false;
    recognition = null;
    bus.emit('voice:dictation-stopped');
    bus.emit('status:set', '语音转写已停止');
  };

  recognition.onerror = function (e) {
    isRecording = false;
    recognition = null;
    bus.emit('voice:dictation-stopped');
    if (e.error !== 'no-speech') {
      bus.emit('tips:show', { type: 'error', message: '语音识别出错: ' + e.error });
    }
  };

  try {
    recognition.start();
    isRecording = true;
    bus.emit('voice:dictation-started');
    bus.emit('status:set', '正在语音转写...');
    return true;
  } catch (e) {
    bus.emit('tips:show', { type: 'error', message: '无法启动语音识别: ' + e.message });
    return false;
  }
}

function stopDictation() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  isRecording = false;
}

function isDictating() {
  return isRecording;
}

loadVoiceConfig();

export {
  speak, speakSelection, speakAll,
  pause, resume, stop,
  getState, getVoices,
  setVoiceConfig, getVoiceConfig,
  startDictation, stopDictation, isDictating,
};
