/* 03-lobby-ui.js — 로비 화면 · 코스/차량/반려동물 탭 · 뽑기 버튼
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   2. 로비 UI 및 가챠 로직
   ========================================== */
let currentCarIndex = 0;
let selectedTheme = 'morning';

// 코스별 제목 · 시계 · 기다리는 사람
const COURSE_INFO = {
    morning: { title: '09시까지 출근하세요', who: '김부장이 기다려요', goal: '출근', startH: 8,  level: '쉬움', swatch: '#2563eb' },
    evening: { title: '18시까지 퇴근하세요', who: '와이프가 기다려요', goal: '퇴근', startH: 17, level: '중간', swatch: '#ea580c' },
    night:   { title: '12시까지 출국하세요', who: '우리 아이가 재촉해요', goal: '출국', startH: 11, level: '어려움', swatch: '#16a34a' }
};
let lobbyTab = 'course';
const hex6 = n => '#' + n.toString(16).padStart(6, '0');

function updateLobbyUI() {
    document.getElementById('lobbyCredit').textContent = userData.credits;
    updateNickUI();
    if (!userData.ownedCars.includes(CAR_DB[currentCarIndex].id)) currentCarIndex = 0;   // 잠긴 차는 고를 수 없음
    const car = CAR_DB[currentCarIndex], ci = COURSE_INFO[selectedTheme];
    if (endlessMode && !endlessUnlocked(selectedTheme)) endlessMode = false;   // 클리어 안 한 코스로 바꾸면 일반 모드로
    if (window.previewReady) updatePreviewCar();
    document.getElementById('lobbyTitle').textContent = ci.title;
    document.getElementById('lobbyWho').textContent = `${COURSE_NAMES[selectedTheme]} · ${ci.who}`;
    document.getElementById('lobbyGoSub').innerHTML = `${COURSE_NAMES[selectedTheme]} · ${endlessMode ? '<svg class="ic" aria-hidden="true"><use href="#i-infinity"/></svg> 무한모드' : '60초 버티기'}`;
    document.getElementById('lsub-course').innerHTML = COURSE_NAMES[selectedTheme] + (endlessMode ? ' <svg class="ic" aria-hidden="true"><use href="#i-infinity"/></svg>' : '');
    document.getElementById('lsub-car').textContent = car.name;
    document.getElementById('lsub-pet').textContent = userData.pet ? petDisplayName(userData.pet) : '없음';
    const pt = userData.pet ? (userData.petTime[userData.pet] || 0) : 0;
    document.getElementById('lobbyPetTime').textContent = !userData.pet ? ''
        : pt >= 1 ? `${PET_EMOJI[userData.pet]} ${josaWa(petDisplayName(userData.pet))} 함께한 시간 ${fmtPetTime(pt)}`
        : `${PET_EMOJI[userData.pet]} ${josaWa(petDisplayName(userData.pet))} 첫 주행을 기다리는 중`;
    document.getElementById('startBtn').disabled = !userData.ownedCars.includes(car.id);
    ['course', 'car', 'pet'].forEach(k => document.getElementById('ltab-' + k).classList.toggle('sel', k === lobbyTab));
    renderLobbyPanel();
    refreshLobbyCar();
}

