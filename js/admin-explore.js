/* admin-explore.js — 관리자 통계: 🔎 조합 분석 · 👥 이용자 탭
   서버(admin_runs, stats_v2.sql)에서 기간 안의 판 기록 원본을 받아 이 화면에서 직접 계산함
   → 코스 · 차량 · 반려동물 · 기기 · 시간대 등을 마음대로 골라 조합하고, 원하는 기준으로 나눠 볼 수 있음
   ※ 04-admin.js 의 관리자 창 안에서 씀 */
let adminTab = 'basic';
const AX = { days: null, data: null, rows: [], devs: [], filt: {}, gRow: 'car', gCol: 'course', metric: 'clear', open: false, err: '' };

function adminTabsHtml() {
    const tabs = [['basic', '📊 기본'], ['explore', '🔎 조합 분석'], ['players', '👥 이용자']];
    return `<div class="ax-tabs">${tabs.map(([k, l]) => `<button type="button" class="${adminTab === k ? 'on' : ''}" onclick="setAdminTab('${k}')">${l}</button>`).join('')}</div>`;
}
function setAdminTab(t) {
    adminTab = t; let k = ''; try { k = sessionStorage.getItem('adminKey') || ''; } catch (e) {}
    if (k) loadAdmin(k);
}
function adminPeriodHtml() {
    const periods = [[1, '24시간'], [7, '7일'], [30, '30일'], [3650, '전체']];
    return `<div class="admin-chips">${periods.map(([v, l]) => `<button type="button" class="${adminDays === v ? 'on' : ''}" onclick="setAdminDays(${v})">${l}</button>`).join('')}</div>`;
}
// 04-admin.js 의 loadAdmin에서 '조합 분석' · '이용자' 탭일 때 부름
async function loadAdminExtra(key, body) {
    if (AX.days !== adminDays || !AX.data) {
        body.innerHTML = adminTabsHtml() + adminPeriodHtml() + '<p class="admin-note">판 기록을 불러오는 중…</p>';
        const d = await rpc('admin_runs', { p_key: key, p_days: adminDays });   // 비밀번호가 틀리면 여기서 오류
        axPrepare(d || {}); AX.days = adminDays;
    }
    try { sessionStorage.setItem('adminKey', key); } catch (e) {}
    axRender();
}

/* ---------- 데이터 정리 ---------- */
const kstDate = t => new Date((t + 32400) * 1000);
const kstDay = t => kstDate(t).toISOString().slice(0, 10);
const DOW = ['월', '화', '수', '목', '금', '토', '일'];
function axPrepare(d) {
    AX.data = d;
    AX.devs = [];
    (d.devices || []).forEach(([i, first, total, snap, snapAt]) => { AX.devs[i] = { first, total, snap: snap || null, snapAt, firstDay: kstDay(first), n: 0 }; });
    const rows = (d.runs || []).map(a => {
        const r = { t: a[0], d: a[1], course: a[2], mode: a[3], car: a[4] || '', pet: a[5] || '', sec: a[6] == null ? null : Number(a[6]), cl: !!a[7], dur: a[8], i: a[9] || {} };
        const k = kstDate(r.t);
        r.hour = k.getUTCHours(); r.dow = (k.getUTCDay() + 6) % 7; r.day = k.toISOString().slice(0, 10);
        return r;
    });
    // 이 기기의 몇 번째 판인지 (기간 이전 판 수 + 기간 안 순서)
    const cnt = {}; rows.forEach(r => { cnt[r.d] = (cnt[r.d] || 0) + 1; });
    const seen = {};
    rows.forEach(r => {
        const dv = AX.devs[r.d] || {};
        seen[r.d] = (seen[r.d] || 0) + 1;
        r.nth = Math.max(0, (dv.total || 0) - cnt[r.d]) + seen[r.d];
        r.newDay = dv.firstDay === r.day;
    });
    AX.rows = rows;
}

