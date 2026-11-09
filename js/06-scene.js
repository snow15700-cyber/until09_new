/* 06-scene.js — 3D 화면 준비 · 도로/건물 등 배경 만들기
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   3. Three.js 초기화 및 절차적 렌더링
   ========================================== */
const container = document.getElementById('game-container');
const canvas = document.getElementById('gameCanvas');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 600);

// 스크린샷 캡처를 위해 preserveDrawingBuffer 활성화
// [최적화] 화면 보관 옵션(preserveDrawingBuffer) 끔: 스크린샷은 저장 버튼을 누른 순간에 다시 그려서 찍음
// 계단 현상 보정(antialias)은 고사양 모드일 때만 (페이지를 열 때 정해짐)
const startHiMode = (() => { try { return localStorage.getItem('racingHiMode') !== '0'; } catch (e) { return true; } })();
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: startHiMode, preserveDrawingBuffer: false });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, startHiMode ? 1.75 : 1.25));
// 해상도 배율: 고사양 1.75배 / 저사양 1.25배
function applyQuality() {
    const pr = Math.min(window.devicePixelRatio, hiMode ? 1.75 : 1.25);
    if (renderer.getPixelRatio() !== pr) { renderer.setPixelRatio(pr); renderer.setSize(container.clientWidth, container.clientHeight); }
}
renderer.shadowMap.enabled = true;

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(-50, 30, 20);
dirLight.castShadow = true;
scene.add(dirLight);

// 환경 구성 (도로, 빌딩 등은 기존 로직 유지, 간소화 적용)
const NUM_LANES = 4;
const roadWidth = 24;
const laneWidth = roadWidth / NUM_LANES;
const laneCenters = [-laneWidth*1.5, -laneWidth*0.5, laneWidth*0.5, laneWidth*1.5];

const road = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, 600), new THREE.MeshStandardMaterial({ color: 0x3a404d }));
road.rotation.x = -Math.PI / 2; road.position.z = -200; road.receiveShadow = true;
scene.add(road);

const markersGroup = new THREE.Group(); scene.add(markersGroup);
const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
for(let l = 1; l <= 3; l++) {
    let x = (l * laneWidth) - (roadWidth/2);
    for(let i = 0; i < 20; i++) {
        let m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 5), markerMat);
        m.rotation.x = -Math.PI/2; m.position.set(x, 0.05, -i * 15);
        markersGroup.add(m);
    }
}

/* ---------- 출근길·퇴근길 도시 배경 ---------- */
const cityGroup = new THREE.Group(); scene.add(cityGroup);
const buildings = [];       // 스크롤되는 도시 오브젝트 (건물·신호등·가로등)
const buildingMats = [];    // 테마별 창문 불빛 조절용

// 창문 텍스처: 회색조 외벽 + 창문 격자 (색은 material.color로 입힘)
function makeFacadeTextures() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const e = document.createElement('canvas'); e.width = e.height = 64;
    const ge = e.getContext('2d');
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 64, 64);      // 외벽
    ge.fillStyle = '#000'; ge.fillRect(0, 0, 64, 64);       // 발광 없음
    for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
        const x = 6 + col * 32, y = 6 + row * 32;
        g.fillStyle = '#2b3a4a'; g.fillRect(x, y, 20, 22);   // 유리창
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, 20, 5); // 반사
        if (Math.random() < 0.55) { ge.fillStyle = '#fff'; ge.fillRect(x, y, 20, 22); } // 불 켜진 창
    }
    const map = new THREE.CanvasTexture(c), emap = new THREE.CanvasTexture(e);
    [map, emap].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
    return { map, emap };
}
const facadeSets = [makeFacadeTextures(), makeFacadeTextures(), makeFacadeTextures()];
const wallColors = [0x9aa3ad, 0x7d8794, 0xa89f94, 0x6f7b88, 0xb5b0a8, 0x8c96a3, 0x5f6b78];
const roofMat = new THREE.MeshStandardMaterial({ color: 0x55595f });
const buildingMatCache = {};