function renderLobbyPanel() {
    const panel = document.getElementById('lobbyPanel');
    let html = '';
    if (lobbyTab === 'course') {
        html = '<div class="lb-grid three">' + ['morning', 'evening', 'night'].map(k => {
            const ci = COURSE_INFO[k], best = userData.best[k] || 0, eb = userData.endlessBest[k] || 0;
            const rec = best >= 60 ? (eb >= 60 ? `<svg class="ic" aria-hidden="true"><use href="#i-infinity"/></svg> ${eb.toFixed(1)}s` : '클리어 ✓') : best > 0 ? `최고 ${best.toFixed(1)}s` : '기록 없음';
            return `<button type="button" class="lb-card ${k === selectedTheme ? 'sel' : ''}" onclick="selectTheme('${k}')"><i class="sw" style="background:${ci.swatch}"></i><b>${COURSE_NAMES[k]}</b><span>${ci.level} · ${rec}</span></button>`;
        }).join('') + '</div>';
        // 모드 선택: 일반(60초) / 무한모드 (그 코스를 클리어해야 열림)
        const open = endlessUnlocked(selectedTheme), eb = userData.endlessBest[selectedTheme] || 0;
        html += `<div class="lb-mode" role="radiogroup" aria-label="모드">
            <button type="button" role="radio" aria-checked="${!endlessMode}" class="lb-modebtn ${!endlessMode ? 'sel' : ''}" onclick="setEndless(false)">일반 모드<small>60초 버티기</small></button>
            <button type="button" role="radio" aria-checked="${endlessMode}" class="lb-modebtn ${endlessMode ? 'sel endless' : ''} ${open ? '' : 'locked'}" onclick="setEndless(true)">${open ? '<svg class="ic" aria-hidden="true"><use href="#i-infinity"/></svg> 무한모드' : '<svg class="ic" aria-hidden="true"><use href="#i-lock"/></svg> 무한모드'}<small>${open ? (eb >= 60 ? `내 기록 ${eb.toFixed(1)}s` : '지각해도 계속 달려요') : `${COURSE_NAMES[selectedTheme]} 클리어하면 열려요`}</small></button>
        </div>`;
    } else if (lobbyTab === 'car') {
        html = '<div class="lb-grid">' + CAR_DB.map((c, i) => {
            const own = userData.ownedCars.includes(c.id);
            if (!own) return `<div class="lb-card locked" aria-disabled="true"><i class="sw" style="background:${hex6(c.color)}"></i><b><svg class="ic" aria-hidden="true"><use href="#i-lock"/></svg> ${esc(c.name)}</b><span>뽑기로 얻을 수 있어요</span></div>`;
            return `<button type="button" class="lb-card ${i === currentCarIndex ? 'sel' : ''}" onclick="selectCar(${i})"><i class="sw" style="background:${hex6(c.color)}"></i><b>${esc(c.name)}</b><span>${esc(c.desc)}</span></button>`;
        }).join('') + `<button type="button" class="lb-gacha" onclick="rollGacha()"><svg class="ic" aria-hidden="true"><use href="#i-dices"/></svg> 차량 뽑기 (<span id="gachaCostLabel">${GACHA_COST}</span> C)</button>` +
            `<p class="lb-note">보유 차량 ${userData.ownedCars.length}/${CAR_DB.length} · 중복이면 ${GACHA_REFUND}C 환급</p></div>`;
    } else {
        html = '<div class="lb-grid">' + PET_INFO.map(p => {
            const own = userData.pets.includes(p.id), dot = hex6(PetKit.cushionOf(p.id));
            if (own) {
                const sel = userData.pet === p.id;
                // 처음 반려동물 탭을 열면 한 번만: ✏️ 옆에 "이름을 지어줄 수 있어요" 말풍선
                const hint = p.id === renameHintPet;
                return `<div class="lb-petwrap"><button type="button" class="lb-card ${sel ? 'sel' : ''}" onclick="selectPet('${p.id}')"><i class="sw" style="background:${dot}"></i>${sel ? '<span class="tag">탑승 중</span>' : ''}<b>${esc(petDisplayName(p.id))}</b><span>${sel ? '한 번 더 누르면 내려요' : p.species + ' · ' + p.persona}</span><span class="ptime">⏱ 함께한 시간 ${fmtPetTime(userData.petTime[p.id])}</span></button>` +
                    `<button type="button" class="lb-pen" onclick="renamePet('${p.id}')" aria-label="${esc(petDisplayName(p.id))} 이름 바꾸기"><svg class="ic" aria-hidden="true"><use href="#i-pencil"/></svg></button>` +
                    (hint ? `<span class="lb-penhint" id="renameHint">이름을 지어줄 수 있어요!</span>` : '') + `</div>`;
            }
            const met = p.met(), price = met ? p.price : p.direct, armed = adoptArm === p.id;
            const label = armed ? `한 번 더 누르면 입양 (${price}C)` : met ? `입양하기 · ${price}C` : `바로 입양 · ${price}C`;
            return `<div class="lb-card locked"><i class="sw" style="background:${dot}"></i><b><svg class="ic" aria-hidden="true"><use href="#i-lock"/></svg> ${p.species}</b>` +
                `<span class="prog ${met ? 'ok' : ''}">${met ? '🎯 조건 달성! 할인가로 입양' : p.cond + ' · ' + p.progress()}</span>` +
                `<button type="button" class="lb-adopt ${armed ? 'arm' : met ? 'deal' : ''}" onclick="adoptPet('${p.id}')">${label}</button></div>`;
        }).join('') + `<p class="lb-note">${userData.pet ? '조건을 달성하면 할인된 가격으로 입양할 수 있어요' : '지금은 반려동물 없이 달려요 · 카드를 누르면 태울 수 있어요'}</p></div>`;
    }
    panel.innerHTML = html;
}

// ---- 무한모드 (코스를 클리어한 사람만) ----
let endlessMode = false;
const endlessUnlocked = k => (userData.best[k] || 0) >= 60;
// 클리어한 코스는 무한모드가 기본값
//  force: 접속할 때 · 코스를 바꿀 때 → 클리어했으면 무한모드로
//  아니면(결과 화면 → 로비): 이 코스를 방금 처음 클리어했을 때만 무한모드로 바꾸고, 직접 고른 모드는 유지
const endlessAuto = {};
function defaultEndless(force) {
    const k = selectedTheme;
    if (!endlessUnlocked(k)) { endlessMode = false; return; }
    if (force || !endlessAuto[k]) endlessMode = true;
    endlessAuto[k] = true;
}
function setEndless(v) {
    if (v && !endlessUnlocked(selectedTheme)) { showToast(`🔒 ${COURSE_NAMES[selectedTheme]}을 60초 클리어하면 열려요`); return; }
    if (endlessMode === v) return;
    endlessMode = v; updateLobbyUI();
    if (v) showToast('♾️ 무한모드: 09시가 지나도 계속 달려요');
}

