/* 16-car-preview.js — 로비 차량 3D 미리보기
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   로비 차량 3D 미리보기 (턴테이블)
   ========================================== */
const previewCanvas = document.getElementById('previewCanvas');
// [iOS 대응] 미리보기용 3D가 실패해도 게임 전체가 멈추지 않도록 보호
let previewRenderer = null;
try {
    previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true, alpha: true });
    previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
} catch (e) {
    previewCanvas.parentElement.style.display = 'none';
}
const previewScene = new THREE.Scene();
const previewCam = new THREE.PerspectiveCamera(32, 2, 0.1, 100);
previewCam.position.set(0, 3.2, 10); previewCam.lookAt(0, 1.0, 0);
previewScene.add(new THREE.AmbientLight(0xffffff, 0.65));
const pKey = new THREE.DirectionalLight(0xffffff, 1.0); pKey.position.set(5, 8, 6); previewScene.add(pKey);
const pRim = new THREE.DirectionalLight(0x88aaff, 0.6); pRim.position.set(-6, 4, -6); previewScene.add(pRim);
// 턴테이블 바닥
const turntable = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.25, 48), new THREE.MeshStandardMaterial({ color: 0x2a3344, metalness: 0.6, roughness: 0.35 }));
turntable.position.y = -0.13; previewScene.add(turntable);
const ttRing = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.05, 6, 64), new THREE.MeshBasicMaterial({ color: 0x34d399 }));
ttRing.rotation.x = Math.PI / 2; ttRing.position.y = 0.0; previewScene.add(ttRing);

const previewPivot = new THREE.Group(); previewScene.add(previewPivot);
const silhouetteMat = new THREE.MeshBasicMaterial({ color: 0x05070a });
let previewCarKey = '';

function updatePreviewCar() {
    if (typeof gachaBusy !== 'undefined' && gachaBusy) return;   // 뽑기 연출 중엔 그대로
    const car = CAR_DB[currentCarIndex];
    const owned = userData.ownedCars.includes(car.id);
    const key = car.id + (owned ? '' : '-locked');
    if (key === previewCarKey) return;
    previewCarKey = key;
    previewPivot.children.slice().forEach(c => removeCar(c));
    const m = createCarMesh(car.model, car.color).mesh;
    if (!owned) m.traverse(o => { if (o.isMesh) o.material = silhouetteMat; }); // 미보유: 검은 실루엣
    previewPivot.add(m);
    ttRing.material.color.set(owned ? 0x34d399 : 0x6b7280);
    document.getElementById('previewLock').classList.toggle('hidden', owned);
}

function resizePreview() {
    const w = previewCanvas.clientWidth, h = previewCanvas.clientHeight;
    if (!w || !h || !previewRenderer) return;
    if (previewCanvas.width !== Math.floor(w * previewRenderer.getPixelRatio()) || previewCanvas.height !== Math.floor(h * previewRenderer.getPixelRatio())) {
        previewRenderer.setSize(w, h, false);
        previewCam.aspect = w / h; previewCam.updateProjectionMatrix();
    }
}

