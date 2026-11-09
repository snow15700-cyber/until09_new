/* patch-notes.js — 패치노트 모음 · 로비 '업데이트 소식' 버튼 (01-data.js보다 먼저 불러옴)

   ★ 업데이트할 때 할 일: PATCH_HISTORY 맨 위에 새 버전 한 덩어리만 추가
     → 기존 플레이어에게 접속 시 패치노트가 1번 자동으로 뜨고(닫으면 확인한 것으로 기록)
     → 로비의 📜 버튼이 반짝이다가, 한 번 열어 보면 원래대로 돌아감
   분류: 새 콘텐츠 · 편의성 업데이트 · 비주얼 업데이트 · 밸런스 · 버그 수정 (필요한 것만) */
const PATCH_HISTORY = [
    {
        v: 'v26.11.10', date: '2026.11.10', title: '가을 단장 · 편의 기능 업데이트',
        groups: [
            ['편의성 업데이트', [
                ['⌨️', '스페이스바로 다시 시도 (PC)', '결과 화면에서 스페이스바를 누르면 바로 다시 출발해요'],
                ['♾️', '무한모드 바로 시작', '60초를 클리어한 코스는 로비에서 무한모드가 먼저 선택돼요. 일반 모드로 바꾸면 그 선택은 그대로 유지돼요'],
                ['🐾', '함께한 시간 더 자세히', '반려동물과 함께한 시간이 초 단위까지 표시돼요 (예: 12분 34초)'],
                ['📜', '업데이트 소식', '로비 오른쪽 위 버튼에서 지난 업데이트 내용을 언제든 다시 볼 수 있어요. 새 소식이 있으면 반짝여요'],
                ['⏰', '도로를 가리지 않는 지각 알림', '무한모드의 지각 알림이 화면 가운데 상자 대신, 왼쪽 위 시계에서 퍼지는 파동과 \'지각 ○초째\' 글자로 바뀌었어요']
            ]],
            ['비주얼 업데이트', [
                ['🍂', '퇴근길 은행나무 길', '노을 진 퇴근길 인도에 노란 은행나무 가로수가 생겼어요. 은행잎이 차 옆을 스쳐 흩날리고, 바퀴 뒤로 노을빛 흙먼지가 일어요'],
                ['🌸', '소풍길 꽃바람', '꽃잎과 풀잎이 바람을 타고 차 옆을 스쳐 지나가요'],
                ['✨', '', '새 효과는 고사양 모드를 켜면 볼 수 있어요']
            ]],
            ['버그 수정', [
                ['💧', '출근길 물보라', '빗길에서 바퀴 물보라가 제대로 보이지 않던 문제를 고쳤어요'],
                ['🍃', '배경 효과 속도', '퇴근길 공중 먼지와 소풍길 하늘 꽃잎이 도로보다 느리게 흘러가 차를 따라오는 것처럼 보이던 문제를 고쳤어요']
            ]]
        ],
        sign: '오늘도 무사히 출근하고, 은행잎 날리는 퇴근길도 즐겨 주세요! 🚗🍂'
    },
    {
        v: 'v26.11.08', date: '2026.11.08', title: '앱처럼 부드럽게 · 카톡 도전장',
        groups: [
            ['새 기능', [
                ['💬', '카톡 도전장', '결과 화면에서 내 기록을 친구에게 보내요. 친구가 링크를 열면 같은 코스로 바로 도전하고, 결과로 답장할 수 있어요'],
                ['🖼️', '기록 카드', '스샷 저장이 기록 카드로 바뀌었어요. 코스 · 버틴 시간 · 신기록 여부 · 차 · 반려동물이 한 장에 담겨요'],
                ['🔗', '링크 미리보기', '카톡에 게임 주소를 보내면 게임 카드가 떠요']
            ]],
            ['비주얼 업데이트', [
                ['✨', '화면 단장', '새 글꼴과 아이콘, 버튼을 누르는 손맛과 효과음 · 진동, 부드러워진 팝업과 숫자 연출'],
                ['⏳', '로딩 화면', '진행 막대와 팁이 나오는 로딩 화면을 새로 만들었어요']
            ]],
            ['성능 개선', [
                ['⚡', '빨라진 첫 접속', '처음 받는 용량을 크게 줄였어요'],
                ['🛠️', '더 안정적인 실행', '3D 엔진을 게임 안에 넣어 인터넷 상태가 나빠도 더 잘 실행돼요']
            ]]
        ]
    },
    {
        v: 'v26.11.07', date: '2026.11.07', title: '반려동물 · 무한모드 업데이트',
        groups: [
            ['새 콘텐츠', [
                ['🐾', '반려동물', '차 지붕에 반려동물을 태우고 함께 달려요. 6종이 있고, 조건을 달성하면 반값에 입양할 수 있어요. ✏️ 버튼으로 이름도 지어 줄 수 있어요'],
                ['♾️', '무한모드', '코스를 60초 클리어하면 열려요. 09시가 지나면 지각 모드에 돌입해 끝까지 버텨요'],
                ['👑', '명예의 전당 개편', '무한모드 기록 순으로 정렬돼요. 신기록을 세우면 이름을 바꿀 수 있어요']
            ]],
            ['비주얼 업데이트', [
                ['🏠', '3D 로비', '실제 코스 위를 달리는 3D 로비와 밀어서 여닫는 하단 패널'],
                ['🕘', '새 계기판', '주행 중 현재 시각이 흐르는 전자시계와 디지털 속도계'],
                ['🎬', '출발 연출', '로비 카메라가 차 뒤로 돌아 붙으며 바로 출발해요']
            ]],
            ['밸런스', [
                ['⏱️', '타임 컨트롤러', '감속은 한 판에 2번까지 (오른쪽 위 보라색 S로 남은 횟수 표시)'],
                ['👆', '조작 버튼', '좌우 이동 버튼이 20% 커졌어요']
            ]],
            ['버그 수정', [
                ['🛡️', '공정한 랭킹', '기록 검증이 강화되어 조작된 기록은 랭킹에 오르지 않아요'],
                ['🐞', '안정성', '빠른 속도에서 충돌 판정이 빠지던 문제와 배경음악 끊김을 고쳤어요']
            ]]
        ]
    },
    {
        v: 'release', label: '정식 출시', date: '2026.11.05', title: '정식 버전 출시',
        groups: [
            ['새 출발', [
                ['🎉', '모두 같은 출발선', '베타 때의 크레딧 · 차량을 초기화하고 60C를 드렸어요. 닉네임 · 내 기록 · 랭킹 · 명예의 전당은 그대로예요'],
                ['🎲', '뽑기 정식 가격', '뽑기 50C, 이미 가진 차가 나오면 20C 환급 (60초 한 판이면 뽑기 약 1번)']
            ]],
            ['버그 수정', [
                ['⏱️', '시간 표시', '게임 중 시간과 결과 화면 시간이 0.1초 어긋나던 문제를 고쳤어요']
            ]]
        ]
    },
    {
        v: 'beta', label: '베타', date: '2026.11.03 ~ 11.05', title: '베타 테스트',
        groups: [
            ['베타 동안 생긴 것들', [
                ['🏆', '온라인 랭킹', '버틴 시간으로 겨루는 랭킹, 60초를 버틴 사람만 오르는 명예의 전당, 닉네임'],
                ['🌆', '코스별 배경 · 음악', '빽빽한 빗길 도심(출근길), 노을 진 도시(퇴근길), 강과 산이 있는 자연(소풍길)과 코스별 배경음악'],
                ['🚗', '차량 5종 정리', '차종마다 다른 디자인과 능력, 로비 3D 미리보기'],
                ['🎰', '뽑기 룰렛', '실루엣이 돌다가 멈추는 뽑기 연출, 새 차를 뽑으면 축하 효과'],
                ['💥', '연출', '3-2-1 카운트다운, 충돌 슬로모션, 60초 도착 대폭발, 고사양 모드(그림자 · 빛 · 날씨)'],
                ['📱', '아이폰 대응 · 최적화', '아이폰에서 멈추던 문제를 고치고, 첫 화면 로딩을 8초에서 1.5초로 줄였어요']
            ]]
        ],
        sign: [
            '부족한 게임인데도 쉬는 시간마다 즐겨 주셔서 감사합니다',
            '교육받는 3개월 동안, 쉬는 시간이 좀 더 즐거워지도록 만들겠습니다',
            '"이것 좀 넣어 줘", "여기 버그 있어" 같은 이야기는 2조 아무나 붙잡고 해 주시면 됩니다',
            '다들 고생 많으실텐데 우리 모두 즐겁게 수료하고, 각자 바라던 곳으로 무사히 출근하시길 바랍니다',
            '감사합니다'
        ],
        warn: '아래 "HINT 2조"를 절대 누르지마세요'   // 이스터에그 힌트 (업데이트 소식 창 맨 아래 서명)
    }
];
const PATCH_VERSION = PATCH_HISTORY[0].v;
// 서명. 업데이트 소식 창의 서명만 'HINT 2조'를 누를 수 있음 (이스터에그)
const PATCH_TEAM_HTML = `<p class="pn-team"><b>HINT 2조</b><br>김창명 · 김홍기 · 박소희 · 신재현 · 정인채 · 홍의성 드림</p>`;
const NEWS_TEAM_HTML = `<p class="pn-team"><b class="hint2" onclick="hint2Tap(this)">HINT 2조</b><br>김창명 · 김홍기 · 박소희 · 신재현 · 정인채 · 홍의성 드림</p>`;
function patchBodyHtml(p, withSign) {
    const esc2 = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return `<p class="pn-sub">${esc2(p.title)}</p>` + p.groups.map(([g, items]) =>
        `<p class="pn-cat">${esc2(g)}</p><ul class="pn-list">` + items.map(([e, b, t]) =>
            `<li><span>${e}</span><p>${b ? `<b>${esc2(b)}</b>` : ''}${esc2(t)}</p></li>`).join('') + `</ul>`).join('') +
        (withSign && p.sign ? `<p class="pn-sign">${[].concat(p.sign).map(esc2).join('<br>')}</p>` : '') +   // 여러 줄이면 줄바꿈
        (withSign && p.warn ? `<p class="pn-warn">${esc2(p.warn)}</p>` : '');
}
// 접속 시 자동으로 뜨는 패치노트 (최신 버전)
const PATCH_NOTES_HTML = patchBodyHtml(PATCH_HISTORY[0], true) + PATCH_TEAM_HTML;

