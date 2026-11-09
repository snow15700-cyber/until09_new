/* 14-race-intro.js — 로비 → 주행 카메라 연출 · 게임 루프
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   로비 → 주행 카메라 연출 (페이드 없음)
   - 로비 카메라가 차를 중심으로 돌며 차 뒤 위쪽(주행 시점)으로 이동
   - 그동안 도로 속도가 로비 속도 → 주행 첫 속도로 올라가고, 3-2-1이 함께 나와 도착 순간 GO
   - 연출 중 화면을 터치하면 바로 주행 시점으로 (카운트다운은 그대로 진행)
   ========================================== */
const INTRO_DUR = 2.4;                               // 카메라가 도착하는 데 걸리는 시간(초)
const INTRO_COUNT_AT = INTRO_DUR - 3 * COUNT_STEP;   // 이때 '3'이 나오면 도착 순간 GO
let intro = null, introFrom = null;
const smoother = x => x * x * x * (x * (x * 6 - 15) + 10);

function startIntro() {
    const car = player.meshGroup, rel = camera.position.clone().sub(car.position), pet = PetKit.current;
    introFrom = { ang: Math.atan2(rel.x, rel.z), r: Math.hypot(rel.x, rel.z), y: rel.y, look: lobbyLookAt.clone(),
        fov: camera.fov, sheetH: lobbySheetH, petRot: pet ? pet.holder.rotation.y : 0 };
    const lob = document.getElementById('lobbyScreen');
    lob.classList.add('lb-leaving');
    setTimeout(() => { lob.classList.add('hidden'); lob.classList.remove('lb-leaving'); }, 460);
    initGame({ intro: true });
}
// initGame 끝에서 불림: 새로 만든 차 기준으로 출발·도착 시점을 정함
function setupIntro() {
    const f = introFrom; if (!f) return;
    if (PetKit.current) PetKit.current.holder.rotation.y = f.petRot;   // 카메라를 보던 반려동물이 천천히 앞을 봄
    const p = player.meshGroup.position, toX = p.x * 0.8, dx = toX - p.x;
    intro = { t: 0, speed: LOBBY_SPEED, from: f, to: { ang: Math.atan2(dx, 12), r: Math.hypot(dx, 12), y: 8, look: V3(toX, 0, -20) } };
    document.getElementById('hud').classList.add('intro-hide');
    applyIntroCamera(0);
}
function applyIntroCamera(k) {
    const f = intro.from, t = intro.to, e = smoother(k), car = player.meshGroup.position;
    let d = t.ang - f.ang; d = Math.atan2(Math.sin(d), Math.cos(d));   // 가까운 쪽으로 돌기
    const ang = f.ang + d * e, r = f.r + (t.r - f.r) * e;
    const y = f.y + (t.y - f.y) * e + Math.sin(Math.PI * e) * 1.5;   // 도는 동안 살짝 떠올라 차를 넘어감
    camera.position.set(car.x + Math.sin(ang) * r, y, car.z + Math.cos(ang) * r);
    // 로비 패널 때문에 올려둔 화면 중심·시야각을 주행 값으로 되돌림
    const w = container.clientWidth, h = container.clientHeight, sh = f.sheetH * (1 - e);
    camera.fov = f.fov + (BASE_FOV - f.fov) * e;
    if (sh > 0.5) { camera.aspect = w / (h + sh); camera.setViewOffset(w, h + sh, 0, sh, w, h); }
    else { camera.clearViewOffset(); camera.aspect = w / h; }
    camera.updateProjectionMatrix();
    camera.lookAt(f.look.clone().lerp(t.look, smoother(clamp01((k - 0.55) / 0.45))));   // 도는 동안엔 차를 보다가 후반에 앞을 봄
}
function updateIntro(dt) {
    intro.t = Math.min(INTRO_DUR, intro.t + dt);
    const k = intro.t / INTRO_DUR, top = 120 * tConfig.speedMult;   // 주행 첫 속도와 같게 → GO 때 속도가 튀지 않음
    intro.speed = LOBBY_SPEED + (top - LOBBY_SPEED) * k * k;          // 처음엔 천천히, 점점 빠르게
    const sp = intro.speed * dt;
    roadOffset += sp; markersGroup.position.z = roadOffset % 15;
    scrollEnvironment(sp);
    if (k > 0.55) document.getElementById('hud').classList.remove('intro-hide');
    applyIntroCamera(k);
}
function finishIntro() {
    if (!intro) return;
    intro = null; introFrom = null;
    document.getElementById('hud').classList.remove('intro-hide');
    camera.clearViewOffset(); camera.aspect = container.clientWidth / container.clientHeight;
    camera.fov = BASE_FOV; camera.updateProjectionMatrix();
    const x = player.meshGroup.position.x * 0.8;
    camera.position.set(x, 8, 12); camera.lookAt(x, 0, -20);
}
// 건너뛰기: 카메라는 바로 주행 시점, 도로는 계속 달리고, 3-2-1은 지금부터 (이미 시작했으면 이어서)
function skipIntro() {
    if (!intro || intro.t < 0.15 || intro.t >= INTRO_DUR) return;   // 출발 버튼을 누른 그 터치는 무시
    intro.t = INTRO_DUR;
    countdownTimer = Math.max(countdownTimer, 0);
    document.getElementById('hud').classList.remove('intro-hide');
}
container.addEventListener('pointerdown', skipIntro);

