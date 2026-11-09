/* 01-data.js — 저장 데이터(크레딧·차량·기록) 불러오기/저장
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   1. 데이터 구조 및 로컬 스토리지 관리
   ========================================== */
const CAR_DB = [
    { id: 'roadster', name: '기본 로드스터', model: 'roadster', color: 0xd97706, desc: '크레딧 획득 20% 증가', ability: 'CREDIT_BONUS' },
    { id: 'suv', name: '튼튼한 SUV', model: 'santafe', color: 0x1d4ed8, desc: '충돌 1회 방어 (쉴드)', ability: 'SHIELD' },
    { id: 'light', name: '경량 해치백', model: 'pony', color: 0x10b981, desc: '점프 1회 추가 (총 3회)', ability: 'EXTRA_JUMP' },
    { id: 'drift', name: '드리프트 머신', model: 'sonata', color: 0x8b5cf6, desc: '좌우 이동 속도 3배', ability: 'FAST_MOVE' },
    { id: 'time', name: '타임 컨트롤러', model: 'grandeur', color: 0x333333, desc: '시간 감속 2회 (점프 불가)', ability: 'TIME_SLOW' }
];

const THEME_DB = {
    morning: { name: '출근길', sky: 0xb9c3cc, fogNear: 35, fogFar: 230, light: 0xf2f0ea, speedMult: 1.0, scoreMult: 1.0, spawnRate: 1.0, windowGlow: 0.0, sun: false },
    evening: { name: '퇴근길', sky: 0xf2a65a, fogNear: 35, fogFar: 230, light: 0xffa850, speedMult: 1.2, scoreMult: 1.2, spawnRate: 1.4, windowGlow: 0.9, sun: true },
    night:   { name: '소풍길', sky: 0xa8dcff, fogNear: 90, fogFar: 420, light: 0xfff4d6, speedMult: 1.7, scoreMult: 1.4, spawnRate: 2.6, nature: true }
};

const QUOTES = {
    morning: [
        "이 사원은 언제 오는거야?!", "시간이 몇신데 이제 기어와?!", "나때는 출근 10분전부터 컴퓨터 켜놨어!",
        "오늘 또 지각하면 시말서야!", "김대리도 벌써 도착해서 일하고 있잖아!", "지금 차 막힌다는 핑계 대려는 건 아니지?!",
        "보고서는 다 쓰고 오고 있는건가?", "일찍 일찍 좀 다니자 어?", "자네 자리가 아직 비어있네만.", "뛰어와! 당장!",
        "내가 자네 나이 땐 새벽 5시에 나와서 걸레질했어!", "요즘 애들은 근성이 없어! 차 막히면 뛰어서라도 와!",
        "지각할 거면 내 책상 위에 사표부터 올려놔!", "자네 자리 인턴한테 줬다! 오늘부터 복도 근무야!",
        "부모님이 시간 개념 그렇게 가르치시던가?", "정신 상태가 글러먹었어! 시말서 세 장 써와!"
    ],
    evening: [
        "오는 길에 우리 애 픽업해와!", "얼른 와서 집에 밀린 설거지해!", "오늘 저녁은 오빠가 하는거 알지?",
        "어디로 새지 말고 바로 집으로 와!", "분리수거 오늘까지야 늦지마!", "마트 들러서 계란 한 판 사와~",
        "왜 이렇게 늦어? 차 막혀?", "빨리 와서 애 씻겨!", "치킨 시켜놨어 식기 전에 와!", "오늘 회사에서 별 일 없었어?",
        "옆집 남편은 벌써 와서 애 씻기고 있대~", "연애할 땐 나 보러 날아오더니?",
        "또 '거의 다 왔어'지? 출발은 했어?", "늦으면 오늘 소파에서 자는 거 알지?",
        "치킨 다 식었어. 당신 거 내가 먹는다~"
    ],
    night: [
        "아빠 언제 도착해?", "이러다가 비행기 못 타겠다...", "아빠 미워! 빨리 가!",
        "나 화장실 마려워...", "얼마나 더 가야돼?", "비행기 날아가면 어떡해!",
        "앞에 차 엄청 많네! 다 비켜라!", "아빠 운전 짱 못해~", "빨리 가서 놀고 싶어!", "창밖 구경하니까 재밌다!",
        "아빠! 방금 거북이가 우리 추월했어!", "이게 게임이었으면 아빠는 벌써 게임오버야~",
        "아빠, 내비가 '그냥 포기하세요'래!", "비행기가 우리 기다려줄까? 아빠 운전 보면 안 기다릴 듯",
        "아빠 이거밖에 안 돼? 나 그냥 뛰어갈까?", "최고 속도가 이거야? 할머니 차가 더 빠르겠다~",
        "아빠 혹시 지금 일부러 천천히 가는 거야?", "방금 자전거 탄 형아가 우리 앞질러 갔어...",
        "엄마가 운전했으면 벌써 도착했대~"
    ]
};

