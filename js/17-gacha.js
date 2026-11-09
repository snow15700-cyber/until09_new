/* 17-gacha.js — 차량 뽑기 연출 · 게임 시작(맨 마지막에 실행)
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   차량 뽑기 연출 (전체화면 룰렛)
   실루엣 룰렛 약 2초 → 점점 느려지다 정지 → 새 차량이면 화려하게 공개 / 중복이면 40% 환급 안내
   로비 미리보기 3D 화면(previewCanvas)을 뽑기 무대로 잠깐 옮겨서 씀 (3D 화면을 새로 만들지 않음)
   ========================================== */
let gachaBusy = false, previewSpin = 0.6, revealT = 1;
let gachaSil = [], gachaTimers = [], gachaMusicTimer = null;

function playTick(i) {
    if (!actx || isMuted) return;
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = 'square'; o.frequency.value = 1400 + (i % 2) * 220;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.13, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    o.connect(g); g.connect(masterGain); o.start(t); o.stop(t + 0.06);
}
function playFanfare() {
    if (!actx || isMuted) return;
    const t0 = actx.currentTime;
    const notes = [[523.25, 0, 0.11], [659.25, 0.11, 0.11], [783.99, 0.22, 0.11], [1046.5, 0.33, 0.7], [1318.5, 0.33, 0.7], [1568, 0.33, 0.7]];
    notes.forEach(([f, at, dur]) => {
        ['triangle', 'square'].forEach((type, k) => {
            const o = actx.createOscillator(), g = actx.createGain(), t = t0 + at, v = k ? 0.05 : 0.16;
            o.type = type; o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.015);
            g.gain.setValueAtTime(v, t + dur - 0.08); g.gain.linearRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(masterGain); o.start(t); o.stop(t + dur + 0.05);
        });
    });
}