// ---- 주행: 현재 시각 · 10초마다 남은 시간 알림 · 마지막 9초 카운트다운 ----
let raceBannerNext = 0, raceBannerUntil = 0, lastBigCount = 0, bannerTimer = null, raceLateSaid = false;
const pad2 = n => String(n).padStart(2, '0');
function resetRaceClock() {
    raceBannerNext = 0; raceBannerUntil = 0; lastBigCount = 0; raceLateSaid = false;
    const ci = COURSE_INFO[selectedTheme];
    setText('clockDisplay', pad2(ci.startH) + ':59:00');
    document.getElementById('clockDisplay').classList.remove('late');
    // 전자시계 아랫줄: 도착 목표 시각 (출근 09:00 / 퇴근 18:00 / 출국 12:00), 위쪽 AM·PM 표시
    setText('clockAmPm', ci.startH < 12 ? 'AM' : 'PM');
    setText('clockGoal', `${ci.goal} ${pad2(ci.startH + 1)}:00`);
    document.getElementById('clockGoal').parentElement.classList.remove('late');
    updateSpeedHud(0);
    hideRaceNotices();
}
function hideRaceNotices() {
    clearTimeout(bannerTimer);
    document.getElementById('timeBanner').classList.remove('on');
    document.getElementById('bigCount').classList.remove('pop');
    if (window.LateFx) LateFx.reset();
}
function showTimeBanner(left) {
    const el = document.getElementById('timeBanner');
    el.className = 'time-banner' + (left <= 10 ? ' urgent' : '');
    el.innerHTML = `⏰ ${COURSE_INFO[selectedTheme].goal}까지 남은 시간 <b>${left}초</b>`;
    requestAnimationFrame(() => el.classList.add('on'));
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => el.classList.remove('on'), 1500);
    raceBannerUntil = gameTime + 1.5;
}
// 무한모드 알림: 도로를 가리지 않도록 가운데 박스 대신 '시계에서 퍼지는 파동 + 시계 아래 표시 + 소리'로 알림 (late-fx.js)
//  60초 "지각 확정!" (빨간 파동 3줄 + 화면 가장자리 번쩍 + 뱃고동) / 이후 10초마다 노란 파동, 1분마다 빨간 파동
function showEndlessBanner(lateSec) {
    if (!lateSec) {
        playHorn();
        // 뱃고동이 잘 들리게 배경음악을 1.2초 동안 절반으로 줄였다가 되돌림
        const mk = currentMusic;
        if (mk) { rampMusic((VOLUME[mk] || 0.55) * 0.5, 0.08); setTimeout(() => { if (currentMusic === mk && !musicEl.paused) rampMusic(VOLUME[mk] || 0.55, 0.4); }, 1200); }
        setMusicRate(1.1);   // 배경음악 1.1배 빠르게 (결과 화면까지 유지, 다음 곡을 틀 때 원래대로)
        if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) {}
    }
    LateFx.show(lateSec);
}
// HUD 7세그먼트 화면 만들기 + 속도계 아래 얇은 선 (60초 때 최고 속도 = 꽉 참, 끝 20%는 빨강)
segInit(document.getElementById('clockDisplay'), '88:88:88');
segInit(document.getElementById('speedDisplay'), '888');
document.getElementById('speedBar').innerHTML = '<span></span>';
let speedHudPct = -1;
function updateSpeedHud(v) {
    setText('speedDisplay', String(Math.min(999, Math.floor(v))));
    const max = 240 * (tConfig ? tConfig.speedMult : 1);
    const pct = Math.max(0, Math.min(100, Math.round(v / max * 100)));
    if (pct === speedHudPct) return;
    speedHudPct = pct;
    const bar = document.getElementById('speedBar');
    bar.firstChild.style.width = pct + '%';
    bar.classList.toggle('hot', pct >= 80);
}
function updateRaceClock() {
    const ci = COURSE_INFO[selectedTheme], sec = Math.min(59, Math.floor(gameTime));
    if (runEndless && gameTime >= 60) {   // 지각 모드: 정각이 지나도 빨간 시계가 계속 감 (09:00:18 …)
        const over = Math.floor(gameTime - 60), h = ci.startH + 1 + Math.floor(over / 3600);
        setText('clockGoal', '⚠ 지각 중');
        document.getElementById('clockDisplay').classList.add('late'); document.getElementById('clockGoal').parentElement.classList.add('late');
        setText('clockDisplay', `${pad2(h % 24)}:${pad2(Math.floor(over / 60) % 60)}:${pad2(over % 60)}`);
        return;
    }
    setText('clockDisplay', `${pad2(ci.startH)}:59:${pad2(sec)}`);
    if (gameTime >= 50) { document.getElementById('clockDisplay').classList.add('late'); document.getElementById('clockGoal').parentElement.classList.add('late'); }
    // 남은 시간 알림·카운트다운 없음. 50초에 반려동물만 한마디
    if (gameTime >= 50 && !raceLateSaid) { raceLateSaid = true; petSay('late', true); }
}