/* ---------- 로비 '업데이트 소식' 버튼 ---------- */
function hasNewPatch() { return !!(userData && userData.patchSeen !== PATCH_VERSION); }
function markPatchSeen() {
    if (!hasNewPatch()) return;
    userData.patchSeen = PATCH_VERSION;
    saveData();   // saveData → updateLobbyUI → 버튼 반짝임 꺼짐
}
function updateNewsBadge() {
    const b = document.getElementById('newsBtn'); if (!b) return;
    const on = hasNewPatch();
    b.classList.toggle('glow', on);
    b.setAttribute('aria-label', on ? '업데이트 소식 (새 소식 있음)' : '업데이트 소식');
}
let newsOpen = 0;   // 펼쳐진 버전 (처음엔 최신)
function renderNews() {
    document.getElementById('newsList').innerHTML = PATCH_HISTORY.map((p, i) => {
        const open = i === newsOpen;
        return `<section class="nw-item ${open ? 'open' : ''}">
            <button type="button" class="nw-head" onclick="toggleNews(${i})" aria-expanded="${open}">
                <span class="nw-ver">${p.label || p.v}${i === 0 ? '<i>최신</i>' : ''}</span><span class="nw-date">${p.date}</span><span class="nw-arrow">▾</span>
            </button>
            ${open ? `<div class="nw-body patch-notes">${patchBodyHtml(p, true)}</div>` : ''}</section>`;
    }).join('') + NEWS_TEAM_HTML;
}
function toggleNews(i) { newsOpen = newsOpen === i ? -1 : i; renderNews(); }
function openUpdates() {
    newsOpen = 0; renderNews();
    // 열 때마다 한 번: 3초 뒤 김부장이 끼어듦 (그 전에 닫으면 안 나옴)
    clearTimeout(bossOpenTimer);
    bossOpenTimer = setTimeout(() => {
        if (document.getElementById('newsModal').classList.contains('hidden') || hint2Busy) return;
        const line = Math.random() < BOSS_RARE_P ? BOSS_RARE : BOSS_LINES[Math.floor(Math.random() * BOSS_LINES.length)];
        bossSay(document.querySelector('#newsModal .nw-top'), line, false, 'below');
    }, 3000);
    const m = document.getElementById('newsModal'); m.classList.remove('hidden');
    document.getElementById('newsList').scrollTop = 0;
    markPatchSeen();
}
function closeUpdates() { clearTimeout(bossOpenTimer); document.getElementById('newsModal').classList.add('hidden'); }

