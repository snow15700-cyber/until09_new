/* 02-online-ranking.js — 닉네임 · 온라인 랭킹 · 명예의 전당 (Supabase 서버)
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   닉네임 + 온라인 랭킹 (Supabase)
   ========================================== */
const SUPABASE_URL = 'https://hfqolkpghockqytdjjfn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JI7cXLrmqgorDWvvi8ZmSw_Ny8WmicQ'; // 공개용 키 (읽기 + 등록 함수만 허용)
const COURSE_NAMES = { morning: '출근길', evening: '퇴근길', night: '소풍길' };
const CAR_NAME_BY_ID = Object.fromEntries(CAR_DB.map(c => [c.id, c.name]));

// 기기 고유 ID (남에게 보이지 않음) + 4자리 태그 (#1234, 랭킹에 표시)
function ensureIdentity() {
    if (!userData.deviceId) {
        const b = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => b[i] = Math.random() * 256);
        userData.deviceId = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    }
    if (!/^\d{4}$/.test(userData.tag || '')) userData.tag = String(Math.floor(1000 + Math.random() * 9000));
    if (!userData.best) userData.best = { morning: 0, evening: 0, night: 0 };
    if (!userData.fameDone) userData.fameDone = {};
    if (!userData.endlessBest || typeof userData.endlessBest !== 'object') userData.endlessBest = {};
    ['morning', 'evening', 'night'].forEach(k => { if (!Number.isFinite(userData.endlessBest[k])) userData.endlessBest[k] = 0; });
    if (!userData.endlessPending || typeof userData.endlessPending !== 'object') userData.endlessPending = {};
    if (!userData.fameNames || typeof userData.fameNames !== 'object') userData.fameNames = {};
    if (!userData.pending) userData.pending = {};
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = s => (Math.floor(Number(s) * 10) / 10).toFixed(1) + '초';
const fmtDate = iso => { const d = new Date(iso); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };
// 날짜 + 시간 (보는 사람 휴대폰 시간대 기준)
const fmtDateTime = iso => { const d = new Date(iso); return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
// 명예의 전당용 짧은 날짜: 10.01 10:00 (연도 없이)
const fmtShortDateTime = iso => { const d = new Date(iso); return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
// 기록을 세운 차량: 색깔 점만 (이름은 길게 누르거나 마우스를 올리면 보임)
function carDotHtml(id) {
    const c = CAR_DB.find(x => x.id === id);
    if (!c) return '<span class="inline-block w-2.5 h-2.5 shrink-0"></span>';
    const hex = '#' + c.color.toString(16).padStart(6, '0');
    return `<span class="inline-block w-2.5 h-2.5 rounded-full shrink-0" title="${esc(c.name)}" aria-label="${esc(c.name)}" style="background:${hex};box-shadow:0 0 0 1px rgba(255,255,255,0.35)"></span>`;
}

// 이름 검사: 2~10자, 한글/영문/숫자/공백/_.- 만, 기본 금칙어
const BAD_WORDS = ['시발', '씨발', 'ㅅㅂ', '병신', 'ㅂㅅ', '좆', '존나', '개새', '새끼', '미친놈', '미친년', '지랄', '닥쳐', '꺼져', '섹스', '보지', '자지', 'fuck', 'shit', 'bitch', 'sex', 'admin', '운영자', '관리자'];
function checkName(raw) {
    const n = String(raw || '').trim().replace(/\s+/g, ' ');
    if (n.length < 2 || n.length > 10) return { ok: false, msg: '2~10자로 입력해 주세요.' };
    if (!/^[가-힣A-Za-z0-9 _.\-]+$/.test(n)) return { ok: false, msg: '한글, 영문, 숫자만 쓸 수 있어요.' };
    const flat = n.toLowerCase().replace(/[\s_.\-0-9]/g, '');
    if (BAD_WORDS.some(w => flat.includes(w))) return { ok: false, msg: '사용할 수 없는 단어가 들어 있어요.' };
    return { ok: true, name: n };
}

// ---- Supabase 통신 (6초 넘으면 실패 처리) ----
async function sb(path, opts = {}) {
    const ctrl = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 6000);
    try {
        const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
            method: opts.body ? 'POST' : 'GET',
            headers: Object.assign({ apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, opts.headers || {}),
            body: opts.body ? JSON.stringify(opts.body) : undefined,
            signal: ctrl ? ctrl.signal : undefined
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const txt = await res.text();
        return txt ? JSON.parse(txt) : null;
    } finally { clearTimeout(timer); }
}
const rpc = (fn, args) => sb('rpc/' + fn, { body: args });
const fetchTop = course => sb(`time_records?select=nickname,tag,seconds,car,updated_at&course=eq.${course}&order=seconds.desc,updated_at.asc&limit=10`);
// 명예의 전당: 무한모드 기록 높은 순 (무한모드를 안 했으면 60.0초), 같으면 먼저 클리어한 순
// 날짜는 무한 기록을 세운 시각(endless_at), 무한모드를 안 했으면 처음 클리어한 시각
// (서버에 fame_date.sql을 아직 안 돌렸으면 endless_at을 못 읽으니 예전 방식으로 다시 불러옴)
let fameHasEndlessAt = true;
async function fetchFame(course) {
    const q = (cols, order) => `hall_of_fame?select=${cols}&course=eq.${course}&order=${order}&limit=1000`;
    if (fameHasEndlessAt) {   // 기록이 같으면 그 기록을 먼저 세운 사람이 위 (무한모드를 안 했으면 먼저 클리어한 순)
        try { return await sb(q('id,fame_name,nickname,tag,car,cleared_at,endless_best,endless_at', 'endless_best.desc,endless_at.asc.nullslast,cleared_at.asc,id.asc')); }
        catch (e) { if (!/HTTP 4/.test(String(e && e.message))) throw e; fameHasEndlessAt = false; }
    }
    return sb(q('id,fame_name,nickname,tag,car,cleared_at,endless_best', 'endless_best.desc,cleared_at.asc,id.asc'));
}
const fetchMyRank = course => rpc('my_time_rank', { p_device: userData.deviceId, p_course: course }).then(r => (r && r[0]) || null);

/* ---- 판 검증 (기록 조작 방어) ----
   판을 시작할 때 서버에 판 번호를 받아두고(start_run), 끝나면 버틴 시간을 보냄(finish_run).
   서버는 "시작 후 실제로 흐른 시간"보다 긴 기록을 거절하고, 랭킹·명예의 전당은 서버가 검증한 시간만 씀.
   같은 기록으로 이 판들이 통계(관리자 화면)에도 쓰임. */
let currentRun = null, lastRunPromise = Promise.resolve(null);
function beginRun() {
    const r = { id: null };
    r.promise = rpc('start_run', { p_device: userData.deviceId, p_course: selectedTheme, p_mode: runEndless ? 'endless' : 'normal',
                                   p_car: CAR_DB[currentCarIndex].id, p_pet: userData.pet || '' })
        .then(id => (r.id = typeof id === 'string' ? id : null)).catch(() => null);   // 인터넷이 안 되면 null → 이 판은 랭킹에 못 올림
    currentRun = r;
}
// 판이 끝날 때 1번: 판 번호를 기다렸다가 끝난 시간을 보냄 (실패하면 모아뒀다 다음에)
function endRun(secs) {
    const r = currentRun; currentRun = null;
    if (!r) return (lastRunPromise = Promise.resolve(null));
    lastRunPromise = r.promise.then(id => {
        if (!id) return null;
        if (!Array.isArray(userData.pendingRuns)) userData.pendingRuns = [];
        userData.pendingRuns.push({ id, s: secs });
        if (userData.pendingRuns.length > 30) userData.pendingRuns = userData.pendingRuns.slice(-30);
        saveData(); flushRuns();
        return id;
    });
    return lastRunPromise;
}
const finishRun = (id, s) => rpc('finish_run', { p_device: userData.deviceId, p_run: id, p_seconds: Math.floor(s * 10) / 10 });
let runsFlushing = false;
async function flushRuns() {
    if (runsFlushing || !Array.isArray(userData.pendingRuns) || !userData.pendingRuns.length) return;
    runsFlushing = true;
    try {
        while (userData.pendingRuns.length) {
            const p = userData.pendingRuns[0];
            await finishRun(p.id, p.s);   // ok / too_fast / none / done 모두 더 보낼 필요 없음
            userData.pendingRuns.shift(); saveData();
        }
    } catch (e) { /* 인터넷이 안 되면 다음에 */ }
    finally { runsFlushing = false; }
}
// 기록 등록 전에 판이 끝났음을 확실히 (같은 값이면 여러 번 보내도 됨). 서버가 거절하면 rejected 오류
async function ensureFinished(run, s) {
    const f = await finishRun(run, s);
    if (f === 'too_fast' || f === 'none') { const e = new Error('rejected: ' + f); e.rejected = true; throw e; }
}

// 아깝게 놓친 TOP 10 등록 (p = { s: 초, run: 판 번호 })
async function submitTime(course, p) {
    if (!p || !p.run) { const e = new Error('no run'); e.rejected = true; throw e; }
    await ensureFinished(p.run, p.s);
    const r = await rpc('submit_time', { p_device: userData.deviceId, p_run: p.run, p_nickname: userData.nickname, p_tag: userData.tag });
    return (r && r[0]) || null;
}
// ---- 개발자용 플레이 기록: 한 판 끝날 때마다 plays 테이블에 한 줄 (실패하면 최대 20판까지 모아뒀다 다음에 전송) ----
let playsFlushing = false;
function logPlay(isWin, seconds) {
    if (!Array.isArray(userData.pendingPlays)) userData.pendingPlays = [];
    userData.pendingPlays.push({ c: selectedTheme, car: CAR_DB[currentCarIndex].id, pet: userData.pet || null, s: Math.floor(seconds * 10) / 10, w: !!isWin, at: Date.now() });
    if (userData.pendingPlays.length > 20) userData.pendingPlays = userData.pendingPlays.slice(-20);
    saveData();
    flushPlays();
}
async function flushPlays() {
    if (playsFlushing || !Array.isArray(userData.pendingPlays) || !userData.pendingPlays.length) return;
    playsFlushing = true;
    try {
        while (userData.pendingPlays.length) {
            const p = userData.pendingPlays[0];
            await rpc('log_play', { p_device: userData.deviceId, p_nickname: userData.nickname || null, p_tag: userData.tag || null, p_course: p.c, p_car: p.car, p_pet: p.pet,
                p_seconds: p.s, p_cleared: p.w, p_played_at: new Date(p.at).toISOString(), p_version: DATA_VERSION });
            userData.pendingPlays.shift(); saveData();
        }
    } catch (e) { /* 인터넷이 안 되거나 서버 준비 전: 다음 판에 다시 시도 */ }
    finally { playsFlushing = false; }
}

// 인터넷이 안 될 때 못 올린 기록은 다음에 다시 시도
async function flushPending() {
    if (!userData.nickname) return;
    for (const [course, p] of Object.entries(userData.pending || {})) {
        if (!p || typeof p !== 'object' || !p.run) { delete userData.pending[course]; saveData(); continue; }   // 예전 형식(판 번호 없음)은 올릴 수 없음
        try { await submitTime(course, p); delete userData.pending[course]; saveData(); }
        catch (e) { if (e.rejected) { delete userData.pending[course]; saveData(); continue; } return; }
    }
}

// ---- 화면 조각 ----
function topListHtml(rows, myBest) {
    if (!rows || rows.length === 0) return '<p class="text-gray-400 text-sm py-2 text-center">아직 기록이 없어요. 첫 기록의 주인공이 되어보세요!</p>';
    return '<ol class="space-y-1">' + rows.map((r, i) => {
        const me = r.nickname === userData.nickname && r.tag === userData.tag;
        const medal = `<span class="inline-block w-5 text-center text-gray-400 font-mono">${i + 1}</span>`;   // 클리어 못 한 기록이라 메달 없음
        return `<li class="flex items-center justify-between gap-2 px-2 py-1 rounded ${me ? 'bg-emerald-900 bg-opacity-60 text-emerald-200 font-bold' : 'text-gray-200'}">
            <span class="flex items-center gap-2 min-w-0"><span class="shrink-0">${medal}</span><span class="truncate">${esc(r.nickname)}<span class="text-gray-500 text-xs">#${esc(r.tag)}</span></span></span>
            <span class="font-mono shrink-0">${fmtTime(r.seconds)}</span></li>`;
    }).join('') + '</ol>';
}
function myRankHtml(mr) {
    if (!mr || mr.best == null) return '<p class="text-xs text-gray-400 mt-2 text-center">아직 이 코스에 등록된 내 기록이 없어요.</p>';
    return `<p class="text-sm text-center mt-2 text-gray-300">내 순위 <b class="text-yellow-300">${mr.my_rank}위</b> / ${mr.total}명 · 최고 ${fmtTime(mr.best)}</p>`;
}
function fameListHtml(rows) {
    if (!rows || rows.length === 0) return '<p class="text-gray-400 text-sm py-2 text-center">아직 60초를 버틴 사람이 없어요.</p>';
    return '<ol class="space-y-1">' + rows.map((r, i) => {
        const me = r.nickname === userData.nickname && r.tag === userData.tag;
        // 한 줄: 순위 · 차량 색 점 · 이름 · 날짜 · 기록
        return `<li class="flex items-center gap-2 px-2 py-1.5 rounded ${me ? 'bg-yellow-900 bg-opacity-50 text-yellow-200' : 'text-gray-200'}">
            <span class="shrink-0 text-yellow-400 font-mono text-xs w-8 text-center">${i + 1}</span>
            ${carDotHtml(r.car)}
            <span class="truncate min-w-0 flex-1 ${me ? 'font-bold' : ''}">${esc(r.fame_name)}</span>
            <span class="font-mono text-xs text-gray-500 shrink-0">${fmtShortDateTime(r.endless_at || r.cleared_at)}</span>
            <span class="font-mono font-bold text-yellow-300 shrink-0">${fmtTime(r.endless_best != null ? r.endless_best : 60)}</span></li>`;
    }).join('') + '</ol>';
}
const errorHtml = '<p class="text-red-300 text-sm py-2 text-center">랭킹을 불러올 수 없어요.<br><span class="text-xs text-gray-400">인터넷 연결을 확인해 주세요.</span></p>';
const loadingHtml = '<p class="text-gray-400 text-sm py-2 text-center">불러오는 중…</p>';

// ---- 결과 화면 온라인 영역 ----
let resultToken = 0;
// 늦게 도착한 응답이 이미 바뀐 화면에 쓰지 않도록 (다시 시도를 빨리 누른 경우 등)
function setHtml(id, html, token) {
    if (token !== resultToken) return;
    const el = document.getElementById(id); if (el) el.innerHTML = html;
}
async function renderResultOnline(isWin, seconds, justRegistered) {
    const token = ++resultToken;
    const box = document.getElementById('onlinePanel');
    const course = selectedTheme, cname = COURSE_NAMES[course];
    if (isWin) {
        if (userData.fameDone[course]) {
            box.innerHTML = `<h3 class="text-yellow-300 text-sm font-bold mb-2"><svg class="ic gold" aria-hidden="true"><use href="#i-crown"/></svg> ${cname} 명예의 전당</h3><p id="fameNote" class="text-xs text-gray-300 mb-2 text-center">${justRegistered === 'ok' ? '등록 완료! 명예의 전당에 이름이 올라갔어요.' : '이미 명예의 전당에 이름이 올라가 있어요.'}</p><div id="fameMini" class="max-h-40 overflow-y-auto">${loadingHtml}</div>`;
            try {
                const rows = await fetchFame(course);
                setHtml('fameMini', fameListHtml(rows), token);
                const idx = rows.findIndex(r => r.nickname === userData.nickname && r.tag === userData.tag);
                if (idx >= 0) setHtml('fameNote', (justRegistered === 'ok' ? '등록 완료! ' : '') + `명예의 전당 <b class="text-yellow-300">${idx + 1}위</b> · <svg class="ic" aria-hidden="true"><use href="#i-infinity"/></svg> 무한모드가 열렸어요!`, token);
            } catch (e) { setHtml('fameMini', errorHtml, token); }
        } else {
            box.innerHTML = `<h3 class="text-yellow-300 text-sm font-bold mb-1"><svg class="ic gold" aria-hidden="true"><use href="#i-crown"/></svg> ${cname} 명예의 전당 등록</h3>
                <p class="text-xs text-gray-300 mb-2">60초를 버텼어요! 명예의 전당에 남길 이름을 적어주세요. (코스당 1번)</p>
                <div class="flex gap-2"><input id="fameName" maxlength="10" placeholder="이름 (2~10자)" class="flex-1 min-w-0 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:border-yellow-400" value="${esc(userData.nickname || '')}">
                <button id="fameBtn" onclick="submitFame()" class="px-4 py-2 rounded-lg bg-yellow-500 text-black font-black text-sm">등록</button></div>
                <p id="fameMsg" class="text-xs mt-1 h-4 text-red-300"></p>`;
        }
        return;
    }
    // 게임 오버: 버틴 시간 등록 → 순위 표시
    box.innerHTML = `<h3 class="text-white text-sm font-bold mb-2">😭 ${cname} 아깝게 놓친 TOP 10 <span class="text-xs text-gray-400 font-normal">60초 직전까지 버틴 기록</span></h3><div id="topMini">${loadingHtml}</div><div id="rankMini"></div>`;
    let mr = null, offline = false;
    try {
        const runId = seconds >= 0.1 ? await lastRunPromise : null;
        if (runId) {
            const prev = userData.pending[course];
            if (!prev || typeof prev !== 'object' || !(prev.s >= seconds)) userData.pending[course] = { s: seconds, run: runId };
            saveData();
            try { mr = await submitTime(course, userData.pending[course]); delete userData.pending[course]; saveData(); }
            catch (e) { if (!e.rejected) throw e; delete userData.pending[course]; saveData(); mr = await fetchMyRank(course); }
        } else { offline = seconds >= 0.1; mr = await fetchMyRank(course); }
        const rows = await fetchTop(course);
        setHtml('topMini', topListHtml(rows), token);
        setHtml('rankMini', myRankHtml(mr) + (offline ? '<p class="text-xs text-gray-500 text-center mt-1">인터넷이 끊긴 채로 시작한 판이라 이번 기록은 랭킹에 올리지 못했어요.</p>' : ''), token);
    } catch (e) {
        setHtml('topMini', errorHtml, token);
    }
}
async function submitFame() {
    const input = document.getElementById('fameName'), msg = document.getElementById('fameMsg'), btn = document.getElementById('fameBtn');
    const c = checkName(input.value);
    if (!c.ok) { msg.textContent = c.msg; return; }
    btn.disabled = true; btn.textContent = '등록 중'; msg.textContent = '';
    try {
        await lastRunPromise;
        const fr = userData.fameRun && userData.fameRun[selectedTheme];   // 이 코스에서 60초 이상 버틴 판
        if (!fr || !fr.run) {
            btn.disabled = false; btn.textContent = '등록';
            msg.textContent = '인터넷이 끊긴 채로 시작한 판이라 등록할 수 없어요. 다음에 60초를 버티면 등록돼요.';
            return;
        }
        try { await ensureFinished(fr.run, fr.s); }
        catch (e) { if (e.rejected) { delete userData.fameRun[selectedTheme]; saveData(); btn.disabled = false; btn.textContent = '등록'; msg.textContent = '이 판은 확인되지 않아 등록할 수 없어요.'; return; } throw e; }
        const r = await rpc('register_fame', { p_device: userData.deviceId, p_run: fr.run, p_fame_name: c.name, p_nickname: userData.nickname, p_tag: userData.tag });
        userData.fameDone[selectedTheme] = true;
        if (r !== 'exists') userData.fameNames[selectedTheme] = c.name;
        saveData();
        showToast(r === 'exists' ? '이미 명예의 전당에 등록되어 있어요' : `👑 명예의 전당에 "${c.name}" 등록 완료!`);
        if (lastEndless) renderEndlessOnline(lastEndless.secs, lastEndless.isRecord);   // 무한모드 기록이 있으면 이어서 올림
        else renderResultOnline(true, 60, r);
    } catch (e) {
        if (!document.body.contains(btn)) return;
        btn.disabled = false; btn.textContent = '등록';
        msg.textContent = '등록하지 못했어요. 인터넷 연결을 확인하고 다시 눌러주세요.';
    }
}

// ---- 무한모드 기록 (명예의 전당의 내 기록을 더 좋을 때만 교체) ----
let lastEndless = null;   // 방금 끝난 무한모드 판 { secs, isRecord } (일반 모드 판이면 null)
async function submitEndless(course, p) {
    await ensureFinished(p.run, p.s);
    return rpc('submit_endless', { p_device: userData.deviceId, p_run: p.run });
}
// 못 올린 무한 기록 다시 보내기 (명예의 전당에 이름을 올린 코스만)
async function flushEndless() {
    for (const [course, p] of Object.entries(userData.endlessPending || {})) {
        if (!p || !(p.s >= 60) || !p.run) { delete userData.endlessPending[course]; saveData(); continue; }   // 판 번호 없는 기록은 올릴 수 없음
        if (!userData.fameDone[course]) continue;
        try { await submitEndless(course, p); }
        catch (e) { if (e.rejected) { delete userData.endlessPending[course]; saveData(); continue; } throw e; }
        delete userData.endlessPending[course]; saveData();
    }
}
async function renderEndlessOnline(secs, isRecord) {
    const token = ++resultToken;
    const box = document.getElementById('onlinePanel');
    const course = selectedTheme, cname = COURSE_NAMES[course];
    const head = `<h3 class="text-yellow-300 text-sm font-bold mb-2"><svg class="ic" aria-hidden="true"><use href="#i-infinity"/></svg> ${cname} 무한모드 · 명예의 전당</h3>`;
    if (secs < 60) {
        box.innerHTML = head + `<p class="text-xs text-gray-300 text-center">60초를 넘겨야 무한모드 기록이 남아요.<br><span class="text-gray-400">지각 시계가 돌기 시작하면 그때부터 기록이에요!</span></p>`;
        return;
    }
    if (!userData.fameDone[course]) { renderResultOnline(true, 60); return; }   // 명예의 전당 이름부터 (등록하면 이 기록도 함께 올라감)
    box.innerHTML = head + `<p id="endlessNote" class="text-xs text-gray-300 mb-2 text-center">기록을 올리는 중…</p><div id="endlessRename"></div><div id="fameMini" class="max-h-40 overflow-y-auto">${loadingHtml}</div>`;
    try {
        const runId = await lastRunPromise;
        await flushEndless();
        const rows = await fetchFame(course);
        setHtml('fameMini', fameListHtml(rows), token);
        const idx = rows.findIndex(r => r.nickname === userData.nickname && r.tag === userData.tag);
        const mine = idx >= 0 ? rows[idx] : null;
        if (mine && mine.fame_name) { userData.fameNames[course] = mine.fame_name; saveData(); }
        if (isRecord && !runId) {   // 인터넷이 끊긴 채로 시작한 판: 내 기기에는 기록되지만 명예의 전당엔 못 올림
            setHtml('endlessNote', `🎉 내 무한 기록 <b class="text-yellow-300">${fmtTime(secs)}</b><br><span class="text-gray-500">인터넷이 끊긴 채로 시작한 판이라 명예의 전당엔 올리지 못했어요.</span>`, token);
            return;
        }
        setHtml('endlessNote', isRecord
            ? `🎉 무한 기록 갱신! <b class="text-yellow-300">${fmtTime(secs)}</b>` + (mine ? ` · 명예의 전당 <b class="text-yellow-300">${idx + 1}위</b>` : '')
            : `내 무한 기록 <b class="text-yellow-300">${fmtTime(mine ? mine.endless_best : userData.endlessBest[course])}</b>` + (mine ? ` · ${idx + 1}위` : ''), token);
        if (isRecord && mine) setHtml('endlessRename', `<p class="text-xs text-gray-400 mb-1">기록을 세웠으니 명예의 전당 이름을 바꿀 수 있어요 (선택)</p>
            <div class="flex gap-2 mb-1"><input id="renameFameInput" maxlength="10" class="flex-1 min-w-0 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:border-yellow-400" value="${esc(mine.fame_name)}">
            <button id="renameFameBtn" onclick="renameFame()" class="px-4 py-2 rounded-lg bg-yellow-500 text-black font-black text-sm">변경</button></div>
            <p id="renameFameMsg" class="text-xs mb-2 h-4 text-red-300"></p>`, token);
    } catch (e) {
        setHtml('endlessNote', '기록을 올리지 못했어요. 다음 판에 다시 올려볼게요.', token);
        setHtml('fameMini', errorHtml, token);
    }
}
async function renameFame() {
    const input = document.getElementById('renameFameInput'), msg = document.getElementById('renameFameMsg'), btn = document.getElementById('renameFameBtn');
    const c = checkName(input.value);
    if (!c.ok) { msg.textContent = c.msg; return; }
    btn.disabled = true; btn.textContent = '변경 중'; msg.textContent = '';
    try {
        const r = await rpc('rename_fame', { p_device: userData.deviceId, p_course: selectedTheme, p_fame_name: c.name });
        if (r === 'ok') {
            userData.fameNames[selectedTheme] = c.name; saveData();
            showToast(`👑 명예의 전당 이름을 "${c.name}"(으)로 바꿨어요`);
            const rows = await fetchFame(selectedTheme);
            const el = document.getElementById('fameMini'); if (el) el.innerHTML = fameListHtml(rows);
            btn.textContent = '완료';
        } else {
            btn.disabled = false; btn.textContent = '변경';
            msg.textContent = '기록을 세운 직후(30분 안)에만 바꿀 수 있어요.';
        }
    } catch (e) {
        if (!document.body.contains(btn)) return;
        btn.disabled = false; btn.textContent = '변경';
        msg.textContent = '바꾸지 못했어요. 인터넷 연결을 확인하고 다시 눌러주세요.';
    }
}

// ---- 전체 랭킹 창 (로비·결과 화면에서) ----
let rankCourse = 'morning';
function openRanking(course) {
    rankCourse = course || selectedTheme;
    document.getElementById('rankModal').classList.remove('hidden');
    loadRankingTab();
}
function closeRanking() { document.getElementById('rankModal').classList.add('hidden'); }
async function loadRankingTab() {
    ['morning', 'evening', 'night'].forEach(c => {
        const b = document.getElementById('rtab-' + c);
        b.className = 'flex-1 py-2 rounded-lg text-sm font-bold ' + (c === rankCourse ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-300');
    });
    const course = rankCourse;
    const fameEl = document.getElementById('rankFame'), topEl = document.getElementById('rankTop'), meEl = document.getElementById('rankMe');
    fameEl.innerHTML = topEl.innerHTML = loadingHtml; meEl.innerHTML = '';
    const [fame, top, me] = await Promise.allSettled([fetchFame(course), fetchTop(course), fetchMyRank(course)]);
    if (course !== rankCourse) return; // 탭을 바꾼 사이 도착한 응답은 버림
    fameEl.innerHTML = fame.status === 'fulfilled' ? fameListHtml(fame.value) : errorHtml;
    topEl.innerHTML = top.status === 'fulfilled' ? topListHtml(top.value) : errorHtml;
    meEl.innerHTML = me.status === 'fulfilled' ? myRankHtml(me.value) : '';
    const cnt = fame.status === 'fulfilled' ? fame.value.length : null;
    document.getElementById('rankFameCount').textContent = cnt == null ? '' : `${cnt}명`;
}

// ---- 닉네임 ----
function openNickname(first) {
    const m = document.getElementById('nickModal');
    document.getElementById('nickInput').value = userData.nickname || '';
    document.getElementById('nickMsg').textContent = '';
    document.getElementById('nickTitle').textContent = first ? '닉네임을 정해주세요' : '닉네임 변경';
    document.getElementById('nickCancel').classList.toggle('hidden', !!first);
    m.classList.remove('hidden');
    setTimeout(() => document.getElementById('nickInput').focus(), 50);
}
function saveNickname() {
    const c = checkName(document.getElementById('nickInput').value);
    if (!c.ok) { document.getElementById('nickMsg').textContent = c.msg; return; }
    const changed = userData.nickname && userData.nickname !== c.name;
    userData.nickname = c.name; saveData();
    document.getElementById('nickModal').classList.add('hidden');
    showToast(`반가워요, ${c.name}#${userData.tag} 님!`);
    if (changed) rpc('rename_player', { p_device: userData.deviceId, p_nickname: c.name, p_tag: userData.tag }).catch(() => {});
    flushPending();
}
function updateNickUI() {
    const el = document.getElementById('nickLabel');
    if (el) el.innerHTML = userData.nickname ? `${esc(userData.nickname)}<span class="text-gray-400 text-xs">#${userData.tag}</span>` : '닉네임 설정';
}


function showToast(msg) {
    const toast = document.getElementById('toastMsg');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

