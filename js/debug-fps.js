/* debug-fps.js — 성능 측정 도구 (평소엔 꺼져 있음)
   주소 뒤에 ?debug 를 붙이면 화면 왼쪽 위에 표시됨. 예) https://주소/?debug
   - FPS: 1초에 화면을 몇 번 그리는지 (60이면 아주 부드러움, 30 아래면 끊김이 느껴짐)
   - 평균/최악: 한 화면 그리는 데 걸린 시간 (16.7ms 이하가 60FPS)
   - 끊김: 최근 10초 동안 50ms 넘게 멈춘 횟수
   - 그리기/삼각형: 3D 화면 한 번에 그리는 물체 수 / 면 수 (많을수록 무거움)
   - 판 끝나면: 그 판 전체의 평균·최저 FPS와 끊김 횟수를 '지난 판'에 남김 */
(function () {
    if (!/[?&]debug\b/.test(location.search)) return;
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:6px;top:calc(env(safe-area-inset-top,0px) + 6px);z-index:9500;pointer-events:none;' +
        'background:rgba(0,0,0,.72);color:#e5e7eb;font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;padding:6px 8px;border-radius:8px;white-space:pre;min-width:150px';
    document.body.appendChild(box);

    var times = [], last = performance.now(), secStart = last, secFrames = 0, fps = 0;
    var run = null, lastRun = '-', prevState = '';
    function g(name) { try { return eval(name); } catch (e) { return undefined; } }   // 게임 변수 읽기 (없으면 undefined)

    function tick(now) {
        var dt = now - last; last = now;
        times.push([now, dt]);
        while (times.length && now - times[0][0] > 10000) times.shift();
        secFrames++;
        if (now - secStart >= 1000) { fps = secFrames * 1000 / (now - secStart); secFrames = 0; secStart = now; }

        // 한 판 기록
        var st = g('gameState') || '';
        if (st === 'PLAYING') {
            if (!run) run = { frames: 0, time: 0, minFps: 999, jank: 0, secF: 0, secT: 0 };
            run.frames++; run.time += dt; run.secF++; run.secT += dt;
            if (dt > 50) run.jank++;
            if (run.secT >= 1000) { run.minFps = Math.min(run.minFps, run.secF * 1000 / run.secT); run.secF = 0; run.secT = 0; }
        } else if (run && run.time > 2000) {
            lastRun = '평균 ' + (run.frames * 1000 / run.time).toFixed(0) + ' / 최저 ' + (run.minFps === 999 ? '-' : run.minFps.toFixed(0)) + ' FPS, 끊김 ' + run.jank + '회';
            try { console.log('[debug] 지난 판: ' + lastRun); } catch (e) {}
            run = null;
        } else if (run) run = null;
        if (st !== prevState) prevState = st;

        if (secFrames === 0) {   // 1초에 한 번만 글자 갱신
            var recent = times.filter(function (t) { return now - t[0] <= 5000; }).map(function (t) { return t[1]; });
            var avg = recent.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, recent.length);
            var worst = Math.max.apply(null, recent.concat([0]));
            var jank = times.filter(function (t) { return t[1] > 50; }).length;
            var r = g('renderer'), info = r && r.info && r.info.render;
            var en = g('enemies');
            box.textContent =
                'FPS    ' + fps.toFixed(0) + (fps < 30 ? '  ⚠' : '') + '\n' +
                '평균   ' + avg.toFixed(1) + 'ms  최악 ' + worst.toFixed(0) + 'ms\n' +
                '끊김   ' + jank + '회 (10초)\n' +
                (info ? '그리기 ' + info.calls + '  삼각형 ' + (info.triangles / 1000).toFixed(1) + 'k\n' : '') +
                '상태   ' + st + (Array.isArray(en) ? '  적 ' + en.length : '') + '\n' +
                '고사양 ' + (g('hiMode') ? 'ON' : 'OFF') + '  해상도 x' + (r ? r.getPixelRatio().toFixed(2) : '-') + '\n' +
                '지난 판 ' + lastRun;
        }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
})();
