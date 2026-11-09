/* share.js — 기록 카드 저장 · 카톡 도전장 보내기 · 도전장 받기
   - 기록 카드: 결과 화면의 게임 장면 위에 코스·버틴 시간·신기록 여부·닉네임·차량·펫을 그려 넣은 이미지
   - 도전장: 내 기록이 담긴 링크를 공유 → 친구가 열면 "○○님의 도전장" 창 → 같은 코스로 도전
   - 결과 화면에서 도전 성공/실패를 알려주고, 결과로 답장할 수 있음
   ※ 10-destination.js 의 결과 처리 끝에서 window.lastResult 를 채우고 onResultShown() 을 부름 */
(function () {
    var COURSES = ['morning', 'evening', 'night'];
    var CH_KEY = 'racingChallenge';
    var cardFile = null, cardFor = null;   // 미리 만들어 둔 기록 카드 (공유 버튼을 누르는 즉시 쓰려고)

    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function nickText() { var n = (userData.nickname || '').trim(); return n ? n : '익명의 직장인'; }
    function fmt(s) { return (Math.round(s * 10) / 10).toFixed(1); }
    function gameUrl() { return location.origin + location.pathname.replace(/index\.html$/, ''); }
    function getChallenge() { try { return JSON.parse(sessionStorage.getItem(CH_KEY) || 'null'); } catch (e) { return null; } }
    function setChallenge(c) { try { if (c) sessionStorage.setItem(CH_KEY, JSON.stringify(c)); else sessionStorage.removeItem(CH_KEY); } catch (e) {} }

    /* ---------------- 기록 카드 그리기 (1080 x 1350) ---------------- */
    function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function fitText(g, text, maxW, size, font) { var s = size; do { g.font = font.replace('{s}', s); s -= 2; } while (g.measureText(text).width > maxW && s > 12); }
    function drawCard() {
        var R = window.lastResult; if (!R) return Promise.resolve(null);
        var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        var g = cv.getContext('2d');
        // 1) 게임 장면
        try {
            renderer.render(scene, camera);
            var src = renderer.domElement, sw = src.width, sh = src.height, k = Math.max(W / sw, H / sh);
            g.drawImage(src, (W - sw * k) / 2, (H - sh * k) / 2, sw * k, sh * k);
        } catch (e) { g.fillStyle = '#1e293b'; g.fillRect(0, 0, W, H); }
        var top = g.createLinearGradient(0, 0, 0, 420); top.addColorStop(0, 'rgba(2,6,23,.88)'); top.addColorStop(1, 'rgba(2,6,23,0)');
        g.fillStyle = top; g.fillRect(0, 0, W, 420);
        var bot = g.createLinearGradient(0, 560, 0, H); bot.addColorStop(0, 'rgba(2,6,23,0)'); bot.addColorStop(.35, 'rgba(2,6,23,.82)'); bot.addColorStop(1, 'rgba(2,6,23,.97)');
        g.fillStyle = bot; g.fillRect(0, 560, W, H - 560);
        var TF = "{s}px Jua, 'Pretendard Variable', sans-serif", BF = "600 {s}px 'Pretendard Variable', -apple-system, sans-serif";
        g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        // 2) 맨 위: 시계 + 게임 이름 + 코스
        g.save(); g.translate(W / 2, 110);
        g.strokeStyle = '#facc15'; g.lineWidth = 9; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.stroke();
        g.lineCap = 'round'; g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 0); g.lineTo(-22, 0); g.stroke();
        g.strokeStyle = '#facc15'; g.lineWidth = 7; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -28); g.stroke(); g.restore();
        g.fillStyle = '#fff'; g.font = TF.replace('{s}', 70); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 12;
        g.fillText('09시까지 출근하세요', W / 2, 235); g.shadowBlur = 0;
        var chip = (COURSE_NAMES[R.course] || '') + (R.endless ? ' · 무한모드' : ' · 60초 버티기');
        g.font = BF.replace('{s}', 34); var cw = g.measureText(chip).width + 56;
        g.fillStyle = R.endless ? 'rgba(239,68,68,.85)' : 'rgba(16,185,129,.85)'; roundRect(g, (W - cw) / 2, 268, cw, 60, 30); g.fill();
        g.fillStyle = '#fff'; g.fillText(chip, W / 2, 310);
        // 3) 결과
        var y = 760;
        g.fillStyle = R.win ? '#6ee7b7' : '#fca5a5'; fitText(g, R.title, W - 160, 64, TF); g.fillText(R.title, W / 2, y);
        g.fillStyle = 'rgba(255,255,255,.7)'; g.font = BF.replace('{s}', 36); g.fillText('버틴 시간', W / 2, y + 66);
        g.fillStyle = '#facc15'; g.font = TF.replace('{s}', 210); g.shadowColor = 'rgba(250,204,21,.35)'; g.shadowBlur = 30;
        g.fillText(fmt(R.secs) + 's', W / 2, y + 270); g.shadowBlur = 0;
        var badge = R.isRecord ? (R.prevBest > 0 ? '🎉 신기록! (이전 ' + fmt(R.prevBest) + 's)' : '🎉 첫 기록!') : '내 최고 기록 ' + fmt(R.best) + 's';
        g.font = BF.replace('{s}', 36); var bw = g.measureText(badge).width + 60;
        g.fillStyle = R.isRecord ? 'rgba(16,185,129,.9)' : 'rgba(255,255,255,.14)'; roundRect(g, (W - bw) / 2, y + 305, bw, 66, 33); g.fill();
        g.fillStyle = '#fff'; g.fillText(badge, W / 2, y + 350);
        // 4) 누가 · 무슨 차 · 어떤 펫
        var car = (CAR_DB[currentCarIndex] || {}).name || '', pet = userData.pet ? petDisplayName(userData.pet) : '';
        g.fillStyle = '#fff'; g.font = TF.replace('{s}', 46); g.fillText(nickText() + (userData.tag ? '#' + userData.tag : ''), W / 2, y + 440);
        g.fillStyle = 'rgba(255,255,255,.65)'; g.font = BF.replace('{s}', 30);
        g.fillText('🚗 ' + car + (pet ? '   🐾 ' + pet : ''), W / 2, y + 488);
        // 5) 맨 아래: 주소 · 날짜
        var d = new Date(), date = d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
        g.fillStyle = 'rgba(255,255,255,.45)'; g.font = BF.replace('{s}', 26);
        g.fillText(location.host + '  ·  ' + date, W / 2, H - 28);
        return new Promise(function (res) { cv.toBlob(function (b) { res(b); }, 'image/png'); });
    }
    function prepareCard() {
        var R = window.lastResult; if (!R) return Promise.resolve(null);
        if (cardFile && cardFor === R) return Promise.resolve(cardFile);
        var fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('70px Jua'), document.fonts.load("600 36px 'Pretendard Variable'")]).catch(function () {}) : Promise.resolve();
        return fontsReady.then(drawCard).then(function (blob) {
            if (!blob) return null;
            var name = '09시까지출근하세요_' + (COURSE_NAMES[R.course] || '') + '_' + (R.endless ? '무한_' : '') + fmt(R.secs) + '초.png';
            try { cardFile = new File([blob], name, { type: 'image/png' }); } catch (e) { cardFile = blob; cardFile.name = name; }
            cardFor = R; return cardFile;
        });
    }
    function download(file) {
        var url = URL.createObjectURL(file), a = document.createElement('a');
        a.href = url; a.download = file.name || 'record.png'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        showToast('기록 카드를 저장했어요!');
    }
    function shareFile(file) {
        if (navigator.canShare && navigator.share) {
            try {
                if (navigator.canShare({ files: [file] })) {
                    navigator.share({ files: [file] }).catch(function (e) { if (!e || e.name !== 'AbortError') download(file); });
                    return;
                }
            } catch (e) {}
        }
        download(file);
    }
    // 결과 화면 '기록 카드 저장' 버튼 (기존 함수 이름 그대로 덮어씀)
    window.shareScreenshot = function () {
        var R = window.lastResult;
        if (cardFile && cardFor === R) { shareFile(cardFile); return; }   // 미리 만들어 둔 카드 → 바로 공유창
        prepareCard().then(function (f) { if (f) shareFile(f); else showToast('기록 카드를 만들지 못했어요'); });
    };

    /* ---------------- 도전장 보내기 ---------------- */
    function challengeLink(R) {
        var q = '?c=' + R.course + '&t=' + fmt(R.secs) + (R.endless ? '&e=1' : '') + '&by=' + encodeURIComponent(nickText().slice(0, 12));
        return gameUrl() + q;
    }
    window.sendChallenge = function () {
        var R = window.lastResult; if (!R) return;
        var ch = getChallenge(), reply = ch && ch.c === R.course && !!ch.e === !!R.endless;
        var course = COURSE_NAMES[R.course] + (R.endless ? ' 무한모드' : '');
        var text = reply
            ? (R.secs === ch.t ? '🤝 ' + ch.by + '님이랑 ' + course + ' ' + fmt(R.secs) + '초 동점! 승부를 가리자!' : R.secs > ch.t ? '😎 ' + ch.by + '님 도전장 받고 ' + course + ' ' + fmt(R.secs) + '초 버텼어요! 다시 깨 볼 수 있어?' : '😤 ' + course + ' ' + fmt(R.secs) + '초… ' + ch.by + '님 기록 ' + fmt(ch.t) + '초 못 넘었어요. 다시 간다!')
            : '⏰ ' + nickText() + '님이 ' + course + '에서 ' + fmt(R.secs) + '초 버텼어요! 이 기록 깰 수 있어? 🔥';
        var url = challengeLink(R);
        if (navigator.share) {
            navigator.share({ title: '09시까지 출근하세요 도전장', text: text, url: url }).catch(function (e) { if (!e || e.name !== 'AbortError') copy(text + '\n' + url); });
        } else copy(text + '\n' + url);
    };
    function copy(s) {
        function ok() { showToast('도전장 링크를 복사했어요! 카톡에 붙여넣기 해 주세요'); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(ok, fallback); else fallback();
        function fallback() {
            var ta = document.createElement('textarea'); ta.value = s; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); ok(); } catch (e) { showToast('복사하지 못했어요'); } ta.remove();
        }
    }

    /* ---------------- 도전장 받기 ---------------- */
    var incoming = null;
    (function readLink() {
        try {
            var p = new URLSearchParams(location.search), c = p.get('c'), t = parseFloat(p.get('t')), by = (p.get('by') || '').trim().slice(0, 12);
            if (COURSES.indexOf(c) >= 0 && isFinite(t) && t > 0 && t < 10000) incoming = { c: c, t: Math.round(t * 10) / 10, e: p.get('e') === '1', by: by || '친구' };
            if (incoming || p.has('c')) {   // 주소창에서 도전장 정보 지우기 (새로고침해도 다시 안 뜨게)
                ['c', 't', 'e', 'by'].forEach(function (k) { p.delete(k); });
                var qs = p.toString(); history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
            }
        } catch (e) {}
    })();
    var modal = document.createElement('div'); modal.className = 'sh-modal hidden'; modal.id = 'challengeModal';
    modal.innerHTML = '<div class="sh-box"><p class="sh-icon">🔥</p><h3>도전장이 도착했어요!</h3><p class="sh-text" id="chText"></p>' +
        '<button type="button" class="sh-btn" id="chGo">도전하기</button><button type="button" class="sh-btn ghost" id="chLater">나중에</button></div>';
    document.body.appendChild(modal);
    function lobbyFree() {
        if (typeof gameState === 'undefined' || gameState !== 'LOBBY' || intro) return false;
        var lob = document.getElementById('lobbyScreen'); if (!lob || lob.classList.contains('hidden')) return false;
        return !['tieModal', 'newsModal', 'noticeModal', 'nickModal', 'rankModal', 'adoptModal', 'gachaModal', 'adminModal', 'challengeModal'].some(function (id) { var m = document.getElementById(id); return m && !m.classList.contains('hidden'); });
    }
    if (incoming) {
        var waitT = setInterval(function () {
            if (!lobbyFree()) return;
            clearInterval(waitT);
            var I = incoming, endlessOk = I.e && endlessUnlocked(I.c);
            document.getElementById('chText').innerHTML = '<b>' + esc(I.by) + '</b>님이 <b>' + COURSE_NAMES[I.c] + (I.e ? ' 무한모드' : '') + '</b>에서<br><span class="sh-time">' + fmt(I.t) + '초</span><br>버텼어요. 이 기록을 넘어 보세요!' +
                (I.e && !endlessOk ? '<br><small>무한모드가 아직 안 열려서 일반 모드로 도전해요</small>' : '');
            modal.classList.remove('hidden');
            document.getElementById('chGo').onclick = function () {
                modal.classList.add('hidden');
                setChallenge({ c: I.c, t: I.t, e: !!endlessOk, by: I.by });
                try { selectTheme(I.c); } catch (e) {}
                setTimeout(function () { try { setLobbyTab('course'); setEndless(!!endlessOk); } catch (e) {} showToast('🔥 ' + I.by + '님의 ' + fmt(I.t) + '초를 넘어라!'); }, 400);
            };
            document.getElementById('chLater').onclick = function () { modal.classList.add('hidden'); };
        }, 400);
    }

    /* ---------------- 결과 화면이 뜰 때 ---------------- */
    window.onResultShown = function () {
        var R = window.lastResult, ch = getChallenge(), box = document.getElementById('challengeResult'), btn = document.getElementById('challengeBtnText');
        cardFile = null;
        if (box) {
            if (ch && ch.c === R.course && !!ch.e === !!R.endless) {
                var diff = Math.abs(R.secs - ch.t);
                box.className = 'sh-result ' + (R.secs >= ch.t ? 'win' : 'lose');
                box.innerHTML = R.secs === ch.t ? '🤝 동점! <b>' + esc(ch.by) + '</b>님과 똑같이 ' + fmt(ch.t) + 's 버텼어요'
                    : R.secs > ch.t
                    ? '🏆 도전 성공! <b>' + esc(ch.by) + '</b>님 기록 ' + fmt(ch.t) + 's를 ' + fmt(diff) + '초 앞섰어요'
                    : '😤 <b>' + esc(ch.by) + '</b>님 기록 ' + fmt(ch.t) + 's까지 ' + fmt(diff) + '초 모자라요';
                if (btn) btn.textContent = '결과로 답장하기';
            } else { box.className = 'sh-result hidden'; box.innerHTML = ''; if (btn) btn.textContent = '카톡으로 도전장 보내기'; }
        }
        setTimeout(prepareCard, 900);   // 결과 연출이 끝난 뒤 미리 만들어 둠
    };
})();
