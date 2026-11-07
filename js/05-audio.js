/* 05-audio.js — 배경음악 · 효과음 · 음소거
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   배경음악 (파일 안에 내장)
   - 출근길/퇴근길/소풍길: 게임 중 반복 재생
   - result: 결과 화면에서 1회 재생
   ========================================== */
// 음원 위치
// - 파일 하나 방식: 음악 데이터가 파일 '맨 뒤'에 들어 있음 → 화면은 먼저 뜨고 음악은 뒤이어 받아짐
// - 폴더 방식: 같은 폴더의 audio/*.mp3
const AUDIO_KEYS = ['morning', 'evening', 'night', 'gacha', 'lobby'];
const EMBEDDED_AUDIO = !!window.AUDIO_EMBEDDED;
window.__audReady = window.__audReady || {};
const trackUrl = {};
// 곡 주소 얻기 (파일 하나 방식이면 처음 필요할 때 한 번만 풀어서 씀). 아직 받는 중이면 null
function getTrack(k) {
    if (trackUrl[k]) return trackUrl[k];
    if (!EMBEDDED_AUDIO) return (trackUrl[k] = 'audio/' + k + '.mp3');
    if (!window.__audReady[k]) return null;
    const el = document.getElementById('aud-' + k);
    if (!el || !el.textContent) return null;
    try {
        const bin = atob(el.textContent.trim());
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        el.textContent = ''; // 메모리 절약
        return (trackUrl[k] = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' })));
    } catch (e) { return null; }
}
const BGM_SRC = {};
AUDIO_KEYS.forEach(k => Object.defineProperty(BGM_SRC, k, { get: () => getTrack(k), enumerable: true }));
// 곡을 미리 풀어두기 (한가할 때) / 폴더 방식이면 미리 받아두기
function prepareTrack(k) {
    if (trackUrl[k]) return;
    const run = () => { const u = getTrack(k); if (u && !EMBEDDED_AUDIO) { try { fetch(u).catch(() => {}); } catch (e) {} } };
    (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(run);
}
// 소리 없는 아주 짧은 소리 (음악이 아직 안 받아졌을 때 아이폰 재생기 잠금만 풀어두는 용도)
const SILENT_SRC = (() => {
    const n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 16000, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
})();
/* ---------- 오디오 (Web Audio 게인으로 페이드, 아이폰 대응) ----------
   - 배경음악: <audio> 요소 1개를 재사용하고 곡(src)만 교체 (아이폰 잠금 해제 유지)
   - 음량/페이드: 요소 → GainNode → 스피커 (아이폰은 audio.volume을 무시하므로 게인으로 조절)
   - 카운트다운 "뚜": 오실레이터로 합성 (음원 파일 없음) */
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} // iOS 17+: 무음 스위치 무시

const VOLUME = { lobby: 0.9, morning: 0.55, evening: 0.55, night: 0.55 };
const FADE_OUT = 0.5, FADE_IN = 0.8;
const musicEl = new Audio();
musicEl.loop = true; musicEl.preload = 'auto'; musicEl.setAttribute('playsinline', '');
const sfxEl = new Audio();   // 동전 소리: 데이터가 받아지면 연결
sfxEl.preload = 'auto'; sfxEl.setAttribute('playsinline', '');
let currentMusic = null;      // 지금 틀어야 하는 곡
let isMuted = false;
try { isMuted = localStorage.getItem('racingMuted') === '1'; } catch (e) {}

// Web Audio 그래프 (미지원 브라우저면 audio.volume으로 대체)
let actx = null, masterGain = null, musicGain = null, sfxGain = null;
try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
        actx = new AC();
        masterGain = actx.createGain(); masterGain.gain.value = isMuted ? 0 : 1; masterGain.connect(actx.destination);
        musicGain = actx.createGain(); musicGain.gain.value = 0; musicGain.connect(masterGain);
        sfxGain = actx.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(masterGain);
        actx.createMediaElementSource(musicEl).connect(musicGain);
        actx.createMediaElementSource(sfxEl).connect(sfxGain);
    }
} catch (e) { actx = null; }

// 테스트·디버그용: 곡별 재생 상태
const BGM = {};
['morning', 'evening', 'night', 'lobby'].forEach(k => Object.defineProperty(BGM, k, { get: () => ({ paused: !(currentMusic === k && !musicEl.paused) }) }));
Object.defineProperty(BGM, 'gacha', { get: () => sfxEl });