function gameLoop() {
    let now = performance.now();
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    statFrame(dt);   // 평균 FPS (관리자 통계)

    update(dt);
    petTime += dt;
    PetKit.tick(petTime, player.isJumping ? Math.sin(Math.max(0, 1 - player.jumpTimer) * Math.PI) : 0, dt);
    // 연출 갱신 (충돌 중엔 파편도 슬로모션)
    updateFx(dt * (gameState === 'CRASH' && crash ? crash.fxSlow || 0.25 : 1));
    const worldSpeed = gameState === 'LOBBY' ? LOBBY_SPEED : (gameState === 'COUNTDOWN' && intro) ? intro.speed : (gameState === 'PLAYING' || gameState === 'SUCCESS_ANIM') ? roadSpeed * (gameState === 'PLAYING' ? player.timeScale : 1) : 0;
    updateWeather(dt, worldSpeed);
    updateSpeedFx(dt, gameState === 'PLAYING');
    // 화면 흔들림
    let sx = 0, sy = 0;
    if (shake > 0.01) { sx = (Math.random() - 0.5) * shake; sy = (Math.random() - 0.5) * shake; camera.position.x += sx; camera.position.y += sy; shake *= Math.max(0, 1 - 4 * dt); }
    renderer.render(scene, camera);
    camera.position.x -= sx; camera.position.y -= sy;
    if (petBubbleUntil && performance.now() > petBubbleUntil) hidePetBubble();
    tickMusicLoop();   // 코스 음악 끝부분 무음 건너뛰기

    animationId = requestAnimationFrame(gameLoop);
}

