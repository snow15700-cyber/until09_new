/* ===== 탭 효과음 "톡" + 진동 =====
   음원 파일 없이 코드로 소리를 만듦. 음소거 버튼을 누르면 같이 꺼짐 */
(function () {
document.addEventListener('touchstart', function () {}, { passive: true }); // 아이폰에서 눌림 효과(:active)가 보이게
var BIG = '#startBtn, .lb-go, .lb-gacha, .lb-adopt, .adopt-box button, #endScreen button';   // 진동까지 주는 중요한 버튼
function tick(big) {
    if (typeof actx === 'undefined' || !actx || isMuted) return;
    try {
        if (actx.state !== 'running') actx.resume();
        var t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(big ? 720 : 1050, t);
        o.frequency.exponentialRampToValueAtTime(big ? 380 : 560, t + 0.06);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(big ? 0.32 : 0.2, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (big ? 0.11 : 0.07));
        o.connect(g); g.connect(masterGain); o.start(t); o.stop(t + 0.13);
    } catch (e) {}
}
document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('button, .lb-pill, [role="button"]');
    if (!b || b.disabled || b.classList.contains('locked') || b.closest('#controls') || b.closest('.locked')) return;   // 주행 조작 버튼은 소리 없음
    var big = b.matches(BIG);
    tick(big);
    if (big && navigator.vibrate) try { navigator.vibrate(12); } catch (er) {}
}, true);
})();