function makeBuilding(w, h, d) {
    const setIdx = Math.floor(Math.random() * facadeSets.length);
    const colorIdx = Math.floor(Math.random() * wallColors.length);
    // [최적화] 텍스처를 건물마다 복사하지 않고 3장만 공유: 창문 반복 횟수는 UV에 직접 반영
    const geo = new THREE.BoxGeometry(w, h, d);
    const rx = Math.max(1, Math.round(d / 7)), ry = Math.max(1, Math.round(h / 7)); // 창문 한 칸 = 약 3.5m
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry);
    // [최적화] 같은 무늬·색 건물끼리 재질 공유 (최대 3×7=21개)
    const key = setIdx + '_' + colorIdx;
    let side = buildingMatCache[key];
    if (!side) {
        side = new THREE.MeshStandardMaterial({
            color: wallColors[colorIdx], map: facadeSets[setIdx].map, roughness: 0.8,
            emissive: 0xffc46b, emissiveMap: facadeSets[setIdx].emap, emissiveIntensity: 0
        });
        buildingMatCache[key] = side; buildingMats.push(side);
    }
    // 박스 면 순서: +x, -x, +y, -y, +z, -z → 위/아래는 지붕색
    const b = new THREE.Mesh(geo, [side, side, roofMat, roofMat, side, side]);
    b.position.y = h / 2;
    return b;
}

// 인도 + 연석 (고정)
const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9a9a96 });
const curbMat = new THREE.MeshStandardMaterial({ color: 0xcfcfc8 });
[-1, 1].forEach(sd => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 900), sidewalkMat);
    sw.position.set(sd * (roadWidth/2 + 2.5), 0.15, -300); cityGroup.add(sw);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 900), curbMat);
    curb.position.set(sd * (roadWidth/2 + 0.2), 0.2, -300); cityGroup.add(curb);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 900), new THREE.MeshStandardMaterial({ color: 0x5c6066 }));
    ground.rotation.x = -Math.PI/2; ground.position.set(sd * (roadWidth/2 + 155), -0.02, -300); cityGroup.add(ground);
});

// 빼곡한 건물: 도로 쪽 앞줄(빈틈 거의 없음) + 뒷줄 고층
[-1, 1].forEach(sd => {
    let z = -400;
    while (z < 50) {
        const d = 9 + Math.random() * 5, w = 10 + Math.random() * 6, h = 22 + Math.random() * 45;
        const b = makeBuilding(w, h, d);
        b.position.set(sd * (roadWidth/2 + 5 + w/2), h/2, z + d/2);
        cityGroup.add(b); buildings.push(b);
        z += d + 0.6;
    }
    for (let z2 = -400; z2 < 50; z2 += 16) {
        const d = 12 + Math.random() * 4, w = 14, h = 60 + Math.random() * 70;
        const b = makeBuilding(w, h, d);
        b.position.set(sd * (roadWidth/2 + 26 + Math.random() * 6), h/2, z2);
        cityGroup.add(b); buildings.push(b);
    }
});

