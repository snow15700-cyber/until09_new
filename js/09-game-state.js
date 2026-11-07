/* 09-game-state.js — 게임 상태 · 출발 준비(initGame)
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   4. 게임 상태 및 핵심 로직
   ========================================== */
let gameState = 'LOBBY';
let gameTime = 0;
let score = 0;
let lastTime = performance.now();
const COUNT_STEP = 0.5;   // 숫자 하나당 0.5초 (빠른 카운트)
let countdownTimer = 0, countdownStep = -1;

// [최적화] 화면 글자는 내용이 바뀔 때만 다시 씀
const textCache = {};
function setText(id, txt) {
    if (textCache[id] === txt) return;
    textCache[id] = txt;
    const el = document.getElementById(id);
    if (el._seg) segSet(el, txt); else el.textContent = txt;   // 7세그먼트 화면이면 칸만 켜고 끔
}

/* ---- 7세그먼트 숫자 (SVG로 직접 그림: 폰트 없이 탁상 전자시계처럼 또렷하게) ----
   segInit(el, '88:88:88') 로 틀을 만들고, setText(id, '08:59:16') 로 칸을 켬 */
const SEG_W = 10.4, SEG_H = 18, SEG_T = 2.4, SEG_G = 0.42, SEG_GAP = 3, SEG_COLON = 4.4;
const SEG_MAP = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', ' ': '', '-': 'g' };
function segPaths(ox) {
    const t = SEG_T, h2 = t / 2, g = SEG_G, w = SEG_W, h = SEG_H;
    const hz = yc => { const x1 = ox + g + h2, x2 = ox + w - g - h2; return `${x1},${yc} ${x1 + h2},${yc - h2} ${x2 - h2},${yc - h2} ${x2},${yc} ${x2 - h2},${yc + h2} ${x1 + h2},${yc + h2}`; };
    const vt = (xc, y1, y2) => `${xc},${y1} ${xc + h2},${y1 + h2} ${xc + h2},${y2 - h2} ${xc},${y2} ${xc - h2},${y2 - h2} ${xc - h2},${y1 + h2}`;
    const L = ox + h2, R = ox + w - h2, M = h / 2;
    return { a: hz(h2), g: hz(M), d: hz(h - h2), f: vt(L, h2 + g, M - g), b: vt(R, h2 + g, M - g), e: vt(L, M + g, h - h2 - g), c: vt(R, M + g, h - h2 - g) };
}
function segInit(el, pattern) {
    let x = 0, svg = '';
    const cells = [];
    for (const ch of pattern) {
        if (ch === ':') {
            const cx = x + SEG_COLON / 2 - SEG_GAP / 2;
            svg += `<circle class="s on" cx="${cx}" cy="${SEG_H * 0.32}" r="${SEG_T * 0.62}"/><circle class="s on" cx="${cx}" cy="${SEG_H * 0.68}" r="${SEG_T * 0.62}"/>`;
            cells.push(null); x += SEG_COLON;
        } else {
            const ps = segPaths(x);
            svg += Object.entries(ps).map(([k, pts]) => `<polygon class="s" data-k="${k}" data-i="${cells.length}" points="${pts}"/>`).join('');
            cells.push(true); x += SEG_W + SEG_GAP;
        }
    }
    const W = x - SEG_GAP;
    el.innerHTML = `<svg viewBox="-1 -1 ${W + 2} ${SEG_H + 2}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
    el._seg = cells.map((c, i) => c ? [...el.querySelectorAll(`polygon[data-i="${i}"]`)].reduce((o, p) => (o[p.dataset.k] = p, o), {}) : null);
    el._segLen = cells.length;
}
function segSet(el, txt) {
    const chars = String(txt).padStart(el._segLen, ' ').slice(-el._segLen);
    el._seg.forEach((cell, i) => {
        if (!cell) return;
        const on = SEG_MAP[chars[i]] || '';
        for (const k in cell) cell[k].classList.toggle('on', on.includes(k));
    });
}
function showCount(text, color) {
    const el = document.getElementById('countText');
    el.textContent = text;
    el.style.color = color;
    el.classList.remove('count-pop'); void el.offsetWidth; el.classList.add('count-pop'); // 애니메이션 재시작
    document.getElementById('countdown').classList.remove('hidden');
}

function updateCountdown(realDt) {
    countdownTimer += realDt;
    if (countdownTimer < 0) return;   // 시작 전 대기 (카메라 연출·페이드 중엔 숫자 없음)
    const step = Math.floor(countdownTimer / COUNT_STEP); // 0:3, 1:2, 2:1, 3:GO
    if (step !== countdownStep) {
        countdownStep = step;
        if (step < 3) { showCount(String(3 - step), ['#f87171', '#fbbf24', '#34d399'][step]); playBeep(false); }
        else if (step === 3) {
            finishIntro();   // 카메라 연출 마무리 (게임 시점에 정확히 맞춤)
            showCount('GO!', '#60a5fa');
            setTimeout(() => { if (gameState === 'PLAYING') petSay('start', true); }, 700);
            playBeep(true);
            gameState = 'PLAYING';
            document.getElementById('controls').classList.remove('hidden');
            playMusic(selectedTheme); // 출발과 동시에 코스별 배경음악
            setTimeout(() => { if (countdownStep === 3) document.getElementById('countdown').classList.add('hidden'); }, 500);
        }
    }
}
let animationId;
let roadSpeed = 100;
let roadOffset = 0;

// 테마 설정
let tConfig;

// 플레이어 상태
let destinationMesh = null;
let successAnimTimer = 0;
let nextPopupTime = 0;

let player = {
    meshGroup: null, width: 0, length: 0,
    lane: 1, targetX: 0,
    jumpsLeft: 2, isJumping: false, jumpTimer: 0,
    ability: '', hasShield: false,
    invincibleTimer: 0,          // [수정3] 점프와 분리된 무적 타이머
    timeScale: 1.0, skillTimer: 0,
    slowTimer: 0,                // [수정1] 감속 효과 남은 시간
    slowLeft: 0                  // 타임 컨트롤러: 남은 감속 횟수 (쿨타임 대신 판당 2회)
};
const SLOW_DURATION = 3.0;
const SLOW_USES = 2;
let runEndless = false;          // 이번 판이 무한모드인지 (60초가 지나도 계속)
let endlessAnnounced = false;    // 60초 '지각' 알림을 이미 띄웠는지
let endlessNextBanner = 70;      // 다음 '지각 n초째' 알림 시각
const SHIELD_INVINCIBLE = 1.0;
let enemies = [];
let enemySpawnTimer = 0;

