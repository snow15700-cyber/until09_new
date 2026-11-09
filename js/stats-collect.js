/* stats-collect.js — 관리자 통계용 추가 기록 (판마다 · 이용자마다)
   - 판마다: 점프 · 감속 · 쉴드 · 차선 변경 · 추월 · 번 크레딧 · 부딪힌 차 · 평균 FPS · 기기 · 버전 · 도전장 여부
   - 이용자마다: 크레딧 · 보유 차량/반려동물 · 뽑기 횟수 · 코스별 최고 기록 (1줄, 계속 덮어씀)
   - 서버에 stats_v2.sql이 없으면 보내기만 실패하고 게임에는 영향 없음
   ※ 10-destination.js · 11-effects.js · 12-background-update.js · 14-race-intro.js 에서 RS 값을 올림 */
const GAME_BUILD = 'v26.11.10';
let RS = null;   // 이번 판 기록 (Run Stats)

function statPlatform() {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Windows|Macintosh|Linux|CrOS/.test(ua)) return 'pc';
    return 'etc';
}
function statInApp() {
    const ua = navigator.userAgent || '';
    if (/KAKAOTALK/i.test(ua)) return 'kakao';
    if (/Instagram/i.test(ua)) return 'insta';
    if (/NAVER\(inapp/i.test(ua)) return 'naver';
    return '';
}
// 판 시작 (beginRun 바로 뒤)
function statRunStart() {
    let ch = 0;
    try { const c = JSON.parse(sessionStorage.getItem('racingChallenge') || 'null'); ch = c && c.c === selectedTheme && !!c.e === !!runEndless ? 1 : 0; } catch (e) {}
    RS = { j: 0, sl: 0, sh: 0, lc: 0, ov: 0, cr: 0, hit: '', fr: 0, ft: 0, ch, t0: Date.now() };
}
// 매 프레임 (달리는 중에만)
function statFrame(dt) { if (RS && gameState === 'PLAYING') { RS.fr++; RS.ft += dt; } }
// 판이 끝날 때 서버로 보낼 정보 (endRun에서 바로 부름)
function statRunInfo() {
    if (!RS) return null;
    const r = RS; RS = null;
    const info = {
        v: GAME_BUILD, pf: statPlatform(), hi: hiMode ? 1 : 0,
        fps: r.ft > 1 ? Math.round(r.fr / r.ft) : null,
        j: r.j, sl: r.sl, sh: r.sh, lc: r.lc, ov: r.ov, cr: r.cr, ch: r.ch
    };
    if (r.hit) info.hit = r.hit;
    const app = statInApp(); if (app) info.app = app;
    if (userData.stats && userData.stats.runs <= 1) info.first = 1;   // 이 기기의 첫 판
    return info;
}
// 이용자 요약 (판이 끝날 때 · 접속할 때, 2분에 1번까지)
let statSnapAt = 0;
function statSnap(force) {
    if (!userData.deviceId) return;
    const now = Date.now();
    if (!force && now - statSnapAt < 120000) return;
    statSnapAt = now;
    const st = userData.stats || {};
    const info = {
        v: GAME_BUILD, pf: statPlatform(), hi: hiMode ? 1 : 0,
        cr: userData.credits, cars: userData.ownedCars.slice(), pets: userData.pets.slice(), pet: userData.pet || '',
        nick: userData.nickname ? 1 : 0, fame: Object.keys(userData.fameDone || {}).filter(k => userData.fameDone[k]),
        best: userData.best, eb: userData.endlessBest,
        runs: st.runs || 0, jumps: st.jumps || 0, slows: st.slows || 0, quotes: (st.quotes || []).length,
        gp: st.gachaPulls || 0, gn: st.gachaNew || 0,
        tie: userData.bossTie ? (userData.tieOn ? 1 : 0) : -1,   // 김부장 넥타이: -1 못 찾음 · 0 풀어 둠 · 1 매는 중
        pt: Object.fromEntries(Object.entries(userData.petTime || {}).map(([k, v]) => [k, Math.round(v)]))
    };
    rpc('snap_player', { p_device: userData.deviceId, p_info: info }).catch(() => {});
}
setTimeout(() => statSnap(true), 4000);