// 신호등 + 횡단보도 (도로 위로 팔이 뻗은 형태)
const poleMat = new THREE.MeshStandardMaterial({ color: 0x3b3f45, metalness: 0.5, roughness: 0.5 });
const housingMat = new THREE.MeshStandardMaterial({ color: 0x1b1d20 });
const lampOff = new THREE.MeshStandardMaterial({ color: 0x333333 });
const lampOn = {
    red: new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
    yellow: new THREE.MeshBasicMaterial({ color: 0xffc21a }),
    green: new THREE.MeshBasicMaterial({ color: 0x22e07a })
};
const zebraMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
const trafficLights = [];
// [수정] 신호등을 더 높이 달아서(7.2 → 10.4) 카메라 위로 지나가게, 가까이 오면 반투명(fadeTrafficLight)
const TL_POLE_H = 11.2, TL_ARM_Y = 11.0, TL_HOUSING_Y = 10.4;
function makeTrafficLight(sd) {
    const g = new THREE.Group();
    // 신호등마다 재질을 따로 둬야 가까운 것만 반투명하게 만들 수 있음
    const m = {
        pole: poleMat.clone(), housing: housingMat.clone(), off: lampOff.clone(),
        on: { red: lampOn.red.clone(), yellow: lampOn.yellow.clone(), green: lampOn.green.clone() }
    };
    const allMats = [m.pole, m.housing, m.off, m.on.red, m.on.yellow, m.on.green];
    allMats.forEach(x => { x.transparent = true; });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, TL_POLE_H, 8), m.pole);
    pole.position.set(sd * (roadWidth/2 + 1.2), TL_POLE_H / 2, 0); g.add(pole);
    const armLen = 9;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.25, 0.25), m.pole);
    arm.position.set(sd * (roadWidth/2 + 1.2 - armLen/2), TL_ARM_Y, 0); g.add(arm);
    // 가로형 신호등 (빨/노/초)
    const housing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 0.7), m.housing);
    const hx = sd * (roadWidth/2 + 1.2 - armLen + 1.8);
    housing.position.set(hx, TL_HOUSING_Y, 0); g.add(housing);
    const lamps = {};
    ['red', 'yellow', 'green'].forEach((k, i) => {
        const l = new THREE.Mesh(new THREE.CircleGeometry(0.38, 12), m.off);
        l.position.set(hx + (i - 1) * 1.0, TL_HOUSING_Y, 0.36); g.add(l); lamps[k] = l;
    });
    // 보행자 신호등 기둥 꼭대기 작은 박스
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.5), m.housing);
    ped.position.set(sd * (roadWidth/2 + 1.2), 3.2, 0.4); g.add(ped);
    const tl = { group: g, lamps, mats: m, allMats, glowMats: [], alpha: 1, state: ['red', 'yellow', 'green'][Math.floor(Math.random()*3)], timer: Math.random() * 3 };
    setLight(tl);
    trafficLights.push(tl);
    return g;
}
function setLight(tl) {
    Object.entries(tl.lamps).forEach(([k, m]) => { m.material = (k === tl.state) ? tl.mats.on[k] : tl.mats.off; if (m.userData.glow) m.userData.glow.visible = (k === tl.state); });
}
// 카메라 쪽으로 다가올수록 서서히 반투명 (z -40에서 시작 → z -14에서 35%)
function fadeTrafficLight(tl, z) {
    const a = z < -40 ? 1 : z > -14 ? 0.35 : 1 - 0.65 * (z + 40) / 26;
    if (Math.abs(a - tl.alpha) < 0.01) return;
    tl.alpha = a;
    tl.allMats.forEach(x => { x.opacity = a; x.depthWrite = a > 0.99; });
    tl.glowMats.forEach(x => { x.opacity = a; });
}
function tickTrafficLights(dt) {
    trafficLights.forEach(tl => {
        tl.timer -= dt;
        if (tl.timer <= 0) {
            tl.state = tl.state === 'green' ? 'yellow' : tl.state === 'yellow' ? 'red' : 'green';
            tl.timer = tl.state === 'yellow' ? 1 : 3 + Math.random() * 2;
            setLight(tl);
        }
    });
}
for (let z = -400, k = 0; z < 50; z += 75, k++) {
    const cross = new THREE.Group();
    cross.add(makeTrafficLight(k % 2 ? 1 : -1)); // 좌우 번갈아
    for (let i = 0; i < 8; i++) { // 횡단보도 줄무늬
        const st = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 4), zebraMat);
        st.rotation.x = -Math.PI/2; st.position.set(-roadWidth/2 + 1.5 + i * 3, 0.06, -4);
        cross.add(st);
    }
    cross.position.z = z;
    cityGroup.add(cross); buildings.push(cross);
}