const CHAR_INFO = {
    morning: { name: "김부장", color: "border-red-500 text-red-600" },
    evening: { name: "와이프", color: "border-pink-500 text-pink-600" },
    night: { name: "우리아이", color: "border-yellow-500 text-yellow-600" }
};

let userData = {
    credits: 0,
    ownedCars: ['roadster'],
    nickname: '', tag: '', deviceId: '',
    best: { morning: 0, evening: 0, night: 0 },   // 코스별 내 최고 버틴 시간
    fameDone: {}, pending: {},
    endlessBest: { morning: 0, evening: 0, night: 0 },   // 코스별 무한모드 최고 기록 (60초 이상)
    endlessPending: {}, fameNames: {},                    // 못 올린 무한 기록 · 명예의 전당에 남긴 이름
    pets: ['corgi'], pet: 'corgi', petNames: {}, petTime: {},  // 입양한 반려동물 · 함께 달리는 반려동물 · 지어 준 이름 · 함께 달린 시간(초)
    stats: { runs: 0, jumps: 0, quotes: [], slows: 0, eveningEndless: 0 }   // 입양 조건용 누적 기록 (판 수 · 점프 · 대사 · 감속 · 퇴근길 무한모드)
};

// 저장 데이터 버전: 기존 플레이어 데이터를 한 번만 고쳐야 할 때 숫자를 올림
//  v2: (베타) 뽑기 룰렛 업데이트 / v3: 정식 버전 출시 — 당시 한 번만 초기화했고, 이제는 초기화하지 않음
//  v4: 반려동물 업데이트 → 보유 차량·크레딧·기록은 그대로, 웰시코기 지급 + 안내창
//      신규 플레이어는 60C로 시작
const DATA_VERSION = 7;   // 5: 패치노트 v26.11.07 · 6: 한 화면 패치노트로 다시 1회 안내 · 7: 패치노트 v26.11.08
const RESET_BONUS = 60;
let pendingNotice = null, noticeFromVersion = 0;
function loadData() {
    let hadSaved = false;
    try {
        const saved = localStorage.getItem('racingGameData');
        if (saved) { userData = Object.assign(userData, JSON.parse(saved)); hadSaved = true; }
    } catch (e) {} // 저장소 차단(사생활 보호 모드 등) 시 새 데이터로 시작
    ensureIdentity();
    delete userData.highScores; // 예전 점수 랭킹 정리
    noticeFromVersion = userData.dataVersion || 1;
    if (noticeFromVersion < DATA_VERSION) {
        if (!hadSaved) { userData.credits = RESET_BONUS; pendingNotice = 'welcome'; }   // 신규: 시작 선물 60C
        else pendingNotice = 'patch';                                                    // 기존: 진행 상황 그대로 + 패치노트 1회
        userData.dataVersion = DATA_VERSION;
    }
    // 확인용: 주소 뒤에 ?patchnote 를 붙이면 언제든 패치노트를 다시 띄움
    try { if (hadSaved && /[?&]patchnote\b/.test(location.search)) pendingNotice = 'patch'; } catch (e) {}
    // 저장값이 이상하게 깨져 있을 때를 대비한 정리
    if (!Array.isArray(userData.ownedCars) || !userData.ownedCars.includes('roadster')) userData.ownedCars = ['roadster'].concat(Array.isArray(userData.ownedCars) ? userData.ownedCars : []);
    userData.ownedCars = userData.ownedCars.filter((id, i, a) => CAR_DB.some(c => c.id === id) && a.indexOf(id) === i);
    if (!Number.isFinite(userData.credits) || userData.credits < 0) userData.credits = 0;
    userData.credits = Math.floor(userData.credits);
    // 반려동물·누적 기록 정리 (예전 저장 데이터엔 없음)
    if (!Array.isArray(userData.pets)) userData.pets = [];
    userData.pets = ['corgi'].concat(userData.pets).filter((id, i, a) => PET_IDS.includes(id) && a.indexOf(id) === i);
    if (userData.pet !== null && !userData.pets.includes(userData.pet)) userData.pet = 'corgi';   // null = 반려동물 없이 달리기
    if (!userData.petNames || typeof userData.petNames !== 'object') userData.petNames = {};
    if (!userData.petTime || typeof userData.petTime !== 'object') userData.petTime = {};
    if (!Array.isArray(userData.pendingPlays)) userData.pendingPlays = [];
    userData.pendingPlays = userData.pendingPlays.filter(p => p && typeof p === 'object' && ['morning', 'evening', 'night'].includes(p.c)).slice(-20);
    Object.keys(userData.petTime).forEach(k => { if (!PET_IDS.includes(k) || !Number.isFinite(userData.petTime[k])) delete userData.petTime[k]; });
    const st = (userData.stats && typeof userData.stats === 'object') ? userData.stats : {};
    userData.stats = {
        runs: Number.isFinite(st.runs) ? Math.max(0, Math.floor(st.runs)) : 0,
        jumps: Number.isFinite(st.jumps) ? Math.max(0, Math.floor(st.jumps)) : 0,
        quotes: Array.isArray(st.quotes) ? st.quotes.filter(q => typeof q === 'string').slice(0, 300) : [],
        slows: Number.isFinite(st.slows) ? Math.max(0, Math.floor(st.slows)) : 0,          // 타임 컨트롤러 감속 사용 횟수 (거북이)
        eveningEndless: Number.isFinite(st.eveningEndless) ? Math.max(0, Math.floor(st.eveningEndless)) : 0,   // 퇴근길 무한모드 플레이 판 수 (햄스터)
        gachaPulls: Number.isFinite(st.gachaPulls) ? Math.max(0, Math.floor(st.gachaPulls)) : 0,   // 차량 뽑기 횟수 (v26.11.09부터, 관리자 통계)
        gachaNew: Number.isFinite(st.gachaNew) ? Math.max(0, Math.floor(st.gachaNew)) : 0          // 그중 새 차량
    };
    saveData();
}
// 기존 플레이어가 새 버전에 처음 들어올 때 1번 보여주는 패치노트 (v26.11.07 + v26.11.08 내용을 합침)
const PATCH_VERSION = 'v26.11.08';
const PATCH_NOTES_HTML = `
    <p class="pn-sub">반려동물 · 무한모드 · 카톡 도전장 업데이트</p>
    <ul class="pn-list">
        <li><span>🐾</span><p><b>반려동물</b> 차 지붕에 태우고 함께 달려요. 조건을 달성하면 반값에 입양할 수 있고, ✏️ 버튼으로 이름을 지어 줄 수 있어요</p></li>
        <li><span>♾️</span><p><b>무한모드</b> 코스를 60초 클리어하면 열려요! 09시가 지나면 지각 모드에 돌입해 끝까지 버텨요</p></li>
        <li><span>💬</span><p><b>카톡 도전장</b> 결과 화면에서 내 기록을 친구에게 보내요. 친구가 링크를 열면 같은 코스로 바로 도전하고, 결과로 답장할 수 있어요</p></li>
        <li><span>👑</span><p><b>명예의 전당</b> 무한모드 기록 순으로 정렬돼요. 신기록을 세우면 이름을 바꿀 수 있어요</p></li>
        <li><span>⚖️</span><p><b>밸런스</b> 타임 컨트롤러 감속은 한 판에 2번까지. 좌우 이동 버튼이 20% 커졌어요</p></li>
        <li><span>🖼️</span><p><b>기록 카드</b> 스샷 저장이 기록 카드로 바뀌었어요. 코스 · 버틴 시간 · 신기록 여부가 한 장에 담겨요</p></li>
        <li><span>🏠</span><p><b>화면 개편</b> 3D 로비, 밀어서 여닫는 하단 패널, 전자시계 · 디지털 계기판 HUD</p></li>
        <li><span>✨</span><p><b>화면 단장</b> 새 글꼴과 아이콘, 버튼을 누르는 손맛과 효과음, 부드러워진 팝업과 숫자 연출</p></li>
        <li><span>⚡</span><p><b>빨라진 첫 접속</b> 처음 받는 용량을 크게 줄이고 로딩 화면을 새로 만들었어요</p></li>
        <li><span>🛡️</span><p><b>공정한 랭킹</b> 기록 검증이 강화되어 조작된 기록은 랭킹에 오르지 않아요</p></li>
        <li><span>🔗</span><p><b>링크 미리보기</b> 카톡에 게임 주소를 보내면 게임 카드가 떠요</p></li>
        <li><span>🐞</span><p><b>버그 수정 · 안정성</b> 고속 충돌 판정 누락과 배경음악 끊김을 고쳤어요. 3D 엔진을 게임 안에 넣어 더 안정적으로 실행돼요</p></li>
    </ul>
    <p class="pn-sign">오늘도 김부장의 잔소리를 피해 무사히 출근하세요! 🚗💨<br>지각해도 괜찮아요. 무한모드가 기다리고 있으니까요.</p>
    <p class="pn-team"><b>HINT 2조</b><br>김창명 · 김홍기 · 박소희 · 신재현 · 정인채 · 홍의성 드림</p>`;