function setLobbyTab(k) {
    lobbyTab = k;
    // 반려동물 탭을 처음 열 때 한 번만 ✏️ 안내 (기본 웰시코기 — 이름을 지을 기회가 없었으니)
    if (k === 'pet' && !userData.renameHintSeen && userData.pets.length) {
        const target = userData.pets.includes('corgi') ? 'corgi' : userData.pets[0];
        renameHintPet = target; userData.renameHintSeen = true;
        try { localStorage.setItem('racingGameData', JSON.stringify(userData)); } catch (e) {}
        setTimeout(() => {
            const h = document.getElementById('renameHint');
            if (h) h.classList.add('bye');
            setTimeout(() => { if (renameHintPet === target) renameHintPet = null; const h2 = document.getElementById('renameHint'); if (h2) h2.remove(); }, 400);
        }, 4500);
    }
    if (!document.getElementById('lobbySheet').classList.contains('open')) toggleLobbySheet(true);
    updateLobbyUI();
}
function toggleLobbySheet(force) {
    const sh = document.getElementById('lobbySheet');
    const open = typeof force === 'boolean' ? force : !sh.classList.contains('open');
    sh.classList.toggle('open', open);
    document.getElementById('lobbyHandle').setAttribute('aria-expanded', String(open));
}
/* ---- 패널 스와이프: 손잡이·탭 줄을 위아래로 끌면 손가락을 따라 열리고 닫힘 ----
   - 손을 떼면 반 넘게 열렸으면 열기, 아니면 닫기 / 빠르게 튕기면 그 방향으로
   - 살짝 누르기만 하면(8px 미만) 원래처럼 손잡이 열고닫기 · 탭 선택 */
(function setupSheetSwipe() {
    const sheet = document.getElementById('lobbySheet'), panel = document.getElementById('lobbyPanel');
    const DRAG_START = 8, FLICK = 0.45;   // px, px/ms
    let st = null, suppressClick = false;
    const openHeight = () => Math.min(panel.scrollHeight, window.innerHeight * 0.34);
    function down(e) {
        if (e.button > 0 || st) return;
        st = { id: e.pointerId, y0: e.clientY, t0: performance.now(), h0: sheet.classList.contains('open') ? panel.offsetHeight : 0,
               openH: openHeight(), drag: false, samples: [[performance.now(), e.clientY]], el: e.currentTarget };
    }
    function move(e) {
        if (!st || e.pointerId !== st.id) return;
        const dy = e.clientY - st.y0;
        if (!st.drag) {
            if (Math.abs(dy) < DRAG_START) return;
            st.drag = true;
            try { st.el.setPointerCapture(st.id); } catch (err) {}
            sheet.classList.add('dragging');
            panel.style.transition = 'none'; panel.style.overflow = 'hidden';
        }
        const h = Math.max(0, Math.min(st.openH, st.h0 - dy));
        panel.style.maxHeight = h + 'px';
        st.samples.push([performance.now(), e.clientY]);
        if (st.samples.length > 6) st.samples.shift();
        e.preventDefault();
    }
    function up(e) {
        if (!st || e.pointerId !== st.id) return;
        const s = st; st = null;
        if (!s.drag) return;                       // 그냥 누르기 → 원래 클릭 동작
        suppressClick = true; setTimeout(() => { suppressClick = false; }, 350);
        // 손 떼기 직전 속도 (위로가 음수)
        const a = s.samples[0], b = s.samples[s.samples.length - 1];
        const v = (b[1] - a[1]) / Math.max(1, b[0] - a[0]);
        const cur = panel.offsetHeight;
        const open = e.type === 'pointercancel' ? s.h0 > 0 : v < -FLICK ? true : v > FLICK ? false : cur > s.openH / 2;
        sheet.classList.remove('dragging');
        // 지금 높이에서 목표 높이까지 0.3초 애니메이션, 끝나면 원래 CSS에 맡김
        panel.style.transition = '';
        panel.offsetHeight;   // 현재 높이 확정 (애니메이션 시작점)
        panel.style.maxHeight = (open ? s.openH : 0) + 'px';
        toggleLobbySheet(open);
        setTimeout(() => { if (!st) { panel.style.maxHeight = ''; panel.style.overflow = ''; } }, 320);
    }
    [document.getElementById('lobbyHandle'), sheet.querySelector('.lb-tabs')].forEach(el => {
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
    });
    // 끌기로 끝난 손동작 뒤에 따라오는 클릭(손잡이 토글·탭 선택)은 무시
    sheet.addEventListener('click', e => { if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); } }, true);
})();