// 가로등
const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffd27a, emissiveIntensity: 0 });
for (let z = -400; z < 50; z += 30) {
    [-1, 1].forEach(sd => {
        const g = new THREE.Group();
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 6, 6), poleMat);
        p.position.set(sd * (roadWidth/2 + 3.8), 3, 0);
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.6), lampHeadMat);
        head.position.set(sd * (roadWidth/2 + 3.1), 6, 0);
        g.add(p, head); g.position.z = z + (sd === 1 ? 15 : 0);
        cityGroup.add(g); buildings.push(g);
    });
}

// 퇴근길 은행나무 가로수 (퇴근길에만 보임 · 가로등 사이에 드문드문 · 횡단보도 근처는 비움)
//  노란 잎 덩어리 2개 + 줄기 + 발밑 은행잎 깔림. 바퀴 뒤로 날리는 낙엽(11-effects.js)과 짝
const ginkgoGroup = new THREE.Group(); ginkgoGroup.visible = false; cityGroup.add(ginkgoGroup);
const streetTrees = [];
const ginkgoTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.9 });
const ginkgoLeafMats = [0xf2c230, 0xe9b01f, 0xf6d14e].map(c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.12, flatShading: true, roughness: 0.85 }));   // 살짝 스스로 빛나게: 노을 아래서도 노랗게
const ginkgoCarpetMat = new THREE.MeshStandardMaterial({ color: 0xe0ac2a, roughness: 1 });
const ginkgoPitMat = new THREE.MeshStandardMaterial({ color: 0x3a3029, roughness: 1 });
function makeGinkgo() {
    const t = new THREE.Group(), s = 0.9 + Math.random() * 0.25;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 3.4 * s, 6), ginkgoTrunkMat);
    trunk.position.y = 1.7 * s + 0.3; t.add(trunk);
    const leaf = ginkgoLeafMats[Math.floor(Math.random() * 3)];
    const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45 * s, 0), leaf);   // 위로 길쭉한 은행나무 수형
    c1.scale.set(1, 1.35, 1); c1.position.y = 4.6 * s + 0.3; c1.rotation.y = Math.random() * 6.28; t.add(c1);
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0 * s, 0), ginkgoLeafMats[(ginkgoLeafMats.indexOf(leaf) + 1) % 3]);
    c2.position.set(0.25, 6.3 * s + 0.3, -0.1); t.add(c2);
    const carpet = new THREE.Mesh(new THREE.CircleGeometry(1.5, 7), ginkgoCarpetMat);   // 발밑에 떨어진 은행잎
    carpet.rotation.x = -Math.PI / 2; carpet.rotation.z = Math.random() * 6.28; carpet.position.y = 0.31; t.add(carpet);
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), ginkgoPitMat);
    pit.rotation.x = -Math.PI / 2; pit.position.y = 0.32; t.add(pit);
    return t;
}
[-1, 1].forEach(sd => {
    for (let z = -400 + (sd === 1 ? 0 : 15); z < 50; z += 30) {
        if (((z + 400) % 75 + 75) % 75 < 8 || ((z + 400) % 75 + 75) % 75 > 70) continue;   // 횡단보도·신호등 자리 비움
        const t = makeGinkgo(); t.position.set(sd * (roadWidth / 2 + 2.3), 0, z + (Math.random() - 0.5) * 3);
        ginkgoGroup.add(t); streetTrees.push(t);
    }
});

// 퇴근길 노을 해
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(28, 24, 16), new THREE.MeshBasicMaterial({ color: 0xff8a3d, fog: false }));
sunMesh.position.set(0, 34, -560); sunMesh.visible = false; scene.add(sunMesh);




/* ---------- 소풍길 자연 배경 (나무·산·강·꽃) ---------- */
const natureGroup = new THREE.Group(); natureGroup.visible = false; scene.add(natureGroup);
const natureScrollers = []; // 도로와 함께 흘러가는 오브젝트