function tryPlay(el) {
    try { const p = el.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}
// 음악 음량을 target까지 sec초 동안 부드럽게
function rampMusic(target, sec) {
    if (actx) {
        const g = musicGain.gain, t = actx.currentTime;
        g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(target, t + Math.max(0.01, sec));
    } else {
        musicEl.volume = Math.min(1, target); // 대체 경로 (페이드 없이)
    }
}
let musicTimer = null;
// 음악 페이드아웃 후 정지
function stopAllMusic(fadeSec = 0) {
    currentMusic = null;
    clearTimeout(musicTimer);
    if (fadeSec > 0 && !musicEl.paused) {
        rampMusic(0, fadeSec);
        musicTimer = setTimeout(() => { if (!currentMusic) musicEl.pause(); }, fadeSec * 1000 + 30);
    } else { rampMusic(0, 0.01); musicEl.pause(); }
}
// 곡 재생 (fadeSec만큼 페이드인)
function playMusic(key, fadeSec = FADE_IN) {
    if (key === 'gacha') { playGachaSound(); return; }
    if (!AUDIO_KEYS.includes(key)) return;
    clearTimeout(musicTimer);
    currentMusic = key;
    const src = BGM_SRC[key];
    if (!src) {
        // 아직 음악을 받는 중: 소리 없는 소리로 재생기를 열어두고, 받아지는 순간 onAudioReady에서 재생
        if (musicEl.dataset.key !== '_silent') { musicEl.src = SILENT_SRC; musicEl.dataset.key = '_silent'; }
        tryPlay(musicEl);
        return;
    }
    if (musicEl.dataset.key !== key) { musicEl.src = src; musicEl.dataset.key = key; }
    setMusicRate(1);   // 새로 틀 땐 항상 원래 빠르기 (무한모드 1.1배 해제)
    try { musicEl.currentTime = 0; } catch (e) {}
    musicEl.muted = isMuted && !actx;
    if (actx) { musicEl.volume = 1; musicGain.gain.cancelScheduledValues(actx.currentTime); musicGain.gain.setValueAtTime(0, actx.currentTime); }
    tryPlay(musicEl);
    rampMusic(VOLUME[key] || 0.55, fadeSec);
}
/* ---------- 코스 음악 끊김 없이 반복 ----------
   음원 끝에 페이드아웃·무음(2~5초)이 있어서, 음악이 실제로 끝나는 지점(end)에서 바로 처음(start)으로 넘어감.
   넘어갈 때 0.1초만 살짝 줄였다 키워 튀는 소리를 감춤.
   일반 모드 주행 중엔 원곡 그대로 (60초 안에 끝나므로), 무한모드·결과 화면에서만 적용 */
const MUSIC_LOOP = {
    morning: { start: 0,   end: 65.2 },   // 65.4초부터 2.7초 무음
    evening: { start: 0.2, end: 56.0 },   // 55.5초부터 페이드아웃 + 1.8초 무음
    night:   { start: 0,   end: 62.4 }    // 63.2초부터 2.3초 무음
};
let loopJumping = false;
function tickMusicLoop() {
    const k = currentMusic, lp = MUSIC_LOOP[k];
    if (!lp || loopJumping || musicEl.paused || musicEl.dataset.key !== k) return;
    if (!(runEndless || gameState === 'GAMEOVER' || gameState === 'WIN')) return;
    if (musicEl.currentTime < lp.end - 0.1) return;
    loopJumping = true;
    rampMusic(0, 0.1);
    setTimeout(() => {
        loopJumping = false;
        if (currentMusic !== k || musicEl.dataset.key !== k) return;   // 그 사이 곡이 바뀌었거나 멈췄으면 그대로
        try { musicEl.currentTime = lp.start; } catch (e) {}
        if (!musicEl.paused) rampMusic(VOLUME[k] || 0.55, 0.12);
    }, 100);
}

// 음악 빠르기: 무한모드 60초부터 1.1배 (템포와 음이 함께 살짝 올라가 긴박감)
function setMusicRate(r) {
    try {
        musicEl.preservesPitch = false; musicEl.webkitPreservesPitch = false; musicEl.mozPreservesPitch = false;
        if (musicEl.playbackRate !== r) musicEl.playbackRate = r;
        musicEl.defaultPlaybackRate = r;
    } catch (e) {}
}
function ensureSfx() {
    if (sfxEl.dataset.key === 'gacha') return true;
    const u = BGM_SRC.gacha;
    if (u) { sfxEl.src = u; sfxEl.dataset.key = 'gacha'; return true; }
    if (!sfxEl.src) sfxEl.src = SILENT_SRC;
    return false;
}
// 파일 맨 뒤의 음악 데이터가 하나씩 다 받아질 때마다 불림
window.onAudioReady = function (k) {
    if (k === 'gacha') { ensureSfx(); return; }
    if (currentMusic === k && musicEl.dataset.key !== k) playMusic(k);   // 기다리던 곡이면 바로 재생
    else if (k === selectedTheme) prepareTrack(k);
};
function playGachaSound() {
    if (!ensureSfx()) return;   // 아직 동전 소리를 받는 중이면 생략
    sfxEl.muted = isMuted && !actx;
    if (!actx) sfxEl.volume = 0.8;
    try { sfxEl.currentTime = 0; } catch (e) {}
    tryPlay(sfxEl);
}
// 카운트다운 신호음: high=false → 3·2·1 "뚜", true → GO "뚜~"(한 옥타브 위, 길게)
function playBeep(high) {
    if (!actx || isMuted) return;
    const t = actx.currentTime, dur = high ? 0.55 : 0.16;
    const osc = actx.createOscillator(), g = actx.createGain(), lp = actx.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.value = high ? 1046.5 : 523.25;   // C6 / C5
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.01);
    g.gain.setValueAtTime(0.28, t + dur - 0.06);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(lp); lp.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + dur + 0.02);
}
/* ---------- 무한모드 돌입 효과음 (뱃고동 "뿌우-") ----------
   음원 파일 없이 합성. HORN_STYLE을 바꾸면 소리가 바뀜 (A 뱃고동 / B 뿌웅뿌웅 / C 트럭 경적 / D 증기선) */
