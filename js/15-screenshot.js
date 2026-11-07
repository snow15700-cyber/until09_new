/* 15-screenshot.js — 스크린샷 저장
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   5. 스크린샷 캡처 및 다운로드 기능
   ========================================== */
function shareScreenshot() {
    // preserveDrawingBuffer가 true이므로 렌더링된 캔버스를 바로 이미지로 변환 가능
    // 현재 상태 렌더링 (UI 제외 배경 3D만 캡처됨)
    renderer.render(scene, camera);
    const dataURL = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `09시까지출근하세요_${COURSE_NAMES[selectedTheme]}_${runEndless ? '무한_' : ''}${(runEndless ? Math.floor(gameTime * 10) / 10 : Math.min(60, gameTime)).toFixed(1)}초.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("스크린샷이 다운로드되었습니다!");
}