// 잔디 바닥 (도로 양옆)
const grassMat = new THREE.MeshStandardMaterial({ color: 0x7ccf5a });
[-1, 1].forEach(side => {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(300, 900), grassMat);
    g.rotation.x = -Math.PI/2; g.position.set(side * (roadWidth/2 + 150), -0.02, -300);
    natureGroup.add(g);
});
// 강 (오른쪽, 도로와 나란히) + 강둑 모래
const sand = new THREE.Mesh(new THREE.PlaneGeometry(18, 900), new THREE.MeshStandardMaterial({ color: 0xe8d9a0 }));
sand.rotation.x = -Math.PI/2; sand.position.set(27, 0.0, -300); natureGroup.add(sand);
const river = new THREE.Mesh(new THREE.PlaneGeometry(13, 900), new THREE.MeshStandardMaterial({ color: 0x3fa9f5, roughness: 0.1, metalness: 0.3 }));
river.rotation.x = -Math.PI/2; river.position.set(27, 0.03, -300); natureGroup.add(river);
// 물결 반짝임 (흘러감)
const rippleMat = new THREE.MeshBasicMaterial({ color: 0xdff4ff });
for (let z = -400; z < 50; z += 18) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(1.5 + Math.random()*2, 0.25), rippleMat);
    r.rotation.x = -Math.PI/2; r.position.set(22 + Math.random()*10, 0.06, z);
    natureGroup.add(r); natureScrollers.push(r);
}

// 산 (멀리, 고정 — 멀어서 움직임이 거의 없어 보임)
const mountainMats = [0x6aa46a, 0x7fb48a, 0x5d9470].map(c => new THREE.MeshStandardMaterial({ color: c, flatShading: true }));
const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    const h = 50 + Math.random() * 70, r = 40 + Math.random() * 40;
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mountainMats[i % 3]);
    const x = side * (70 + Math.random() * 100), z = -230 - Math.random() * 110;
    m.position.set(x, h/2 - 2, z); natureGroup.add(m);
    if (h > 85) { // 높은 산엔 눈 덮인 봉우리
        const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.28, h * 0.28, 6), snowMat);
        cap.position.set(x, h - h*0.14 - 2 + 0.3, z); natureGroup.add(cap);
    }
}

// 나무 (침엽수 + 둥근 활엽수)
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
const leafMats = [0x2f8f3a, 0x3fae4a, 0x58c45a].map(c => new THREE.MeshStandardMaterial({ color: c, flatShading: true }));
function makeTree() {
    const t = new THREE.Group();
    const s = 0.8 + Math.random() * 0.8;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35*s, 0.45*s, 3*s, 6), trunkMat);
    trunk.position.y = 1.5*s; t.add(trunk);
    const leaf = leafMats[Math.floor(Math.random()*3)];
    if (Math.random() < 0.5) {
        [0, 1.6, 3.0].forEach((y, k) => {
            const c = new THREE.Mesh(new THREE.ConeGeometry((2.6 - k*0.6)*s, 3*s, 7), leaf);
            c.position.y = (3.5 + y)*s; t.add(c);
        });
    } else {
        const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4*s, 0), leaf);
        ball.position.y = 4.5*s; t.add(ball);
    }
    return t;
}
for (let z = -400; z < 50; z += 9) {
    // 왼쪽 숲
    for (let k = 0; k < 2; k++) {
        const t = makeTree(); t.position.set(-(17 + Math.random()*28), 0, z + Math.random()*8);
        natureGroup.add(t); natureScrollers.push(t);
    }
    // 강 건너편 나무
    if (Math.random() < 0.7) {
        const t = makeTree(); t.position.set(38 + Math.random()*20, 0, z + Math.random()*8);
        natureGroup.add(t); natureScrollers.push(t);
    }
}