/* ---------- 이스터에그: 김부장 난입 + 빨간 넥타이 ----------
   · 업데이트 소식을 열면 3초 뒤 김부장 한마디 (가끔 베타 페이지 힌트)
   · 창 맨 아래 'HINT 2조'를 누르면 김부장의 진심 → 넥타이 선물 (기기당 1번, 저장됨)
   · 받은 뒤엔 'HINT 2조'를 누를 때마다 넥타이 풀기 / 다시 매기 (점수와 무관한 꾸미기) */
const BOSS_LINES = [
    '자네들, 패치노트 쓸 시간에 출근이나 하게!',
    '업데이트는 칼같이 하면서 출근은 왜 맨날 늦나?',
    '버그? 내가 자네 나이 땐 버그도 맨손으로 잡았어!',
    '명예의 전당에 내 이름은 왜 없나? 당장 올려!',
    '이스터에그? 그런 거 찾을 시간에 보고서나 찾아오게!',
    '여섯이서 이것밖에 못 만들었나? …흠, 재밌긴 하군.'
];
const BOSS_RARE = '뭐라고? 베타 테스트 페이지를 읽어보라고? 부장한테 명령하는거야?', BOSS_RARE_P = 0.08;
const BOSS_HEART = '...다들 수료 잘하게. 고생이 많아. 9시까지는 꼭 오고.';
const BOSS_SHOW_MS = 2600;
let bossTimer = null, bossOpenTimer = null, hint2Busy = false;
// 김부장 말풍선: anchor 위(기본) 또는 아래에 2.6초
function bossSay(anchor, line, soft, where) {
    let el = document.getElementById('bossCameo');
    if (!el) {
        el = document.createElement('div'); el.id = 'bossCameo'; el.className = 'boss-cameo';
        el.innerHTML = '<span class="bc-face">👔</span><div><b>김부장</b><p></p></div>';
        (document.getElementById('game-container') || document.body).appendChild(el);
    }
    el.querySelector('p').textContent = line;
    el.classList.toggle('soft', !!soft);
    const host = el.parentElement.getBoundingClientRect(), r = anchor.getBoundingClientRect();
    el.style.left = Math.max(8, Math.min(host.width - 268, r.left - host.left + r.width / 2 - 130)) + 'px';
    el.style.top = Math.max(8, where === 'below' ? r.bottom - host.top + 6 : r.top - host.top - 78) + 'px';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    if (navigator.vibrate) try { navigator.vibrate(25); } catch (e) {}
    clearTimeout(bossTimer); bossTimer = setTimeout(() => el.classList.remove('show'), BOSS_SHOW_MS);
}
function tieWorn() { return !!(userData.bossTie && userData.tieOn); }
function applyTie() { if (typeof PetKit !== 'undefined') PetKit.setTie(tieWorn()); }
function hint2Tap(anchor) {
    if (hint2Busy) return;
    clearTimeout(bossOpenTimer);   // 이스터에그를 찾았으면 열 때 나오던 대사는 생략
    if (!userData.bossTie) {       // 처음: 김부장의 진심 → 2.6초 뒤 넥타이 선물
        hint2Busy = true;
        bossSay(anchor, BOSS_HEART, true);
        setTimeout(() => {
            hint2Busy = false;
            userData.bossTie = true; userData.tieOn = true; saveData(); applyTie();
            document.getElementById('tieModal').classList.remove('hidden');
            if (navigator.vibrate) try { navigator.vibrate([30, 40, 60]); } catch (e) {}
        }, BOSS_SHOW_MS);
        return;
    }
    userData.tieOn = !userData.tieOn; saveData(); applyTie();   // 이후: 풀기 / 다시 매기
    showToast(userData.tieOn ? '👔 넥타이를 다시 매었습니다' : '넥타이를 풀었습니다');
}
function closeTieModal() { document.getElementById('tieModal').classList.add('hidden'); }