/* ---------- 나눠 보는 기준 (필터 · 그룹) ---------- */
const HIT_NAMES = { single: '1대', pair: '2대 동시', triple: '3대 패턴', single_slow: '1대(감속 중)', pair_slow: '2대(감속 중)', triple_slow: '3대(감속 중)', none: '안 부딪힘' };
const OLD = '?';   // 이번 업데이트 전 판 (추가 정보 없음)
function axDims() {
    const carIds = CAR_DB.map(c => c.id), petIds = PET_INFO.map(p => p.id);
    const nm = map => v => (v === OLD ? '(기록 전)' : map[v] || v);
    return [
        { k: 'course', l: '코스', get: r => r.course, order: ['morning', 'evening', 'night'], name: nm(COURSE_NAMES) },
        { k: 'mode', l: '모드', get: r => r.mode, order: ['normal', 'endless'], name: nm({ normal: '일반', endless: '무한' }) },
        { k: 'car', l: '차량', get: r => r.car, order: carIds, name: v => (CAR_DB.find(c => c.id === v) || {}).name || v || '(없음)' },
        { k: 'pet', l: '반려동물', get: r => r.pet || 'none', order: petIds.concat('none'), name: v => v === 'none' ? '안 태움' : (PET_INFO.find(p => p.id === v) || {}).species || v },
        { k: 'fin', l: '판 결과', get: r => r.sec == null ? 'quit' : r.cl ? 'clear' : 'over', order: ['clear', 'over', 'quit'], name: nm({ clear: '60초 버팀', over: '게임 오버', quit: '중간에 나감' }) },
        { k: 'usr', l: '이용자', get: r => r.newDay ? 'new' : 'old', order: ['new', 'old'], name: nm({ new: '첫날', old: '재방문' }) },
        { k: 'nth', l: '몇 번째 판', get: r => r.nth <= 1 ? 'a' : r.nth <= 5 ? 'b' : r.nth <= 20 ? 'c' : r.nth <= 50 ? 'd' : 'e', order: ['a', 'b', 'c', 'd', 'e'], name: nm({ a: '첫 판', b: '2~5', c: '6~20', d: '21~50', e: '51판~' }) },
        { k: 'tod', l: '시간대', get: r => ['dawn', 'am', 'pm', 'eve'][Math.floor(r.hour / 6)], order: ['dawn', 'am', 'pm', 'eve'], name: nm({ dawn: '새벽 0~6시', am: '오전 6~12시', pm: '오후 12~18시', eve: '저녁 18~24시' }) },
        { k: 'dow', l: '요일', get: r => String(r.dow), order: ['0', '1', '2', '3', '4', '5', '6'], name: v => DOW[v] },
        { k: 'pf', l: '기기', adv: 1, get: r => r.i.pf || OLD, order: ['ios', 'android', 'pc', 'etc', OLD], name: nm({ ios: '아이폰', android: '안드로이드', pc: 'PC', etc: '기타' }) },
        { k: 'app', l: '접속 경로', adv: 1, get: r => r.i.pf ? (r.i.app || 'web') : OLD, order: ['web', 'kakao', 'insta', 'naver', OLD], name: nm({ web: '브라우저', kakao: '카톡 안', insta: '인스타 안', naver: '네이버 안' }) },
        { k: 'ch', l: '도전장', adv: 1, get: r => r.i.pf ? (r.i.ch ? 'y' : 'n') : OLD, order: ['y', 'n', OLD], name: nm({ y: '도전장 판', n: '일반 판' }) },
        { k: 'hi', l: '고사양', adv: 1, get: r => r.i.hi == null ? OLD : r.i.hi ? 'on' : 'off', order: ['on', 'off', OLD], name: nm({ on: 'ON', off: 'OFF' }) },
        { k: 'fps', l: 'FPS', adv: 1, get: r => r.i.fps == null ? OLD : r.i.fps < 30 ? 'a' : r.i.fps < 45 ? 'b' : r.i.fps < 55 ? 'c' : 'd', order: ['a', 'b', 'c', 'd', OLD], name: nm({ a: '30 미만', b: '30~44', c: '45~54', d: '55 이상' }) },
        { k: 'hit', l: '부딪힌 차', adv: 1, get: r => r.sec == null || !r.i.pf ? OLD : r.i.hit || 'none', order: Object.keys(HIT_NAMES).concat(OLD), name: nm(HIT_NAMES) },
        { k: 'ver', l: '버전', adv: 1, get: r => r.i.v || OLD, order: [], name: nm({}) },
        { k: 'hour', l: '시각(1시간)', group: 1, get: r => String(r.hour).padStart(2, '0'), order: [], name: v => v + '시' },
        { k: 'day', l: '날짜', group: 1, get: r => r.day, order: [], name: v => v.slice(5).replace('-', '.') }
    ];
}
function axValues(dim, rows) {
    const set = new Set(rows.map(dim.get));
    const ord = dim.order.filter(v => set.has(v));
    const rest = [...set].filter(v => !dim.order.includes(v)).sort();
    return ord.concat(rest.filter(v => v !== OLD), rest.includes(OLD) ? [OLD] : []);
}
function axFiltered(except) {
    const dims = axDims();
    return AX.rows.filter(r => dims.every(dm => dm.k === except || !AX.filt[dm.k] || !AX.filt[dm.k].length || AX.filt[dm.k].includes(dm.get(r))));
}