// 꽃가루
let confetti = [], confettiRAF = null;
function startConfetti() {
    const cv = document.getElementById('gachaFx'), ctx2 = cv.getContext('2d');
    cv.width = cv.clientWidth; cv.height = cv.clientHeight;
    const cols = ['#facc15', '#f472b6', '#60a5fa', '#34d399', '#fb923c', '#ffffff', '#a78bfa'];
    confetti = Array.from({ length: 150 }, () => ({
        x: cv.width / 2 + (Math.random() - 0.5) * 60, y: cv.height * 0.38,
        vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 10,
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 6, h: 3 + Math.random() * 5,
        c: cols[Math.floor(Math.random() * cols.length)], life: 2.6 + Math.random()
    }));
    let last = performance.now();
    const step = () => {
        const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
        ctx2.clearRect(0, 0, cv.width, cv.height);
        confetti = confetti.filter(p => (p.life -= dt) > 0);
        confetti.forEach(p => {
            p.vy += 22 * dt; p.vx *= 0.99; p.x += p.vx * dt * 30; p.y += p.vy * dt * 30; p.r += p.vr;
            ctx2.save(); ctx2.globalAlpha = Math.min(1, p.life); ctx2.translate(p.x, p.y); ctx2.rotate(p.r);
            ctx2.fillStyle = p.c; ctx2.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); ctx2.restore();
        });
        confettiRAF = confetti.length ? requestAnimationFrame(step) : null;
    };
    cancelAnimationFrame(confettiRAF); step();
}
function stopConfetti() {
    cancelAnimationFrame(confettiRAF); confettiRAF = null; confetti = [];
    const cv = document.getElementById('gachaFx'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
}

function renderOwned(highlightIdx) {
    const n = userData.ownedCars.length;
    const dots = CAR_DB.map((c, i) => {
        const own = userData.ownedCars.includes(c.id);
        const hex = '#' + c.color.toString(16).padStart(6, '0');
        return `<span title="${esc(c.name)}" class="inline-block w-4 h-4 rounded-full border ${i === highlightIdx ? 'gacha-dot-new' : ''}" style="background:${own ? hex : 'transparent'};border-color:${own ? hex : '#4b5563'}"></span>`;
    }).join('');
    document.getElementById('gachaOwned').innerHTML = `<span class="font-bold">보유 차량 <b class="text-white">${n}</b>/${CAR_DB.length}</span><span class="flex gap-1">${dots}</span>`;
}

function rollGacha() {
    if (gachaBusy || fading) return;
    if (userData.ownedCars.length >= CAR_DB.length) { showToast('🏆 모든 차량을 모았어요! (크레딧은 그대로예요)'); return; }
    if (userData.credits < GACHA_COST) { showToast(`크레딧이 부족합니다! (${GACHA_COST} 필요)`); return; }

    // 결과는 먼저 정해서 저장 (연출 중에 창을 닫아도 결과가 남음)
    userData.credits -= GACHA_COST;
    const idx = Math.floor(Math.random() * CAR_DB.length);
    const car = CAR_DB[idx];
    const isNew = !userData.ownedCars.includes(car.id);
    if (isNew) userData.ownedCars.push(car.id); else userData.credits += GACHA_REFUND;
    userData.stats.gachaPulls = (userData.stats.gachaPulls || 0) + 1; if (isNew) userData.stats.gachaNew = (userData.stats.gachaNew || 0) + 1;   // 관리자 통계
    gachaBusy = true;              // 연출이 끝날 때까지 로비 미리보기는 그대로
    currentCarIndex = idx;
    saveData();
    playGachaSound();
    openGacha(idx, isNew);
}

function openGacha(idx, isNew) {
    const modal = document.getElementById('gachaModal');
    modal.classList.remove('hidden');
    ['gachaRays'].forEach(id => document.getElementById(id).classList.remove('on'));
    const badge = document.getElementById('gachaBadge'); badge.classList.add('hidden'); badge.classList.remove('pop');
    document.getElementById('gachaName').textContent = '???';
    document.getElementById('gachaName').className = 'text-2xl font-black text-white';
    document.getElementById('gachaDesc').textContent = '';
    document.getElementById('gachaMsg').innerHTML = '<span class="text-gray-400">두근두근…</span>';
    document.getElementById('gachaOk').classList.add('invisible');
    document.getElementById('gachaOwned').innerHTML = '';
    // 3D 화면을 무대로 옮기기
    const stage = document.getElementById('gachaStage');
    stage.appendChild(previewCanvas);
    previewCanvas.style.position = 'relative'; previewCanvas.style.zIndex = '1';
    document.getElementById('previewLock').classList.add('hidden');
    previewCam.position.set(0, 5.2, 17); previewCam.lookAt(0, 1.1, 0);   // 세로로 긴 무대에 맞게 카메라를 뒤로
    // 실루엣 5대 준비
    previewPivot.children.slice().forEach(c => removeCar(c));
    gachaSil = CAR_DB.map(c => {
        const m = createCarMesh(c.model, c.color).mesh;
        m.traverse(o => { if (o.isMesh) o.material = silhouetteMat; if (o.isSprite) o.visible = false; });
        m.visible = false; previewPivot.add(m); return m;
    });
    ttRing.material.color.set(0xfacc15);
    previewPivot.scale.setScalar(1); revealT = 1;
    // 로비 음악 살짝 줄이기
    clearTimeout(gachaMusicTimer);
    if (currentMusic) rampMusic((VOLUME[currentMusic] || 0.55) * 0.3, 0.4);

    // 룰렛 일정: 약 2초 빠르게 → 점점 느려지다 정지
    const iv = []; let t = 0;
    while (t < 2000) { iv.push(65); t += 65; }
    let d = 65; while (d < 540) { d *= 1.2; iv.push(d); }
    const N = iv.length;
    const seq = iv.map((_, i) => ((idx - (N - 1 - i)) % CAR_DB.length + CAR_DB.length * 100) % CAR_DB.length);
    gachaTimers.forEach(clearTimeout); gachaTimers = [];
    let at = 0;
    seq.forEach((k, i) => {
        gachaTimers.push(setTimeout(() => {
            gachaSil.forEach((m, j) => m.visible = (j === k));
            previewSpin = Math.max(0.6, 4 * (65 / iv[i]));
            const nm = document.getElementById('gachaName');
            nm.classList.remove('name-tick'); void nm.offsetWidth; nm.classList.add('name-tick');
            playTick(i);
        }, at));
        at += iv[i];
    });
    gachaTimers.push(setTimeout(() => revealGacha(idx, isNew), at + 120));
}

function revealGacha(idx, isNew) {
    const car = CAR_DB[idx];
    previewPivot.children.slice().forEach(c => removeCar(c)); gachaSil = [];
    previewPivot.add(createCarMesh(car.model, car.color).mesh);
    previewPivot.scale.setScalar(0.6); revealT = 0; previewSpin = 0.6;
    const nm = document.getElementById('gachaName');
    nm.textContent = car.name;
    nm.className = 'text-2xl font-black reveal-pop ' + (isNew ? 'text-yellow-300' : 'text-white');
    document.getElementById('gachaDesc').textContent = car.desc;
    const fl = document.getElementById('gachaFlash');
    if (isNew) {
        fl.style.transition = 'none'; fl.style.opacity = '0.95';
        requestAnimationFrame(() => requestAnimationFrame(() => { fl.style.transition = 'opacity 0.7s ease-out'; fl.style.opacity = '0'; }));
        document.getElementById('gachaRays').classList.add('on');
        const badge = document.getElementById('gachaBadge'); badge.classList.remove('hidden'); void badge.offsetWidth; badge.classList.add('pop');
        ttRing.material.color.set(0xfacc15);
        document.getElementById('gachaMsg').innerHTML = '<span class="text-yellow-300 font-black">🎉 새 차량을 얻었어요!</span>';
        startConfetti();
        playFanfare();
        if (navigator.vibrate) try { navigator.vibrate([40, 30, 80]); } catch (e) {}
    } else {
        ttRing.material.color.set(0x60a5fa);
        document.getElementById('gachaMsg').innerHTML = `<span class="text-sky-300 font-bold">이미 보유한 차량이에요 · 40% 환급 <b class="text-yellow-300">+${GACHA_REFUND}C</b></span>`;
        playGachaSound();
    }
    renderOwned(isNew ? idx : -1);
    // 로비 음악 원래대로
    gachaMusicTimer = setTimeout(() => { if (currentMusic) rampMusic(VOLUME[currentMusic] || 0.55, 1.2); }, isNew ? 1100 : 400);
    setTimeout(() => document.getElementById('gachaOk').classList.remove('invisible'), 600);
}

function closeGacha() {
    gachaTimers.forEach(clearTimeout); gachaTimers = [];
    clearTimeout(gachaMusicTimer);
    if (currentMusic) rampMusic(VOLUME[currentMusic] || 0.55, 0.4);
    stopConfetti();
    document.getElementById('gachaModal').classList.add('hidden');
    document.getElementById('gachaRays').classList.remove('on');
    // 3D 화면을 로비로 되돌리기
    const lock = document.getElementById('previewLock');
    lock.parentElement.insertBefore(previewCanvas, lock);
    previewCanvas.style.position = ''; previewCanvas.style.zIndex = '';
    previewCam.position.set(0, 3.2, 10); previewCam.lookAt(0, 1.0, 0);
    previewPivot.children.slice().forEach(c => removeCar(c)); gachaSil = [];
    previewPivot.scale.setScalar(1); revealT = 1; previewSpin = 0.6;
    gachaBusy = false; previewCarKey = '';
    updateLobbyUI();
}

window.previewReady = true;
let previewLast = performance.now();
function previewLoop() {
    const now = performance.now(), dt = Math.min(0.1, (now - previewLast) / 1000); previewLast = now;
    // 로비가 보일 때만 그림 (게임 중엔 쉬어서 성능 확보)
    if (previewRenderer && !document.getElementById('gachaModal').classList.contains('hidden')) {   // 뽑기 무대가 열렸을 때만 그림
        resizePreview();
        previewPivot.rotation.y += dt * previewSpin; // 평소엔 천천히 (약 10초에 한 바퀴), 뽑기 룰렛 땐 빠르게
        if (revealT < 1) {                            // 뽑기 결과 공개: 톡 튀어나오며 커짐
            revealT = Math.min(1, revealT + dt * 2.6);
            const k = revealT, c = 1.7; const e = 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
            previewPivot.scale.setScalar(0.6 + 0.4 * e);
        }
        previewRenderer.render(previewScene, previewCam);
    }
    requestAnimationFrame(previewLoop);
}

// 앱 시작 시 데이터 로드 및 로비 렌더링
loadData();
defaultEndless(true); updateLobbyUI();   // 클리어한 코스는 무한모드로 시작
previewLoop();
if (!userData.nickname) openNickname(true); else flushPending();
flushPlays();   // 지난번에 못 보낸 플레이 기록
flushRuns();                      // 지난번에 못 보낸 판 끝 기록
flushEndless().catch(() => {});   // 지난번에 못 올린 무한모드 기록
showNotice();   // 기존 플레이어: 업데이트 안내 (닉네임 창보다 위에 뜸)
// 시네마틱 로비 시작: 코스 배경 + 내 차 + 반려동물
applyTheme();
refreshLobbyCar(true);
lastTime = performance.now();
gameLoop();
if (window.__hideSplash) window.__hideSplash();

