/* late-fx.js — 무한모드 '지각' 알림 (도로를 가리지 않는 방식)
   - 파동: 왼쪽 위 시계에서 화면 전체로 원이 퍼져 나감 (0.9초, 화면을 가리지 않음)
       60초 지각 확정: 빨간 파동 3줄 + 화면 가장자리 붉게 번쩍
       10초마다: 노란 파동 1줄 / 1분마다: 빨간 파동 2줄
       오래 버틸수록 파동이 조금씩 진해짐
   - 시계 아래 표시: "지각 확정!" → "지각 10초째" → "지각 1분 10초째"
   - 시계가 한 번 통 튐 + 짧은 "띵" 소리 (음소거하면 같이 꺼짐) */
(function () {
    var layer = document.createElement('div');
    layer.id = 'lateFxLayer'; layer.setAttribute('aria-hidden', 'true');
    document.getElementById('game-container').appendChild(layer);
    var tag = document.getElementById('lateTag');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    function clockEl() { var c = document.getElementById('clockDisplay'); return c && c.closest('.seg-device'); }
    function ripple(color, count, strength) {
        if (reduce) return;
        var dev = clockEl(); if (!dev) return;
        var box = layer.getBoundingClientRect(), r = dev.getBoundingClientRect();
        var cx = r.left + r.width / 2 - box.left, cy = r.top + r.height / 2 - box.top;
        // 시계에서 가장 먼 화면 모서리까지 닿는 크기
        var far = Math.max(Math.hypot(cx, cy), Math.hypot(box.width - cx, cy), Math.hypot(cx, box.height - cy), Math.hypot(box.width - cx, box.height - cy));
        for (var i = 0; i < count; i++) {
            var d = document.createElement('div');
            d.className = 'late-ring';
            d.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;width:' + far * 2 + 'px;height:' + far * 2 + 'px;margin:' + (-far) + 'px 0 0 ' + (-far) + 'px;' +
                '--c:' + color + ';--o:' + strength + ';animation-delay:' + (i * 0.16) + 's';
            layer.appendChild(d);
            d.addEventListener('animationend', function () { this.remove(); });   // 애니메이션이 끝나면 지움
            (function (el) { setTimeout(function () { el.remove(); }, 4000); })(d);   // 혹시 안 끝나도 4초 뒤 지움
        }
    }
    function edgeFlash() {
        if (reduce) return;
        var f = document.createElement('div'); f.className = 'late-edge';
        f.addEventListener('animationend', function () { f.remove(); });
        layer.appendChild(f); setTimeout(function () { f.remove(); }, 4000);
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
            document.getElementById('game-container').classList.remove('late-on');
            layer.innerHTML = '';
        }
    };
})();