const HORN_STYLE = 'B';
const HORN_PRESETS = {
    A: [{ at: 0,    dur: 1.3,  freqs: [87, 87.6, 43.6], lp: 520,  attack: 0.12, release: 0.55, gain: 0.30 }],
    B: [{ at: 0,    dur: 0.32, freqs: [116, 116.8, 58], lp: 1100, attack: 0.05, release: 0.18, gain: 0.42 },
        { at: 0.45, dur: 0.6,  freqs: [116, 116.8, 58], lp: 1100, attack: 0.05, release: 0.35, gain: 0.42 }],
    C: [{ at: 0,    dur: 0.85, freqs: [233, 294, 350],  lp: 1600, attack: 0.02, release: 0.2,  gain: 0.28, bend: -0.04 }],
    D: [{ at: 0,    dur: 1.2,  freqs: [98, 147, 49],    lp: 600,  attack: 0.08, release: 0.5,  gain: 0.26, rise: 0.15 }]
};
function playHorn(style) {
    if (!actx || isMuted) return;
    const t0 = actx.currentTime + 0.02;
    (HORN_PRESETS[style || HORN_STYLE] || HORN_PRESETS.A).forEach(v => {
        const t = t0 + v.at, end = t + v.dur;
        const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = v.lp; lp.Q.value = 1.2;
        const g = actx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(v.gain, t + v.attack);
        g.gain.setValueAtTime(v.gain, end);
        g.gain.linearRampToValueAtTime(0, end + v.release);
        lp.connect(g); g.connect(masterGain);
        v.freqs.forEach((f, i) => {
            const o = actx.createOscillator();
            o.type = i === 2 ? 'square' : 'sawtooth';   // 세 번째는 낮게 깔리는 울림
            if (v.rise) { o.frequency.setValueAtTime(f * (1 - v.rise), t); o.frequency.exponentialRampToValueAtTime(f, t + 0.28); }
            else o.frequency.setValueAtTime(f, t);
            if (v.bend) o.frequency.linearRampToValueAtTime(f * (1 + v.bend), end + v.release);
            const og = actx.createGain(); og.gain.value = i === 2 ? 0.45 : 0.6;
            o.connect(og); og.connect(lp);
            o.start(t); o.stop(end + v.release + 0.05);
        });
    });
}

function toggleMute() {
    isMuted = !isMuted;
    if (actx) {
        const t = actx.currentTime; masterGain.gain.cancelScheduledValues(t);
        masterGain.gain.setValueAtTime(masterGain.gain.value, t); masterGain.gain.linearRampToValueAtTime(isMuted ? 0 : 1, t + 0.15);
    } else { musicEl.muted = isMuted; sfxEl.muted = isMuted; }
    document.getElementById('muteBtn').innerHTML = isMuted ? '<svg class="ic big" aria-hidden="true"><use href="#i-volume-x"/></svg>' : '<svg class="ic big" aria-hidden="true"><use href="#i-volume-2"/></svg>';
    try { localStorage.setItem('racingMuted', isMuted ? '1' : '0'); } catch (e) {}
    if (!isMuted && currentMusic && musicEl.paused) tryPlay(musicEl);
}
function playLobbyMusic(fadeSec = FADE_IN) {
    if (currentMusic !== 'lobby' || musicEl.paused) playMusic('lobby', fadeSec);
}