/* ---------- 지표 ---------- */
const AX_METRICS = [
    ['runs', '판 수'], ['players', '이용자'], ['perUser', '1인당 판'], ['clear', '클리어율'], ['quit', '중간 이탈'],
    ['avg', '평균 생존'], ['med', '중앙값'], ['p90', '상위 10%'], ['max', '최고'],
    ['j', '평균 점프'], ['sl', '평균 감속'], ['sh', '쉴드 발동'], ['lc', '평균 차선 변경'], ['ov', '평균 추월'], ['cr', '평균 크레딧'], ['fps', '평균 FPS'], ['play', '판당 실제 시간']
];
const axPctl = (a, p) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), i = (s.length - 1) * p, lo = Math.floor(i); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo); };
const axAvg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
// 지표 값과 기준이 된 판 수 { v, n }
function axMetric(rows, m) {
    const fin = rows.filter(r => r.sec != null), withI = rows.filter(r => r.i.pf && r.sec != null);
    // 버틴 시간 지표는 일반 모드끼리만 (일반 판이 없을 때만 무한모드) — 섞으면 평균이 왜곡됨
    const nmFin = fin.filter(r => r.mode === 'normal'), secs = (nmFin.length ? nmFin : fin).map(r => r.sec);
    const infoAvg = k => ({ v: axAvg(withI.map(r => r.i[k] || 0)), n: withI.length });
    switch (m) {
        case 'runs': return { v: rows.length, n: rows.length };
        case 'players': return { v: new Set(rows.map(r => r.d)).size, n: rows.length };
        case 'perUser': { const p = new Set(rows.map(r => r.d)).size; return { v: p ? rows.length / p : null, n: rows.length }; }
        case 'clear': { const nm = fin.filter(r => r.mode === 'normal'); return { v: nm.length ? nm.filter(r => r.cl).length / nm.length * 100 : null, n: nm.length }; }
        case 'quit': return { v: rows.length ? (rows.length - fin.length) / rows.length * 100 : null, n: rows.length };
        case 'avg': return { v: axAvg(secs), n: secs.length };
        case 'med': return { v: axPctl(secs, 0.5), n: secs.length };
        case 'p90': return { v: axPctl(secs, 0.9), n: secs.length };
        case 'max': return { v: secs.length ? Math.max(...secs) : null, n: secs.length };
        case 'sh': { const s = withI.filter(r => r.car === 'suv'); return { v: s.length ? s.filter(r => r.i.sh).length / s.length * 100 : null, n: s.length }; }
        case 'fps': { const f = withI.filter(r => r.i.fps != null); return { v: axAvg(f.map(r => r.i.fps)), n: f.length }; }
        case 'play': { const f = fin.filter(r => r.dur != null && r.dur < 3600); return { v: axAvg(f.map(r => r.dur)), n: f.length }; }
        default: return infoAvg(m);
    }
}
function axFmt(m, v) {
    if (v == null || !isFinite(v)) return '-';
    if (['clear', 'quit', 'sh'].includes(m)) return (Math.round(v * 10) / 10) + '%';
    if (['avg', 'med', 'p90', 'max', 'play'].includes(m)) return v.toFixed(1) + 's';
    if (['runs', 'players', 'fps'].includes(m)) return Math.round(v).toLocaleString('ko-KR');
    return v.toFixed(1);
}

/* ---------- 조작 ---------- */
function axToggle(k, idx) {
    const dm = axDims().find(x => x.k === k), v = axValues(dm, axFiltered(k))[idx];
    const cur = AX.filt[k] || [];
    AX.filt[k] = cur.includes(v) ? cur.filter(x => x !== v) : cur.concat(v);
    axRender();
}
function axClear(k) { if (k) delete AX.filt[k]; else AX.filt = {}; axRender(); }
function axSet(key, v) { AX[key] = v; if (key === 'gRow' && AX.gCol === v) AX.gCol = ''; axRender(); }
function axToggleAdv() { AX.open = !AX.open; axRender(); }