// 꽃 (도로 가장자리 + 들판)
const petalColors = [0xff5fa2, 0xffd84a, 0xffffff, 0xff7b54, 0xb388ff];
const petalMats = petalColors.map(c => new THREE.MeshStandardMaterial({ color: c }));
const stemMat = new THREE.MeshStandardMaterial({ color: 0x3a8f2f });
const petalGeo = new THREE.SphereGeometry(0.35, 6, 5);
const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 4);
for (let z = -400; z < 50; z += 3) {
    [-1, 1].forEach(side => {
        if (side === 1 && Math.random() < 0.4) return; // 오른쪽은 강 쪽이라 조금 적게
        const f = new THREE.Group();
        const stem = new THREE.Mesh(stemGeo, stemMat); stem.position.y = 0.3;
        const head = new THREE.Mesh(petalGeo, petalMats[Math.floor(Math.random()*petalMats.length)]); head.position.y = 0.7;
        f.add(stem, head);
        const x = side === -1 ? -(13 + Math.random()*4) : (13 + Math.random()*4);
        f.position.set(x, 0, z + Math.random()*3);
        natureGroup.add(f); natureScrollers.push(f);
    });
}

/* ---------- 소풍길 소품: 삼각 깃발 줄 · 공항 이정표 · 철길 건널목 ---------- */
// (1) 삼각 깃발 줄: 도로 위 높이 걸린 장식 (움직이지 않아서 배경 덩어리에 합쳐짐)
const flagMats = [0xef4444, 0xf59e0b, 0x22c55e, 0x3b82f6, 0xec4899, 0xffffff].map(c => new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.8 }));
const ropeMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.9 });
const woodPoleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
const flagShape = new THREE.Shape(); flagShape.moveTo(-0.45, 0); flagShape.lineTo(0.45, 0); flagShape.lineTo(0, -1.15); flagShape.lineTo(-0.45, 0);
const flagGeo = new THREE.ShapeGeometry(flagShape);
const ROPE_Y = 12, ROPE_SAG = 1.6, ROPE_HALF = 14;
const ropeY = x => ROPE_Y - ROPE_SAG * (1 - (x / ROPE_HALF) ** 2);
for (let z = -380, k = 0; z < 50; z += 90, k++) {
    const g = new THREE.Group();
    [-1, 1].forEach(sd => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, ROPE_Y, 8), woodPoleMat);
        pole.position.set(sd * ROPE_HALF, ROPE_Y / 2, 0); g.add(pole);
    });
    for (let i = 0; i < 16; i++) {          // 축 늘어진 줄
        const x0 = -ROPE_HALF + i * (2 * ROPE_HALF / 16), x1 = x0 + 2 * ROPE_HALF / 16;
        const a = new THREE.Vector3(x0, ropeY(x0), 0), b = new THREE.Vector3(x1, ropeY(x1), 0);
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, a.distanceTo(b), 4), ropeMat);
        seg.position.copy(a).add(b).multiplyScalar(0.5);
        seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        g.add(seg);
    }
    for (let x = -12.6, i = 0; x <= 12.7; x += 1.8, i++) {   // 알록달록 삼각 깃발
        const f = new THREE.Mesh(flagGeo, flagMats[(i + k) % flagMats.length]);
        f.position.set(x, ropeY(x), 0); f.rotation.z = (x / ROPE_HALF) * 0.12;
        g.add(f);
    }
    g.position.z = z;
    natureGroup.add(g); natureScrollers.push(g);
}

// 움직이는(불빛·글자가 바뀌는) 소품은 따로 흘려보냄
const natureMovers = [];

