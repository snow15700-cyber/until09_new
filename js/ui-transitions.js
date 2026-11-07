/* ===== 화면 전환 + 숫자 카운트업 =====
   게임 코드가 화면을 보이거나(hidden 제거) 숨길 때(hidden 추가)를 지켜보다가 애니메이션만 덧입힘.
   - 나타날 때: 팝업은 살짝 커지며 등장, 결과 화면은 위로 차례차례
   - 사라질 때: 화면은 즉시 숨기고(게임 동작 그대로), 똑같이 생긴 '잔상'을 0.2초 동안 흐리게 지움 */
(function () {
var POPUP = ['noticeModal', 'nickModal', 'rankModal', 'adoptModal'];   // 상자가 튀어나오는 팝업
var FADE  = ['gachaModal'];                                            // 자체 연출이 있어서 배경만 페이드
function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function once(el, cls, ms) { restart(el, cls); setTimeout(function () { el.classList.remove(cls); }, ms); }
function ghost(el, cls, ms) {   // 사라진 화면의 잔상을 잠깐 보여주며 흐리게
    try {
        var g = el.cloneNode(true);
        g.removeAttribute('id'); g.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
        g.classList.remove('hidden', 'fx-fade', 'fx-stagger', 'fx-lobby'); g.classList.add(cls);
        g.querySelectorAll('canvas').forEach(function (c) { c.style.visibility = 'hidden'; });
        g.setAttribute('aria-hidden', 'true');
        el.parentNode.insertBefore(g, el.nextSibling);
        setTimeout(function () { g.remove(); }, ms);
    } catch (e) {}
}
function onShow(id, el) {
    if (POPUP.indexOf(id) >= 0) { if (el.firstElementChild) el.firstElementChild.classList.add('fx-box'); once(el, 'fx-fade', 400); }
    else if (FADE.indexOf(id) >= 0) once(el, 'fx-fade', 300);
    else if (id === 'endScreen') once(el, 'fx-stagger', 800);
    // 로비 ↔ 주행 전환은 게임에 원래 있는 '검은 화면 페이드'가 담당하므로 여기서는 건드리지 않음
}
function onHide(id, el) {
    if (POPUP.indexOf(id) >= 0 || FADE.indexOf(id) >= 0) ghost(el, 'fx-ghost', 220);
}
var WATCH = POPUP.concat(FADE, ['endScreen']);
var mo = new MutationObserver(function (list) {
    list.forEach(function (m) {
        var el = m.target, was = (m.oldValue || '').split(/\s+/).indexOf('hidden') >= 0, now = el.classList.contains('hidden');
        if (was && !now) onShow(el.id, el); else if (!was && now) onHide(el.id, el);
    });
});
WATCH.forEach(function (id) { var el = document.getElementById(id); if (el) mo.observe(el, { attributes: true, attributeFilter: ['class'], attributeOldValue: true }); });

/* ----- 숫자 카운트업: 크레딧·버틴 시간이 바뀌면 촤라락 올라감 ----- */
var busy = {};
function countUp(el, from, to, fmt, dur) {
    var key = el.id, t0 = performance.now();
    busy[key] = true;
    (function step(now) {
        var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmt(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step); else { el.textContent = fmt(to); busy[key] = false; }
    })(t0);
}
function watchNumber(id, parse, fmt, dur, bumpEl) {
    var el = document.getElementById(id); if (!el) return;
    var last = parse(el.textContent);
    new MutationObserver(function () {
        if (busy[id]) return;
        var v = parse(el.textContent);
        if (isNaN(v) || isNaN(last) || v === last) { last = v; return; }
        var from = id === 'lobbyCredit' ? last : 0;   // 크레딧은 이전 값에서, 결과 숫자는 0부터
        last = v;
        if (id === 'lobbyCredit' && v < from) return;  // 쓸 때(감소)는 바로 표시
        countUp(el, from, v, fmt, dur);
        if (bumpEl) setTimeout(function () { once(bumpEl(), 'fx-bump', 400); }, dur);
    }).observe(el, { childList: true, characterData: true, subtree: true });
}
var num = function (s) { var m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
watchNumber('lobbyCredit', num, function (v) { return String(Math.round(v)); }, 600, function () { return document.getElementById('lobbyCredit'); });
watchNumber('finalTime', num, function (v) { return v.toFixed(1) + 's'; }, 650, function () { return document.getElementById('finalTime'); });
watchNumber('earnedCredit', num, function (v) { return '+' + Math.round(v) + ' C'; }, 700, null);
})();