/* ---------- 화면 ---------- */
function axRender() {
    const body = document.getElementById('adminBody'); if (!body) return;
    const sc = body.scrollTop;
    let h = adminTabsHtml() + adminPeriodHtml();
    if (!AX.rows.length) h += '<p class="admin-note">이 기간에는 판 기록이 없어요.</p>';
    else h += adminTab === 'players' ? axPlayersHtml() : axExploreHtml();
    body.innerHTML = h;
    body.scrollTop = sc;
}
function axExploreHtml() {
    const dims = axDims(), rows = axFiltered();
    const active = dims.filter(d => AX.filt[d.k] && AX.filt[d.k].length);
    let h = '';
    // 1) 필터
    const chipRow = dm => {
        const vals = axValues(dm, axFiltered(dm.k)), sel = AX.filt[dm.k] || [];
        return `<div class="ax-frow"><span>${dm.l}</span><div>${vals.map((v, i) => `<button type="button" class="${sel.includes(v) ? 'on' : ''}" onclick="axToggle('${dm.k}',${i})">${esc(dm.name(v))}</button>`).join('')}</div></div>`;
    };
    h += `<h4>🎛️ 조건 고르기 <small>여러 개 고르면 '또는', 줄끼리는 '그리고'</small></h4><div class="ax-filters">` +
        dims.filter(d => !d.group && !d.adv).map(chipRow).join('') +
        `<button type="button" class="ax-more" onclick="axToggleAdv()">${AX.open ? '▲ 접기' : '▼ 기기 · 접속 경로 · 도전장 · FPS · 부딪힌 차 · 버전'}</button>` +
        (AX.open ? dims.filter(d => !d.group && d.adv).map(chipRow).join('') : '') + `</div>`;
    h += `<p class="ax-active">${active.length ? active.map(d => `<b>${d.l}</b> ${AX.filt[d.k].map(v => esc(d.name(v))).join('·')}`).join(' + ') + ` <button type="button" onclick="axClear()">초기화</button>` : '전체 판 (조건 없음)'}</p>`;
    if (!rows.length) return h + '<p class="admin-note">이 조건에 맞는 판이 없어요.</p>';
    // 2) 핵심 지표
    const M = m => axFmt(m, axMetric(rows, m).v);
    const card = (m, l) => `<div><b>${M(m)}</b><span>${l || AX_METRICS.find(x => x[0] === m)[1]}</span></div>`;
    const sm = rows.some(r => r.mode === 'normal') ? '' : ' (무한)';
    h += `<h4>📌 이 조건의 결과</h4><div class="admin-cards">${card('runs')}${card('players')}${card('clear')}${card('quit')}${card('avg', '평균 생존' + sm)}${card('med', '중앙값' + sm)}${card('p90', '상위 10%' + sm)}${card('max', '최고' + sm)}</div>`;
    const withI = rows.filter(r => r.i.pf && r.sec != null).length;
    h += `<div class="admin-cards ax-small">${card('perUser')}${card('play')}${card('j')}${card('sl')}${card('sh', '쉴드 발동(SUV)')}${card('lc')}${card('ov')}${card('cr')}${card('fps')}</div>`;
    h += `<p class="admin-note">생존 시간(평균 · 중앙값 · 상위 10% · 최고)은 일반 모드 판만 계산해요. 무한모드는 '모드'에서 무한만 고르면 보여요.<br>점프 · 감속 · 쉴드 · 차선 · 추월 · 크레딧 · FPS는 이번 업데이트 뒤의 판만 계산돼요 (${withI.toLocaleString('ko-KR')}판).</p>`;
    // 3) 생존 분포
    h += axSurvivalHtml(rows);
    // 4) 나눠 보기
    h += axGroupHtml(rows, dims);
    return h;
}
function axSurvivalHtml(rows) {
    let h = '';
    const nm = rows.filter(r => r.mode === 'normal' && r.sec != null);
    if (nm.length) {
        const b = Array(13).fill(0); nm.forEach(r => { b[r.cl ? 12 : Math.min(11, Math.floor(r.sec / 5))]++; });
        const max = Math.max(...b), peak = b.slice(0, 12).indexOf(Math.max(...b.slice(0, 12)));
        const alive = t => Math.round(nm.filter(r => r.cl || r.sec >= t).length / nm.length * 100);
        h += `<h4>⏱️ 버틴 시간 분포 (일반 모드 ${nm.length.toLocaleString('ko-KR')}판)</h4>
            <p class="admin-sub">가장 많이 죽는 때 <b>${peak * 5}~${peak * 5 + 5}초</b> · 살아남은 비율 ${[10, 20, 30, 40, 50].map(t => `${t}초 <b class="ok">${alive(t)}%</b>`).join(' · ')}</p>
            <div class="admin-bars ax-bars13">` + b.map((v, i) => `<div class="bar ${i === 12 ? 'win' : i === peak ? 'peak' : ''}" title="${i === 12 ? '60초 버팀' : i * 5 + '~' + (i * 5 + 5) + '초'}: ${v}판"><span style="height:${max ? Math.max(v ? 3 : 0, v / max * 100) : 0}%"></span><em>${i === 12 ? '🏁' : i * 5}</em></div>`).join('') + `</div>`;
    }
    const en = rows.filter(r => r.mode === 'endless' && r.sec != null);
    if (en.length) {
        const b = Array(10).fill(0); en.forEach(r => { b[r.sec < 60 ? 0 : Math.min(9, 1 + Math.floor((r.sec - 60) / 15))]++; });
        const max = Math.max(...b), lb = ['~60', '60', '75', '90', '105', '120', '135', '150', '165', '180+'];
        h += `<h4>♾️ 무한모드 버틴 시간 (${en.length.toLocaleString('ko-KR')}판)</h4><div class="admin-bars ax-bars10">` +
            b.map((v, i) => `<div class="bar" title="${lb[i]}초: ${v}판"><span style="height:${max ? Math.max(v ? 3 : 0, v / max * 100) : 0}%"></span><em>${lb[i]}</em></div>`).join('') + `</div>`;
    }
    return h;
}
function axGroupHtml(rows, dims) {
    const sel = (key, list, cur, none) => `<select onchange="axSet('${key}', this.value)">${none ? `<option value="">${none}</option>` : ''}${list.map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const dl = dims.map(d => [d.k, d.l]);
    let h = `<h4>🧮 나눠 보기</h4><div class="ax-group">
        <label>세로 ${sel('gRow', dl, AX.gRow)}</label><label>가로 ${sel('gCol', dl.filter(x => x[0] !== AX.gRow), AX.gCol, '(나누지 않음)')}</label>
        ${AX.gCol ? `<label>칸에 보일 값 ${sel('metric', AX_METRICS, AX.metric)}</label>` : ''}</div>`;
    const R = dims.find(d => d.k === AX.gRow), C = AX.gCol ? dims.find(d => d.k === AX.gCol) : null;
    const rv = axValues(R, rows);
    if (!C) {
        const cols = ['runs', 'players', 'clear', 'avg', 'med', 'quit'];
        const maxRuns = Math.max(...rv.map(v => rows.filter(r => R.get(r) === v).length));
        h += `<table><tr><th>${R.l}</th>${cols.map(m => `<th>${AX_METRICS.find(x => x[0] === m)[1]}</th>`).join('')}</tr>` + rv.map(v => {
            const sub = rows.filter(r => R.get(r) === v);
            return `<tr><td><span class="ax-bar" style="--w:${sub.length / maxRuns * 100}%"></span>${esc(R.name(v))}</td>${cols.map(m => { const x = axMetric(sub, m); return `<td class="${m === 'clear' && x.n < 5 ? 'dim' : ''}">${axFmt(m, x.v)}</td>`; }).join('')}</tr>`;
        }).join('') + `</table><p class="admin-note">흐린 클리어율은 일반 모드 판이 5판 미만이라 믿기 어려운 값이에요.</p>`;
        return h;
    }
    const cv = axValues(C, rows), m = AX.metric;
    const cells = rv.map(a => cv.map(b => axMetric(rows.filter(r => R.get(r) === a && C.get(r) === b), m)));
    const vals = cells.flat().filter(x => x.n >= 5 && x.v != null).map(x => x.v);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    h += `<div class="ax-scroll"><table class="ax-matrix"><tr><th>${R.l} \\ ${C.l}</th>${cv.map(b => `<th>${esc(C.name(b))}</th>`).join('')}<th>전체</th></tr>` +
        rv.map((a, i) => `<tr><td>${esc(R.name(a))}</td>${cells[i].map(x => {
            const k = x.n >= 5 && x.v != null && hi > lo ? (x.v - lo) / (hi - lo) : null;
            return `<td class="${x.n < 5 ? 'dim' : ''}" style="${k != null ? `background:rgba(245,158,11,${0.08 + k * 0.5})` : ''}">${axFmt(m, x.v)}<small>${x.n}</small></td>`;
        }).join('')}<td class="tot">${axFmt(m, axMetric(rows.filter(r => R.get(r) === a), m).v)}</td></tr>`).join('') +
        `<tr><td class="tot">전체</td>${cv.map(b => `<td class="tot">${axFmt(m, axMetric(rows.filter(r => C.get(r) === b), m).v)}</td>`).join('')}<td class="tot">${axFmt(m, axMetric(rows, m).v)}</td></tr></table></div>
        <p class="admin-note">칸 아래 작은 숫자는 계산에 쓴 판 수예요. 5판 미만은 흐리게 보여요. 진할수록 값이 커요.</p>`;
    return h;
}

/* ---------- 👥 이용자 탭 ---------- */
function axPlayersHtml() {
    const rows = AX.rows, d = AX.data, now = d.now, from = d.from;
    const n = v => (v == null ? '-' : Number(v).toLocaleString('ko-KR'));
    const pct = (a, b) => (b ? Math.round(a / b * 1000) / 10 + '%' : '-');
    const byDev = {}; rows.forEach(r => { (byDev[r.d] = byDev[r.d] || []).push(r); });
    const ids = Object.keys(byDev).map(Number);
    const cohort = ids.filter(i => AX.devs[i] && AX.devs[i].first >= from);
    // 재방문율
    const dayN = t => Math.floor((t + 32400) / 86400);
    const ret = (minAge, lo, hi) => {
        const el = cohort.filter(i => now - AX.devs[i].first >= minAge * 86400);
        const back = el.filter(i => { const f = dayN(AX.devs[i].first); return byDev[i].some(r => { const k = dayN(r.t) - f; return k >= lo && k <= hi; }); });
        return { el: el.length, back: back.length };
    };
    const d1 = ret(2, 1, 1), d7 = ret(8, 1, 7), d3 = ret(4, 1, 3);
    // 세션 (30분 넘게 쉬면 새 세션)
    let sess = 0, sessRuns = 0, sessLen = 0;
    ids.forEach(i => {
        let start = null, end = 0, cnt = 0;
        const close = () => { if (start != null) { sess++; sessRuns += cnt; sessLen += end - start; } };
        byDev[i].forEach(r => {
            if (start == null || r.t - end > 1800) { close(); start = r.t; cnt = 0; }
            cnt++; end = Math.max(end, r.t + (r.dur != null && r.dur < 3600 ? r.dur : 60));
        });
        close();
    });
    const dau = days => days ? new Set(rows.map(r => r.day + '|' + r.d)).size / days : null;
    const days = new Set(rows.map(r => r.day)).size;
    let h = `<h4>👥 이용자 한눈에</h4><div class="admin-cards">
        <div><b>${n(ids.length)}</b><span>이용자(기기)</span></div><div><b>${n(cohort.length)}</b><span>새로 온 이용자</span></div>
        <div><b>${days ? dau(days).toFixed(1) : '-'}</b><span>하루 평균 이용자</span></div>
        <div><b>${(rows.length / ids.length).toFixed(1)}</b><span>1인당 판</span></div></div>
        <div class="admin-cards ax-small">
        <div><b>${pct(d1.back, d1.el)}</b><span>다음 날 재방문 (${d1.el}명 중)</span></div>
        <div><b>${pct(d3.back, d3.el)}</b><span>3일 안 재방문 (${d3.el}명 중)</span></div>
        <div><b>${pct(d7.back, d7.el)}</b><span>7일 안 재방문 (${d7.el}명 중)</span></div>
        <div><b>${(sessRuns / sess).toFixed(1)}판</b><span>한 번 켜면 (평균)</span></div>
        <div><b>${(sessLen / sess / 60).toFixed(1)}분</b><span>한 번 켜면 (시간)</span></div>
        <div><b>${(sess / ids.length).toFixed(1)}번</b><span>1인당 접속 횟수</span></div></div>
        <p class="admin-note">재방문율은 이 기간에 처음 온 사람 중, 충분히 시간이 지난 사람만 세요. 30분 넘게 쉬면 새로 켠 것으로 봐요.</p>`;
    // 1인당 판 수 분포
    const bk = [[1, 1, '1판'], [2, 5, '2~5'], [6, 20, '6~20'], [21, 50, '21~50'], [51, 1e9, '51판~']];
    const bc = bk.map(([a, b]) => ids.filter(i => byDev[i].length >= a && byDev[i].length <= b).length), bmax = Math.max(...bc);
    h += `<h4>🎮 이 기간에 몇 판씩 했나</h4><div class="admin-days">` + bk.map((x, k) => `<div><em>${x[2]}</em><span class="bar"><span style="width:${bmax ? bc[k] / bmax * 100 : 0}%"></span></span><b>${n(bc[k])}명 · ${pct(bc[k], ids.length)}</b></div>`).join('') + `</div>`;
    // 첫 클리어까지
    h += `<h4>🏁 처음 60초를 버티기까지 (새로 온 이용자)</h4><table><tr><th>코스</th><th>도전한 명</th><th>클리어한 명</th><th>평균 시도</th><th>중앙값</th></tr>`;
    ['morning', 'evening', 'night'].forEach(c => {
        const tries = [], tried = cohort.filter(i => byDev[i].some(r => r.course === c && r.mode === 'normal'));
        tried.forEach(i => { const a = byDev[i].filter(r => r.course === c && r.mode === 'normal' && r.sec != null); const k = a.findIndex(r => r.cl); if (k >= 0) tries.push(k + 1); });
        h += `<tr><td>${COURSE_NAMES[c]}</td><td>${n(tried.length)}</td><td>${n(tries.length)} <small>(${pct(tries.length, tried.length)})</small></td><td>${tries.length ? axAvg(tries).toFixed(1) + '판' : '-'}</td><td>${tries.length ? axPctl(tries, 0.5).toFixed(0) + '판' : '-'}</td></tr>`;
    });
    h += `</table>`;
    // 날짜별 신규 / 재방문
    const dd = {}; ids.forEach(i => byDev[i].forEach(r => { const o = dd[r.day] = dd[r.day] || { nw: new Set(), old: new Set(), runs: 0 }; o.runs++; (AX.devs[i].firstDay === r.day ? o.nw : o.old).add(i); }));
    const dk = Object.keys(dd).sort().slice(-21), dmax = Math.max(...dk.map(k => dd[k].nw.size + dd[k].old.size));
    if (dk.length > 1) h += `<h4>📅 날짜별 이용자 <small><i class="sw nw"></i>처음 온 사람 <i class="sw old"></i>다시 온 사람</small></h4><div class="admin-days ax-stack">` + dk.map(k => {
        const o = dd[k]; return `<div><em>${k.slice(5).replace('-', '.')}</em><span class="bar"><span class="nw" style="width:${o.nw.size / dmax * 100}%"></span><span class="old" style="width:${o.old.size / dmax * 100}%"></span></span><b>${o.nw.size}+${o.old.size}명 · ${n(o.runs)}판</b></div>`;
    }).join('') + `</div>`;
    // 시간대 × 요일
    const hm = Array.from({ length: 7 }, () => Array(8).fill(0)); rows.forEach(r => { hm[r.dow][Math.floor(r.hour / 3)]++; });
    const hmax = Math.max(...hm.flat());
    h += `<h4>🕒 언제 많이 하나 (판 수)</h4><div class="ax-scroll"><table class="ax-matrix ax-heat"><tr><th></th>${[0, 3, 6, 9, 12, 15, 18, 21].map(x => `<th>${x}시~</th>`).join('')}</tr>` +
        hm.map((row, i) => `<tr><td>${DOW[i]}</td>${row.map(v => `<td style="background:rgba(56,189,248,${hmax ? 0.05 + v / hmax * 0.7 : 0})">${v || ''}</td>`).join('')}</tr>`).join('') + `</table></div>`;
    h += axSnapHtml(ids);
    // 많이 한 사람
    const top = ids.slice().sort((a, b) => byDev[b].length - byDev[a].length).slice(0, 8);
    h += `<h4>🔥 이 기간에 가장 많이 한 기기</h4><table><tr><th>기기</th><th>판</th><th>클리어</th><th>최고</th><th>처음 온 날</th></tr>` + top.map(i => {
        const a = byDev[i], fin = a.filter(r => r.sec != null);
        return `<tr><td>#${i + 1}</td><td>${n(a.length)}</td><td>${n(a.filter(r => r.cl).length)}</td><td>${fin.length ? Math.max(...fin.map(r => r.sec)).toFixed(1) + 's' : '-'}</td><td>${AX.devs[i].firstDay.slice(5).replace('-', '.')}</td></tr>`;
    }).join('') + `</table>`;
    const fame = d.fame || {}, ranked = d.ranked || {};
    h += `<h4>👑 명예의 전당 · 랭킹 등록 (전체 기간)</h4><table><tr><th>코스</th><th>명예의 전당</th><th>아깝게 놓친 TOP</th></tr>` +
        ['morning', 'evening', 'night'].map(c => `<tr><td>${COURSE_NAMES[c]}</td><td>${n(fame[c] || 0)}명</td><td>${n(ranked[c] || 0)}명</td></tr>`).join('') + `</table>`;
    return h;
}
// 이용자 요약 (각 기기가 마지막으로 보낸 상태)
function axSnapHtml(ids) {
    const sn = ids.map(i => AX.devs[i].snap).filter(Boolean);
    if (!sn.length) return `<h4>🎒 이용자 보유 현황</h4><p class="admin-note">아직 기록이 없어요. 이번 업데이트 뒤에 접속한 사람부터 쌓여요.</p>`;
    const pct = (a, b) => (b ? Math.round(a / b * 100) + '%' : '-');
    const avg = k => axAvg(sn.map(s => Number(s[k]) || 0));
    const pf = {}; sn.forEach(s => { pf[s.pf || 'etc'] = (pf[s.pf || 'etc'] || 0) + 1; });
    const PF = { ios: '아이폰', android: '안드로이드', pc: 'PC', etc: '기타' };
    let h = `<h4>🎒 이용자 보유 현황 <small>${sn.length}명 기준 (업데이트 뒤 접속한 사람)</small></h4><div class="admin-cards ax-small">
        <div><b>${Math.round(avg('cr'))}C</b><span>평균 보유 크레딧</span></div>
        <div><b>${axAvg(sn.map(s => (s.cars || []).length)).toFixed(1)}대</b><span>평균 보유 차량</span></div>
        <div><b>${axAvg(sn.map(s => (s.pets || []).length)).toFixed(1)}마리</b><span>평균 입양 반려동물</span></div>
        <div><b>${avg('gp').toFixed(1)}번</b><span>평균 뽑기 (업데이트 뒤)</span></div>
        <div><b>${pct(sn.filter(s => s.nick).length, sn.length)}</b><span>닉네임 정함</span></div>
        <div><b>${avg('quotes').toFixed(1)}개</b><span>평균 모은 대사</span></div>
        <div><b>${pct(sn.filter(s => (s.fame || []).length).length, sn.length)}</b><span>명예의 전당 1곳 이상</span></div>
        <div><b>${pct(sn.filter(s => s.hi).length, sn.length)}</b><span>고사양 ON</span></div>
        <div><b>${Object.entries(pf).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${PF[k] || k} ${pct(v, sn.length)}`).join('<br>')}</b><span>기기</span></div></div>`;
    const carRow = CAR_DB.map(c => [c.name, sn.filter(s => (s.cars || []).includes(c.id)).length]);
    const petRow = PET_INFO.map(p => [p.species, sn.filter(s => (s.pets || []).includes(p.id)).length, sn.filter(s => s.pet === p.id).length]);
    h += `<table><tr><th>차량</th><th>가진 사람</th></tr>${carRow.map(([nm, v]) => `<tr><td>${esc(nm)}</td><td>${v}명 · ${pct(v, sn.length)}</td></tr>`).join('')}</table>
        <table><tr><th>반려동물</th><th>입양한 사람</th><th>지금 태움</th></tr>${petRow.map(([nm, v, w]) => `<tr><td>${esc(nm)}</td><td>${v}명 · ${pct(v, sn.length)}</td><td>${w}명</td></tr>`).join('')}</table>`;
    const bestC = ['morning', 'evening', 'night'].map(c => [c, sn.filter(s => s.best && s.best[c] >= 60).length, axAvg(sn.filter(s => s.best && s.best[c] > 0).map(s => s.best[c]))]);
    h += `<table><tr><th>코스</th><th>클리어한 사람</th><th>평균 최고 기록</th></tr>${bestC.map(([c, v, a]) => `<tr><td>${COURSE_NAMES[c]}</td><td>${v}명 · ${pct(v, sn.length)}</td><td>${a == null ? '-' : a.toFixed(1) + 's'}</td></tr>`).join('')}</table>`;
    return h;
}