function showNotice() {
    if (!pendingNotice) return;
    const welcome = pendingNotice === 'welcome';
    const body = document.getElementById('noticeBody');
    document.getElementById('noticeIcon').textContent = welcome ? '🎁' : '📋';
    document.getElementById('noticeTitle').textContent = welcome ? '어서 오세요!' : '패치노트 ' + PATCH_VERSION;
    body.classList.toggle('patch-notes', !welcome);
    body.innerHTML = welcome
        ? '출근길·퇴근길·소풍길을 60초 동안 버텨보세요.<br>버틴 시간만큼 크레딧이 쌓여요.<br>차 지붕엔 <b class="text-white">반려동물</b>이 함께 타요!'
        : PATCH_NOTES_HTML;
    if (!welcome) body.scrollTop = 0;
    document.getElementById('noticeGift').innerHTML = welcome
        ? '시작 선물로 <b class="text-yellow-300">60C (뽑기 1번)</b>와 <b class="text-yellow-300">웰시코기</b>를 드렸어요.'
        : noticeFromVersion < 4   // 반려동물이 없던 버전에서 온 사람에게만 웰시코기 선물 안내
          ? '첫 반려동물 <b class="text-yellow-300">🐶 웰시코기</b>를 선물로 드렸어요.<br><span class="text-xs text-gray-400">보유 차량·크레딧·기록은 그대로예요.</span>'
          : '<span class="text-xs text-gray-400">보유 차량·크레딧·기록은 그대로예요.</span>';
    document.getElementById('noticeModal').classList.remove('hidden');
}
function closeNotice() {
    pendingNotice = null;
    document.getElementById('noticeModal').classList.add('hidden');
}

function saveData() {
    try { localStorage.setItem('racingGameData', JSON.stringify(userData)); } catch (e) {}
    updateLobbyUI();
}
