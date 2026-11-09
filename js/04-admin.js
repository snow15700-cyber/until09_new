/* 04-admin.js — 관리자 통계 (비밀 입구)
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   관리자 통계 (비밀 입구: 로비 제목을 3초 안에 7번 누르기 → 관리자 비밀번호)
   비밀번호는 서버(admin_config)에만 있고, 통계도 서버가 비밀번호를 확인한 뒤에만 돌려줌
   ========================================== */
let adminDays = 7;
(function setupAdminEntry() {
    const title = document.getElementById('lobbyTitle');
    if (!title) return;
    title.style.pointerEvents = 'auto';
    let taps = [];
    title.addEventListener('click', () => {
        const now = performance.now();
        taps = taps.filter(t => now - t < 3000); taps.push(now);
        if (taps.length >= 7) { taps = []; openAdmin(); }
    });
})();
function adminEl() {
    let m = document.getElementById('adminModal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'adminModal'; m.className = 'admin-modal hidden';
    m.innerHTML = `<div class="admin-box" role="dialog" aria-label="관리자 통계">
        <div class="admin-head"><b>📊 관리자 통계</b><button type="button" onclick="closeAdmin()" aria-label="닫기">✕</button></div>
        <div id="adminBody"></div></div>`;
    (document.getElementById('game-container') || document.body).appendChild(m);
    return m;
}
function openAdmin() {
    adminEl().classList.remove('hidden');
    let key = ''; try { key = sessionStorage.getItem('adminKey') || ''; } catch (e) {}
    if (key) loadAdmin(key); else adminLogin('');
}
function closeAdmin() { const m = document.getElementById('adminModal'); if (m) m.classList.add('hidden'); }
function adminLogin(err) {
    document.getElementById('adminBody').innerHTML = `<p class="admin-note">관리자 비밀번호를 입력하세요.</p>
        <div class="admin-login"><input id="adminKey" type="password" autocomplete="off" placeholder="비밀번호"><button type="button" onclick="adminSubmit()">확인</button></div>
        <p class="admin-err">${esc(err)}</p>`;
    const inp = document.getElementById('adminKey');
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') adminSubmit(); });
    setTimeout(() => inp.focus(), 50);
}
function adminSubmit() { const v = document.getElementById('adminKey').value.trim(); if (v) loadAdmin(v); }
function setAdminDays(d) { adminDays = d; let k = ''; try { k = sessionStorage.getItem('adminKey') || ''; } catch (e) {} if (k) loadAdmin(k); }
async function loadAdmin(key) {
    const body = document.getElementById('adminBody');
    body.innerHTML = '<p class="admin-note">불러오는 중…</p>';
    try {
        if (adminTab !== 'basic') {   // 🔎 조합 분석 · 👥 이용자 (admin-explore.js)
            try { await loadAdminExtra(key, body); }
            catch (e) {
                if (/HTTP 404/.test(String(e && e.message))) { body.innerHTML = adminTabsHtml() + '<p class="admin-err">서버에 stats_v2.sql을 아직 실행하지 않았어요. Supabase SQL Editor에서 실행한 뒤 다시 열어 주세요.</p>'; return; }
                throw e;
            }
            return;
        }
        const d = await rpc('admin_stats', { p_key: key, p_days: adminDays });
        try { sessionStorage.setItem('adminKey', key); } catch (e) {}
        body.innerHTML = adminHtml(d || {});
    } catch (e) {
        try { sessionStorage.removeItem('adminKey'); } catch (er) {}
        adminLogin(/HTTP 4/.test(String(e && e.message)) ? '비밀번호가 틀렸어요.' : '불러오지 못했어요. 인터넷 연결이나 서버 설정(anticheat_stats.sql)을 확인해 주세요.');
    }
}
function adminHtml(d) {
    const n = v => (v == null ? '-' : Number(v).toLocaleString('ko-KR'));
    const sec = v => (v == null ? '-' : Number(v).toFixed(1) + 's');
    const pct = (a, b) => (b ? Math.round(a / b * 1000) / 10 : 0);
    const carName = id => { const c = CAR_DB.find(x => x.id === id); return c ? c.name : (id || '(없음)'); };
    const petName = id => { const p = PET_INFO.find(x => x.id === id); return p ? p.species : '안 태움'; };
    const s = d.summary || {};
    let h = adminTabsHtml() + adminPeriodHtml();
    h += `<div class="admin-cards">
        <div><b>${n(s.runs)}</b><span>끝까지 한 판</span></div><div><b>${n(s.players)}</b><span>이용자(기기)</span></div>
        <div><b>${n(s.runs_today)}</b><span>오늘 판</span></div><div><b>${n(s.players_today)}</b><span>오늘 이용자</span></div></div>
        <p class="admin-note">중간에 나간 판(기록 안 끝남): ${n(s.unfinished)}판</p>`;
    // 코스별
    const cs = d.courses || [];
    const row = (c) => {
        const rate = pct(c.cleared, c.runs);
        const tag = c.mode === 'normal' && c.runs >= 20 ? (rate < 5 ? '<i class="hard">어려움?</i>' : rate > 60 ? '<i class="easy">쉬움?</i>' : '') : '';
        return `<tr><td>${COURSE_NAMES[c.course] || esc(c.course)}${tag}</td><td>${n(c.runs)}</td><td>${n(c.players)}</td>` +
            (c.mode === 'normal' ? `<td><b>${rate}%</b></td>` : '') + `<td>${sec(c.avg_sec)}</td><td>${sec(c.median_sec)}</td>` + (c.mode === 'endless' ? `<td>${sec(c.max_sec)}</td>` : '') + `</tr>`;
    };
    const ord = c => ['morning', 'evening', 'night'].indexOf(c.course);   // 출근 → 퇴근 → 소풍
    const nm = cs.filter(c => c.mode === 'normal').sort((x, y) => ord(x) - ord(y)), en = cs.filter(c => c.mode === 'endless').sort((x, y) => ord(x) - ord(y));
    h += `<h4>🏁 코스별 클리어율 (일반 모드)</h4>` + (nm.length ? `<table><tr><th>코스</th><th>판</th><th>명</th><th>클리어</th><th>평균</th><th>중앙값</th></tr>${nm.map(row).join('')}</table>` : '<p class="admin-note">아직 기록이 없어요.</p>');
    if (en.length) h += `<h4>♾️ 무한모드</h4><table><tr><th>코스</th><th>판</th><th>명</th><th>평균</th><th>중앙값</th><th>최고</th></tr>${en.map(row).join('')}</table>`;
    // 죽는 구간
    const deaths = d.deaths || [];
    h += `<h4>💥 가장 많이 죽는 구간 (일반 모드, 5초 단위)</h4>`;
    ['morning', 'evening', 'night'].forEach(k => {
        const b = Array(12).fill(0); deaths.filter(x => x.course === k).forEach(x => { b[x.bucket] = x.n; });
        const max = Math.max(...b), tot = b.reduce((a, v) => a + v, 0);
        if (!tot) return;
        const peak = b.indexOf(max);
        h += `<p class="admin-sub">${COURSE_NAMES[k]} · 가장 많이 죽는 때 <b>${peak * 5}~${peak * 5 + 5}초</b> (${pct(max, tot)}%)</p><div class="admin-bars">` +
            b.map((v, i) => `<div class="bar ${i === peak ? 'peak' : ''}" title="${i * 5}~${i * 5 + 5}초: ${v}판"><span style="height:${max ? Math.max(2, v / max * 100) : 0}%"></span><em>${i * 5}</em></div>`).join('') + `</div>`;
    });
    if (!deaths.length) h += '<p class="admin-note">아직 기록이 없어요.</p>';
    // 차량별
    const cars = d.cars || [];
    if (cars.length) {
        const cc = d.car_course || [];
        const cell = (car, k) => { const x = cc.find(y => y.car === car && y.course === k); return x ? sec(x.avg_sec) : '-'; };
        h += `<h4>🚗 차량별 평균 생존 (일반 모드)</h4><table><tr><th>차량</th><th>판</th><th>평균</th><th>클리어</th><th>출근</th><th>퇴근</th><th>소풍</th></tr>` +
            cars.map(c => `<tr><td>${esc(carName(c.car))}</td><td>${n(c.runs)}</td><td><b>${sec(c.avg_sec)}</b></td><td>${pct(c.cleared, c.runs)}%</td><td>${cell(c.car, 'morning')}</td><td>${cell(c.car, 'evening')}</td><td>${cell(c.car, 'night')}</td></tr>`).join('') + `</table>`;
    }
    // 반려동물
    const pets = d.pets || [];
    if (pets.length) {
        const tot = pets.reduce((a, p) => a + p.runs, 0);
        h += `<h4>🐾 함께 달린 반려동물</h4><table><tr><th>반려동물</th><th>판</th><th>비율</th></tr>` + pets.map(p => `<tr><td>${esc(petName(p.pet))}</td><td>${n(p.runs)}</td><td>${pct(p.runs, tot)}%</td></tr>`).join('') + `</table>`;
    }
    // 최근 14일
    const daily = d.daily || [];
    if (daily.length) {
        const max = Math.max(...daily.map(x => x.runs));
        h += `<h4>📅 최근 14일</h4><div class="admin-days">` + daily.map(x => `<div><em>${String(x.day).slice(5).replace('-', '.')}</em><span class="bar"><span style="width:${max ? x.runs / max * 100 : 0}%"></span></span><b>${n(x.runs)}판 · ${n(x.players)}명</b></div>`).join('') + `</div>`;
    }
    const sus = d.suspicious || [];
    if (sus.length) h += `<h4>⚠️ 하루 150판 넘게 시작한 기기</h4>` + sus.map(x => `<p class="admin-note">${esc(String(x.device_id).slice(0, 8))}… · ${n(x.n)}판</p>`).join('');
    return h;
}

function selectCar(i) {
    if (!userData.ownedCars.includes(CAR_DB[i].id)) return;   // 잠긴 차량은 선택·미리보기 불가
    currentCarIndex = i; updateLobbyUI(); lobbyCut(0);
}
function selectPet(id) {
    if (!userData.pets.includes(id)) return;                   // 입양 전 반려동물은 선택·미리보기 불가
    if (userData.pet === id) {                                 // 함께 달리는 반려동물을 한 번 더 누르면 내리기
        hidePetBubble(); userData.pet = null; saveData(); lobbyCut(0);
        showToast('반려동물 없이 달려요'); return;
    }
    userData.pet = id; saveData(); lobbyCut(1, true);
    setTimeout(() => petSay('hello', true), 500);
}
function prevCar() {}
function nextCar() {}
let pendingTheme = null;
function selectTheme(theme) {
    if (theme === (pendingTheme || selectedTheme)) return;
    prepareTrack(theme);
    const first = !pendingTheme;
    pendingTheme = theme;
    if (first) lobbyFade(() => {
        const t = pendingTheme; pendingTheme = null;
        if (gameState !== 'LOBBY') return;   // 그 사이 출발했으면 코스를 바꾸지 않음 (달리는 중에 코스가 바뀌던 문제)
        selectedTheme = t; defaultEndless(true); applyTheme(); updateLobbyUI();
    });   // 페이드 중 바꾸면 마지막 선택으로
}
function lobbyFade(fn) {
    const f = document.getElementById('lobbyFade');
    f.classList.add('on');
    setTimeout(() => { fn(); f.classList.remove('on'); }, 280);
}

// ---- 반려동물 입양 ----
let adoptArm = null, adoptArmTimer = null, adoptingId = null;
// 함께한 시간 표기: 59초 / 12분 5초 / 1시간 12분 5초 (0인 단위는 생략: 3분 / 1시간 5초)
function fmtPetTime(sec) {
    sec = Math.floor(sec || 0);
    if (sec < 60) return sec + '초';
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return [h ? h + '시간' : '', m ? m + '분' : '', s ? s + '초' : ''].filter(Boolean).join(' ');
}
// 받침에 따라 '와/과'
function josaWa(name) {
    const c = name.charCodeAt(name.length - 1);
    if (c < 0xAC00 || c > 0xD7A3) return name + '와(과)';
    return name + ((c - 0xAC00) % 28 ? '과' : '와');
}
function petDisplayName(id) { const p = PET_INFO.find(x => x.id === id); return (userData.petNames && userData.petNames[id]) || (p ? p.species : ''); }
function adoptPet(id) {
    const p = PET_INFO.find(x => x.id === id);
    if (!p || userData.pets.includes(id)) return;
    const price = p.met() ? p.price : p.direct;
    if (userData.credits < price) { showToast(`크레딧이 부족해요! (${price}C 필요)`); return; }
    if (adoptArm !== id) {                 // 실수로 누르지 않도록 한 번 더 확인
        adoptArm = id; clearTimeout(adoptArmTimer);
        adoptArmTimer = setTimeout(() => { adoptArm = null; renderLobbyPanel(); }, 3000);
        renderLobbyPanel(); return;
    }
    adoptArm = null; clearTimeout(adoptArmTimer);
    userData.credits -= price;
    userData.pets.push(id); userData.pet = id;
    saveData();
    adoptingId = id; renamingPet = false;
    document.getElementById('adoptTitle').textContent = `🎉 ${p.species} 입양 완료!`;
    document.getElementById('adoptText').textContent = '오늘부터 함께 달릴 친구예요. 이름을 지어 주세요.';
    document.getElementById('adoptOk').textContent = '이 이름으로 할래요';
    document.getElementById('adoptCancel').classList.add('hidden');   // 입양 땐 꼭 이름을 지음
    const inp = document.getElementById('adoptName'); inp.value = p.species;
    document.getElementById('adoptErr').textContent = '';
    document.getElementById('adoptModal').classList.remove('hidden');
    lobbyCut(1, true);
    if (navigator.vibrate) try { navigator.vibrate([30, 30, 60]); } catch (e) {}
}
function confirmAdoptName() {
    const r = checkName(document.getElementById('adoptName').value);
    if (!r.ok) { document.getElementById('adoptErr').textContent = r.msg; return; }
    const id = adoptingId, wasRename = renamingPet;
    if (id) userData.petNames[id] = r.name;
    adoptingId = null; renamingPet = false;
    document.getElementById('adoptModal').classList.add('hidden');
    saveData(); updateLobbyUI();
    if (wasRename) {
        showToast(`🐾 이제부터 "${r.name}"!`);
        if (id === userData.pet) setTimeout(() => petSay('hello', true), 400);   // 태우고 있는 반려동물이면 인사
        return;
    }
    showToast(`🐾 ${josaWa(r.name)} 함께 달려요!`);
    setTimeout(() => petSay('hello', true), 600);
}
// ---- 보유 반려동물 이름 바꾸기 (✏️) : 입양 때 쓰는 이름 짓기 창을 그대로 사용 ----
let renamingPet = false, renameHintPet = null;
function renamePet(id) {
    if (!userData.pets.includes(id)) return;
    const p = PET_INFO.find(x => x.id === id);
    adoptingId = id; renamingPet = true;
    const h = document.getElementById('renameHint'); if (h) h.remove();
    document.getElementById('adoptTitle').textContent = `✏️ ${p.species} 이름 바꾸기`;
    document.getElementById('adoptText').textContent = '새 이름을 지어 주세요.';
    document.getElementById('adoptOk').textContent = '이 이름으로 바꿀래요';
    document.getElementById('adoptCancel').classList.remove('hidden');
    const inp = document.getElementById('adoptName'); inp.value = petDisplayName(id);
    document.getElementById('adoptErr').textContent = '';
    document.getElementById('adoptModal').classList.remove('hidden');
}
function closeAdoptModal() {
    if (!renamingPet) return;   // 입양 직후 이름 짓기는 닫을 수 없음
    adoptingId = null; renamingPet = false;
    document.getElementById('adoptModal').classList.add('hidden');
}
document.getElementById('adoptName').addEventListener('keydown', e => { if (e.key === 'Enter') confirmAdoptName(); });

// 정식 버전 가격
const GACHA_COST = 50;
const GACHA_REFUND = 20; // 중복 시 페이백 (비용의 40%)

// rollGacha()는 아래 '차량 뽑기 연출'에 있음