// (2) 공항 이정표: 남은 시간에 맞춰 거리가 줄어듦 (60초 = 도착)
const AIRPORT_KM = 4.8;
const signCanvas = document.createElement('canvas'); signCanvas.width = 512; signCanvas.height = 256;
const signTex = new THREE.CanvasTexture(signCanvas);
const signMat = new THREE.MeshBasicMaterial({ map: signTex });
let signShown = null;
function drawAirportSign(km) {
    const g = signCanvas.getContext('2d'), W = 512, H = 256;
    g.fillStyle = '#0b6b3a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(12, 12, W - 24, H - 24);
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle';
    g.font = "900 64px var(--fb),'Apple SD Gothic Neo','Malgun Gothic',sans-serif"; g.textAlign = 'left';
    g.fillText('✈ 공항', 40, 86);
    g.font = "700 30px var(--fb),'Apple SD Gothic Neo','Malgun Gothic',sans-serif";
    g.fillStyle = '#d1fae5'; g.fillText('AIRPORT', 46, 150);
    g.fillStyle = km <= 1 ? '#fde047' : '#ffffff';
    g.font = "900 78px var(--fb),'Apple SD Gothic Neo','Malgun Gothic',sans-serif"; g.textAlign = 'right';
    g.fillText(km.toFixed(1), W - 110, 128);
    g.font = "700 40px var(--fb),'Apple SD Gothic Neo','Malgun Gothic',sans-serif"; g.fillText('km', W - 40, 142);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(W / 2 - 22, 220); g.lineTo(W / 2 + 22, 220); g.lineTo(W / 2, 196); g.fill();   // 직진 화살표
    g.fillRect(W / 2 - 7, 218, 14, 22);
    signTex.needsUpdate = true;
}
function updateAirportSign() {
    const km = Math.max(0, Math.round((60 - Math.min(60, gameTime)) / 60 * AIRPORT_KM * 10) / 10);
    if (km !== signShown) { signShown = km; drawAirportSign(km); }
}
drawAirportSign(AIRPORT_KM); signShown = AIRPORT_KM;
const signPostMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.5, roughness: 0.4 });
[-155, -335].forEach(z => {   // 깃발 줄(-380, -290, -200, -110, -20)·건널목(-245)과 겹치지 않는 위치
    const g = new THREE.Group();
    // 세로 화면에서도 보이도록 도로 바로 옆에, 도로 쪽으로 살짝 돌려서
    const sg = new THREE.Group(); sg.position.set(14.6, 0, 0); sg.rotation.y = -0.35; g.add(sg);
    [-3.0, 3.0].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 7.2, 8), signPostMat); p.position.set(x, 3.6, 0); sg.add(p); });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3.8), signMat); board.position.set(0, 6.0, 0.16); sg.add(board);
    const back = new THREE.Mesh(new THREE.BoxGeometry(7.8, 4.0, 0.25), signPostMat); back.position.set(0, 6.0, 0); sg.add(back);
    g.position.z = z; natureGroup.add(g); natureMovers.push(g);
});