// 터치할 때마다: 처음이면 오디오 잠금 해제, 이후엔 막혀서 멈춘 음악이 있으면 다시 재생
let sfxUnlocked = false;
function onUserGesture() {
    if (actx && actx.state !== 'running') { try { actx.resume(); } catch (e) {} }
    if (!sfxUnlocked) {                       // 동전 소리 요소도 미리 잠금 해제 (소리 없이)
        sfxUnlocked = true;
        ensureSfx();
        const prevMuted = sfxEl.muted; sfxEl.muted = true;
        try {
            const p = sfxEl.play();
            if (p && p.then) p.then(() => { sfxEl.pause(); sfxEl.currentTime = 0; sfxEl.muted = prevMuted; })
                              .catch(() => { sfxEl.muted = prevMuted; sfxUnlocked = false; });
        } catch (e) { sfxUnlocked = false; }
    }
    if (gameState === 'LOBBY' && !fading && currentMusic !== 'lobby') { playMusic('lobby'); return; }
    if (currentMusic && musicEl.paused) { tryPlay(musicEl); return; }
    if (!currentMusic && !musicEl.src) {      // 음악 없는 화면에서 첫 터치: 요소만 잠금 해제
        musicEl.src = SILENT_SRC; musicEl.dataset.key = '_silent';
        rampMusic(0, 0.01);
        try { const p = musicEl.play(); if (p && p.then) p.then(() => { if (!currentMusic) musicEl.pause(); }).catch(() => {}); } catch (e) {}
    }
}
['touchend', 'click', 'keydown'].forEach(ev => window.addEventListener(ev, onUserGesture, true));
document.addEventListener('visibilitychange', () => {
    if (document.hidden) musicEl.pause();
    else if (currentMusic) { if (actx) try { actx.resume(); } catch (e) {} tryPlay(musicEl); }
});

/* ---------- 화면 전환 페이드 (0.5초 어두워짐 → 전환 → 0.5초 밝아짐) ---------- */
let fading = false;
function fadeTransition(midAction) {
    if (fading) return;                 // 페이드 중 중복 입력 막기
    fading = true;
    const ov = document.getElementById('fadeOverlay');
    ov.style.pointerEvents = 'auto';
    ov.style.opacity = '1';
    setTimeout(() => {
        try { midAction(); } catch (e) { console.error(e); }
        requestAnimationFrame(() => {
            ov.style.opacity = '0';
            setTimeout(() => { ov.style.pointerEvents = 'none'; fading = false; }, 520);
        });
    }, 520);
}
// 버튼에서 부르는 함수
function startRace() {               // 로비 '레이싱 시작' / 결과 '다시 시도하기'
    if (fading || intro || pendingTheme) return;   // 코스를 바꾸는 0.28초 동안엔 출발하지 않음
    stopAllMusic(FADE_OUT);
    // 로비에서 출발: 페이드 없이 카메라가 돌아 차 뒤로 붙으며 시작 / 다시 시도하기: 기존 페이드
    if (gameState === 'LOBBY' && player.meshGroup) { startIntro(); return; }
    fadeTransition(() => initGame());
}
function backToLobby() {             // 결과 '로비로 이동'
    if (fading) return;
    stopAllMusic(FADE_OUT);
    fadeTransition(() => goLobby());
}

document.getElementById('muteBtn').innerHTML = isMuted ? '<svg class="ic big" aria-hidden="true"><use href="#i-volume-x"/></svg>' : '<svg class="ic big" aria-hidden="true"><use href="#i-volume-2"/></svg>';
const typing = e => e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
window.addEventListener('keydown', (e) => { if (typing(e)) return; if (e.key === 'm' || e.key === 'M') toggleMute(); });

function goLobby() {
    playMusic('lobby');
    document.getElementById('endScreen').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('controls').classList.add('hidden');
    document.getElementById('characterPopup').classList.remove('opacity-100', 'translate-x-0');
    document.getElementById('characterPopup').classList.add('opacity-0', 'translate-x-10');
    hideRaceNotices();
    hidePetBubble();
    // 지난 판 흔적 정리 (적 차량 · 목적지 · 파편 · 흔들림)
    enemies.forEach(e => removeCar(e.meshGroup)); enemies = [];
    if (destinationMesh) { scene.remove(destinationMesh); disposeObject(destinationMesh); destinationMesh = null; }
    clearFx(); crash = null; ending = null; shake = 0;
    setGrayscale(false);
    document.getElementById('screenFx').className = "absolute inset-0 pointer-events-none hidden z-10";
    document.getElementById('lobbyScreen').classList.remove('hidden');
    gameState = 'LOBBY';
    applyTheme();
    refreshLobbyCar(true);
    lobbyCut(0);
    updateLobbyUI();
}

