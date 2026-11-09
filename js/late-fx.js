/* late-fx.js — 무한모드 '지각' 알림 (도로를 가리지 않는 방식)
   - 파동: 왼쪽 위 시계에서 화면 전체로 원이 퍼져 나감 (0.9초, 화면을 가리지 않음)
       60초 지각 확정: 빨간 파동 3줄 + 화면 가장자리 붉게 번쩍
       10초마다: 노란 파동 1줄 / 1분마다: 빨간 파동 2줄
       오래 버틸수록 파동이 조금씩 진해짐
   - 시계 아래 표시: "지각 확정!" → "지각 10초째" → "지각 1분 10초째"
   - 시계가 한 번 통 튐 + 짧은 "띵" 소리 (음소거하면 같이 꺼짐) */
(function () {
    // 성능: 파동은 화면 크기 그림판(canvas) 하나에 직접 그림 (큰 원 요소를 만들지 않음 → 60초 순간 렉 방지)
    var host = document.getElementById('game-container');
    var cv = document.createElement('canvas');
    cv.id = 'lateFxCanvas'; cv.setAttribute('aria-hidden', 'true');
    host.appendChild(cv);
    var g = cv.getContext('2d');
    var tag = document.getElementById('lateTag');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var rings = [], running = false, W = 0, H = 0, S = 1, edgeT0 = -1e9, edgeGrad = null;
    var EDGE_DUR = 850;
    cv.style.display = 'none';   // 쉬는 동안엔 숨겨서 매 프레임 합성 부담도 없앰

    function fit() {
        var r = host.getBoundingClientRect();
        S = 1;   // 부드러운 선이라 기본 해상도로 충분 (그리는 양을 최소로)
        W = r.width; H = r.height;
        cv.width = Math.round(W * S); cv.height = Math.round(H * S);
        // 가장자리 번쩍임용 그라데이션 (한 번만 만들어 둠)
        edgeGrad = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) / 2);
        edgeGrad.addColorStop(0, 'rgba(239,68,68,0)'); edgeGrad.addColorStop(0.55, 'rgba(239,68,68,0.32)'); edgeGrad.addColorStop(1, 'rgba(239,68,68,0.75)');
    }
    fit(); window.addEventListener('resize', fit);

    function clockEl() { var c = document.getElementById('clockDisplay'); return c && c.closest('.seg-device'); }
    function ripple(color, count, strength) {
        if (reduce) return;
        var dev = clockEl(); if (!dev) return;
        var box = host.getBoundingClientRect(), r = dev.getBoundingClientRect();
        var cx = r.left + r.width / 2 - box.left, cy = r.top + r.height / 2 - box.top;
        var far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
        var now = performance.now();
        for (var i = 0; i < count; i++) rings.push({ x: cx, y: cy, far: far, color: color, o: strength, t0: now + i * 160 });
        start();
    }
    function start() { if (!running) { running = true; cv.style.display = 'block'; requestAnimationFrame(draw); } }
    var DUR = 950;
    function draw(now) {
        g.setTransform(S, 0, 0, S, 0, 0);
        g.clearRect(0, 0, W, H);
        rings = rings.filter(function (q) { return now - q.t0 < DUR; });
        rings.forEach(function (q) {
            var k = (now - q.t0) / DUR; if (k < 0) return;
            var e = 1 - Math.pow(1 - k, 3), rad = Math.max(1, q.far * (0.04 + 0.96 * e));
            var a = q.o * (k < 0.7 ? 1 - k * 0.79 : 0.45 * (1 - (k - 0.7) / 0.3));
            g.strokeStyle = q.color;
            g.globalAlpha = a * 0.28; g.lineWidth = 12; g.beginPath(); g.arc(q.x, q.y, rad, 0, Math.PI * 2); g.stroke();   // 은은한 번짐
            g.globalAlpha = a; g.lineWidth = 3; g.beginPath(); g.arc(q.x, q.y, rad, 0, Math.PI * 2); g.stroke();           // 선명한 선
        });
        var ek = (now - edgeT0) / EDGE_DUR;
        if (ek >= 0 && ek < 1) {   // 화면 가장자리 붉게 번쩍
            g.globalAlpha = ek < 0.18 ? ek / 0.18 : 1 - (ek - 0.18) / 0.82;
            g.fillStyle = edgeGrad; g.fillRect(0, 0, W, H);
        }
        g.globalAlpha = 1;
        if (rings.length || ek < 1) requestAnimationFrame(draw); else { g.clearRect(0, 0, W, H); running = false; cv.style.display = 'none'; }
    }
    function edgeFlash() {
        if (reduce) return;
        edgeT0 = performance.now(); start();
    }
    function bumpClock(red) {
        var dev = clockEl(); if (!dev) return;
        dev.classList.remove('late-bump', 'red'); void dev.offsetWidth;
        dev.classList.add('late-bump'); if (red) dev.classList.add('red');
        setTimeout(function () { dev.classList.remove('late-bump', 'red'); }, 600);
    }
    function ding(big) {   // 코드로 만든 짧은 종소리
        if (typeof actx === 'undefined' || !actx || isMuted) return;
        try {
            if (actx.state !== 'running') actx.resume();
            var t = actx.currentTime, notes = big ? [988, 1319] : [1319];
            notes.forEach(function (f, i) {
                var o = actx.createOscillator(), g = actx.createGain(), st = t + i * 0.09;
                o.type = 'sine'; o.frequency.setValueAtTime(f, st);
                g.gain.setValueAtTime(0.0001, st);
                g.gain.exponentialRampToValueAtTime(big ? 0.22 : 0.16, st + 0.006);
                g.gain.exponentialRampToValueAtTime(0.0001, st + (big ? 0.5 : 0.32));
                o.connect(g); g.connect(masterGain); o.start(st); o.stop(st + 0.55);
            });
        } catch (e) {}
    }
    function lateText(sec) {
        var m = Math.floor(sec / 60), s = sec % 60;
        return '지각 ' + (m ? m + '분' : '') + (m && s ? ' ' : '') + (s ? s + '초' : '') + '째';
    }
    function setTag(text, cls) {
        tag.textContent = text;
        tag.className = 'late-tag on ' + (cls || '');
        document.getElementById('game-container').classList.add('late-on');   // 반려동물 말풍선을 살짝 아래로
        void tag.offsetWidth; tag.classList.add('pop');
        setTimeout(function () { tag.classList.remove('pop'); }, 400);
    }

    window.LateFx = {
        show: function (lateSec) {
            var minutes = Math.floor(lateSec / 60), strength = Math.min(0.9, 0.5 + minutes * 0.06);   // 오래 버틸수록 진하게
            if (!lateSec) {                                  // 60초: 지각 확정!
                ripple('#ef4444', 3, 0.85); edgeFlash(); bumpClock(true);
                setTag('⚠ 지각 확정!', 'red');
            } else if (lateSec % 60 === 0) {                 // 1분마다
                ripple('#f87171', 2, Math.min(0.95, strength + 0.15)); bumpClock(true); ding(true);
                setTag(lateText(lateSec), 'red');
            } else {                                         // 10초마다
                ripple(minutes >= 2 ? '#fb923c' : '#fbbf24', 1, strength); bumpClock(false); ding(false);
                setTag(lateText(lateSec), '');
            }
        },
        reset: function () {
            tag.className = 'late-tag'; tag.textContent = '';
            rings = []; edgeT0 = -1e9;
            document.getElementById('game-container').classList.remove('late-on');
        }
    };
})();