// (3) 철길 건널목: 빨간 불 두 개가 번갈아 깜빡이고 가까우면 "땡땡" 소리
const railLamps = [];          // [왼쪽불, 오른쪽불] 쌍 목록
const railOn = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const railOff = new THREE.MeshStandardMaterial({ color: 0x3a0d0d });
let railBlink = 0, railPhase = 0, railGroup = null;
{
    const g = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0x8a8f98, metalness: 0.8, roughness: 0.35 });
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 1 });
    const gravelMat = new THREE.MeshStandardMaterial({ color: 0x8d8a84, roughness: 1 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    // 자갈길 + 침목 + 레일 (도로 위는 레일만 납작하게)
    [[-46, -13], [13, 19]].forEach(([x0, x1]) => {
        const gr = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.1, 3.6), gravelMat); gr.position.set((x0 + x1) / 2, 0.05, 0); g.add(gr);
        for (let x = x0 + 0.5; x < x1; x += 1.3) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 3.0), sleeperMat); sl.position.set(x, 0.14, 0); g.add(sl); }
    });
    [-0.75, 0.75].forEach(zz => { const r = new THREE.Mesh(new THREE.BoxGeometry(65, 0.14, 0.18), steel); r.position.set(-13.5, 0.2, zz); g.add(r); });
    // 양쪽 건널목 신호기
    [-1, 1].forEach(sd => {
        const x = sd * 13.8;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 5.6, 8), whiteMat); post.position.set(x, 2.8, 0.9 * sd); g.add(post);
        // X자 표지판 (흰 바탕 + 빨간 줄)
        [Math.PI / 4, -Math.PI / 4].forEach(rz => {
            const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.38, 0.08), whiteMat); b.position.set(x, 5.1, 0.9 * sd + 0.1); b.rotation.z = rz; g.add(b);
            const s = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.1, 0.1), redMat); s.position.copy(b.position); s.position.z += 0.02; s.rotation.z = rz; g.add(s);
        });
        // 경고등 두 개
        const bar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 0.2), blackMat); bar.position.set(x, 3.7, 0.9 * sd + 0.12); g.add(bar);
        const pair = [-1, 1].map(lr => {
            const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.25, 16), blackMat); hood.rotation.x = Math.PI / 2; hood.position.set(x + lr * 0.85, 3.7, 0.9 * sd + 0.2); g.add(hood);
            const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), railOff); lamp.position.set(x + lr * 0.85, 3.7, 0.9 * sd + 0.34); g.add(lamp);
            return lamp;
        });
        railLamps.push(pair);
        // 올라가 있는 차단기 (빨강·흰색 줄무늬)
        for (let i = 0; i < 6; i++) {
            const seg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.22), i % 2 ? whiteMat : redMat);
            seg.position.set(x + sd * 1.0, 1.4 + i * 1.0, 0.9 * sd - 0.5 * sd); g.add(seg);
        }
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), whiteMat); box.position.set(x + sd * 1.0, 0.7, 0.4 * sd); g.add(box);
    });
    g.position.z = -245; natureGroup.add(g); natureMovers.push(g); railGroup = g;
}
function playDing(vol) {
    if (!actx || isMuted || vol <= 0) return;
    const t = actx.currentTime;
    [[1240, 1], [1860, 0.45]].forEach(([f, k]) => {
        const o = actx.createOscillator(), gg = actx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(vol * k, t + 0.005); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(gg); gg.connect(masterGain); o.start(t); o.stop(t + 0.4);
    });
}
function tickRailCrossing(dt) {
    railBlink -= dt;
    if (railBlink > 0) return;
    railBlink = 0.5; railPhase ^= 1;
    railLamps.forEach(([l, r]) => {
        l.material = railPhase ? railOn : railOff; r.material = railPhase ? railOff : railOn;
        if (l.userData.glow) { l.userData.glow.visible = !!railPhase; r.userData.glow.visible = !railPhase; }
    });
    // 가까이 오면 "땡땡" (내 차 쪽으로 140m 안)
    if (gameState === 'PLAYING' && railGroup) {
        const z = railGroup.position.z;
        if (z > -140 && z < 12) playDing(0.04 + 0.12 * (1 - Math.min(1, Math.abs(z) / 140)));
    }
}

// 배경 스크롤 (도시/자연 공통)
function scrollEnvironment(dist) {
    if (cityGroup.visible) tickTrafficLights(1/60);
    if (cityStrips) {
        cityScroll += dist; placeStrips(cityStrips, cityScroll); if (treeStrips) placeStrips(treeStrips, cityScroll);
        crossings.forEach(b => { b.position.z += dist; if (b.position.z > 50) b.position.z -= 450; if (b.userData.tl) fadeTrafficLight(b.userData.tl, b.position.z); });
        if (natureGroup.visible) { natureScroll += dist; placeStrips(natureStrips, natureScroll); scrollNatureMovers(dist); }
        return;
    }
    buildings.concat(streetTrees).forEach(b => { b.position.z += dist; if (b.position.z > 50) b.position.z -= 450; });
    if (natureGroup.visible) { natureScrollers.forEach(o => { o.position.z += dist; if (o.position.z > 50) o.position.z -= 450; }); scrollNatureMovers(dist); }
}
function scrollNatureMovers(dist) {
    natureMovers.forEach(o => { o.position.z += dist; if (o.position.z > 50) o.position.z -= 450; });
    tickRailCrossing(1 / 60);
    updateAirportSign();
}

