/* 10-destination.js — 60초 도착 목적지(회사·집·비행기) · 주행 중 처리
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   60초 도착 목적지: 회사(출근길) / 우리집(퇴근길) / 비행기(소풍길)
   앞면이 +z(플레이어 쪽)를 향함
   ========================================== */
function makeTextTexture(text, opts = {}) {
    const w = opts.w || 512, h = opts.h || 128;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = opts.bg || '#111'; g.fillRect(0, 0, w, h);
    if (opts.border) { g.strokeStyle = opts.border; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); }
    g.fillStyle = opts.color || '#fff';
    g.font = `900 ${opts.size || 64}px var(--fb), 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
    return new THREE.CanvasTexture(c);
}
function makeClockTexture(hour, minute) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#fdfaf2'; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
    g.lineWidth = 10; g.strokeStyle = '#1f2937'; g.stroke();
    g.fillStyle = '#1f2937';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillRect(128 + Math.sin(a) * 96 - 4, 128 - Math.cos(a) * 96 - 10, 8, 20); }
    const hand = (ang, len, wid, col) => { g.save(); g.translate(128, 128); g.rotate(ang); g.fillStyle = col; g.fillRect(-wid / 2, -len, wid, len + 12); g.restore(); };
    hand((hour % 12 + minute / 60) * Math.PI / 6, 62, 12, '#1f2937');
    hand(minute * Math.PI / 30, 92, 7, '#1f2937');
    g.fillStyle = '#dc2626'; g.beginPath(); g.arc(128, 128, 10, 0, Math.PI * 2); g.fill();
    return new THREE.CanvasTexture(c);
}
const std = (color, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color }, extra));
function addBox(parent, w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m;
}

// ---- 출근길: 회사 본사 빌딩 ----
function buildOffice() {
    const g = new THREE.Group();
    const glass = std(0x7fa7d6, { metalness: 0.85, roughness: 0.12, emissive: 0x0b1a2e });
    const frame = std(0xd9dde3, { metalness: 0.6, roughness: 0.35 });
    const stone = std(0xb9b2a6, { roughness: 0.8 });
    const dark = std(0x1f2933);
    // 광장 바닥
    addBox(g, 60, 0.2, 24, std(0xcfc8bb), 0, 0.1, 6);
    // 저층부(포디움) + 로비 유리
    addBox(g, 40, 9, 18, stone, 0, 4.5, -9);
    addBox(g, 22, 7, 0.3, glass, 0, 3.8, 0.05);
    for (let i = -5; i <= 5; i++) addBox(g, 0.35, 7.4, 0.5, frame, i * 2.2, 3.8, 0.2);
    // 입구 캐노피 + 기둥 + 회전문
    addBox(g, 16, 0.5, 6, frame, 0, 7.6, 2.6);
    [-7, 7].forEach(x => addBox(g, 0.5, 7.4, 0.5, frame, x, 3.7, 5.3));
    const door = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 5.5, 20, 1, true), std(0xa9c6e8, { metalness: 0.7, roughness: 0.1, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    door.position.set(0, 2.75, 1.4); g.add(door);
    addBox(g, 4.1, 0.3, 4.1, frame, 0, 5.6, 1.4);
    // 메인 타워 (유리 커튼월 + 세로 멀리언 + 층 띠)
    const towerH = 70, tw = 26, td = 14;
    addBox(g, tw, towerH, td, glass, 0, 9 + towerH / 2, -10);
    for (let i = 0; i <= 13; i++) addBox(g, 0.35, towerH, 0.4, frame, -tw / 2 + i * (tw / 13), 9 + towerH / 2, -10 + td / 2 + 0.1);
    for (let y = 12; y < 9 + towerH; y += 4) addBox(g, tw + 0.2, 0.45, td + 0.2, frame, 0, y, -10);
    // 옥상 왕관 + 안테나 + 항공등
    addBox(g, tw - 4, 5, td - 3, dark, 0, 9 + towerH + 2.5, -10);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 16, 8), frame); ant.position.set(4, 9 + towerH + 13, -10); g.add(ant);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3030 })); beacon.position.set(4, 9 + towerH + 21.3, -10); g.add(beacon);
    // 회사 간판 + 9시 시계
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(18, 3.6), new THREE.MeshBasicMaterial({ map: makeTextTexture('㈜ 정시상사', { bg: '#0f172a', color: '#e2e8f0', border: '#94a3b8' }) }));
    sign.position.set(0, 9 + towerH + 2.5, -10 + (td - 3) / 2 + 0.05); g.add(sign);
    const clock = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.MeshBasicMaterial({ map: makeClockTexture(9, 0) }));
    clock.position.set(0, 13.5, -0.85); g.add(clock);
    const clockRim = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.3, 8, 40), frame); clockRim.position.copy(clock.position); g.add(clockRim);
    addBox(g, 10, 2, 0.2, stone, 0, 8.6, 0.0); // 시계 아래 석재 띠
    // 국기 게양대 3개 + 화단
    const flagCols = [0x1d4ed8, 0xffffff, 0x059669];
    [-18, -15, -12].forEach((x, i) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 12, 6), frame); pole.position.set(x, 6, 10); g.add(pole);
        addBox(g, 2.6, 1.6, 0.05, std(flagCols[i], { side: THREE.DoubleSide }), x + 1.35, 11, 10);
    });
    [-14, 14].forEach(x => { addBox(g, 8, 1, 3, stone, x, 0.7, 12); addBox(g, 7.4, 0.8, 2.4, std(0x3f8f3f), x, 1.4, 12); });
    return g;
}

// ---- 퇴근길: 우리집 (2층 단독주택) ----
function buildHouse() {
    const g = new THREE.Group();
    const wall = std(0xf3e6cf, { roughness: 0.9 });
    const trim = std(0xffffff, { roughness: 0.6 });
    const roofMat = std(0x8a3b2e, { roughness: 0.7, flatShading: true });
    const lit = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb347, emissiveIntensity: 0.9 });
    const wood = std(0x6b4226);
    // 잔디 마당 + 진입로
    addBox(g, 50, 0.2, 26, std(0x5f9e4a), 0, 0.1, 4);
    addBox(g, 5, 0.25, 14, std(0xc9c2b5), 0, 0.15, 10);
    // 본채 2층
    const W = 22, H = 13, D = 14;
    addBox(g, W, H, D, wall, 0, H / 2, -7);
    addBox(g, W + 0.4, 0.5, D + 0.4, trim, 0, 6.5, -7);       // 층 구분 몰딩
    // 박공 지붕 (삼각기둥)
    const roofShape = new THREE.Shape(); roofShape.moveTo(-W / 2 - 1.2, 0); roofShape.lineTo(W / 2 + 1.2, 0); roofShape.lineTo(0, 7); roofShape.lineTo(-W / 2 - 1.2, 0);
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: D + 2, bevelEnabled: false }), roofMat);
    roof.position.set(0, H, -7 - (D + 2) / 2); g.add(roof);
    // 지붕 안쪽 박공벽 (벽색)
    const gableShape = new THREE.Shape(); gableShape.moveTo(-W / 2, 0); gableShape.lineTo(W / 2, 0); gableShape.lineTo(0, 6); gableShape.lineTo(-W / 2, 0);
    const gable = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), wall); gable.position.set(0, H, -7 + D / 2 + 0.02); g.add(gable);
    const atticWin = new THREE.Mesh(new THREE.CircleGeometry(1.2, 20), lit); atticWin.position.set(0, H + 2.4, -7 + D / 2 + 0.05); g.add(atticWin);
    // 굴뚝
    addBox(g, 2, 6, 2, std(0x9a5a44), 6.5, H + 5, -9);
    addBox(g, 2.4, 0.4, 2.4, std(0x5c3a2e), 6.5, H + 8.1, -9);
    // 창문 (불 켜짐) + 창틀 + 덧문
    const win = (x, y) => {
        addBox(g, 3.2, 3.2, 0.3, trim, x, y, -7 + D / 2 + 0.05);
        addBox(g, 2.6, 2.6, 0.35, lit, x, y, -7 + D / 2 + 0.08);
        addBox(g, 0.18, 2.6, 0.4, trim, x, y, -7 + D / 2 + 0.12);
        addBox(g, 2.6, 0.18, 0.4, trim, x, y, -7 + D / 2 + 0.12);
        [-1, 1].forEach(sd => addBox(g, 1.1, 3.2, 0.2, std(0x2f5d50), x + sd * 2.2, y, -7 + D / 2 + 0.1));
    };
    [-7, 7].forEach(x => { win(x, 3.6); win(x, 9.8); }); win(0, 9.8);
    // 현관: 문 + 손잡이 + 포치 지붕 + 기둥 + 계단 + 현관등
    addBox(g, 3, 5, 0.4, wood, 0, 2.8, -7 + D / 2 + 0.1);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), std(0xd4af37, { metalness: 1 })); knob.position.set(1, 2.8, -7 + D / 2 + 0.4); g.add(knob);
    addBox(g, 8, 0.5, 4, trim, 0, 6, -7 + D / 2 + 2);
    [-3.6, 3.6].forEach(x => addBox(g, 0.4, 5.6, 0.4, trim, x, 3, -7 + D / 2 + 3.7));
    addBox(g, 7, 0.4, 2.5, std(0xa8a29e), 0, 0.3, -7 + D / 2 + 1.5);
    const porchLight = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a8 })); porchLight.position.set(2.3, 4.8, -7 + D / 2 + 0.4); g.add(porchLight);
    const pl = new THREE.PointLight(0xffb85c, 1.2, 18); pl.position.set(0, 4.5, -7 + D / 2 + 2); g.add(pl);
    // 차고 (옆 건물)
    addBox(g, 10, 7, 12, wall, -16, 3.5, -6);
    addBox(g, 11, 0.6, 13, roofMat, -16, 7.2, -6);
    addBox(g, 7.5, 5, 0.3, std(0xe5e5e5), -16, 2.6, 0.1);
    for (let y = 0.8; y < 5; y += 1) addBox(g, 7.5, 0.08, 0.35, std(0xbdbdbd), -16, y, 0.15);
    // 울타리 + 우편함 + 나무·화단
    for (let x = -24; x <= 24; x += 1.5) { if (Math.abs(x) < 3.5) continue; addBox(g, 0.3, 2, 0.3, trim, x, 1, 16); }
    [-1, 1].forEach(sd => addBox(g, 21, 0.25, 0.2, trim, sd * 13.5, 1.6, 16));
    addBox(g, 0.25, 3, 0.25, wood, 4.5, 1.5, 15.5); addBox(g, 1.2, 0.9, 1.6, std(0xc0392b), 4.5, 3.3, 15.5);
    [[12, 4], [-20, 8], [18, 10]].forEach(([x, z]) => {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 4, 8), wood); t.position.set(x, 2, z); g.add(t);
        const l = new THREE.Mesh(new THREE.IcosahedronGeometry(3, 1), std(0x2f7d32, { flatShading: true })); l.position.set(x, 5.5, z); g.add(l);
    });
    [[-7, 1.5], [7, 1.5]].forEach(([x, z]) => {
        addBox(g, 5, 0.8, 1.5, std(0x3f7a35), x, 0.5, -7 + D / 2 + z);
        [-1.6, 0, 1.6].forEach(dx => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), std([0xff6fa8, 0xffd84a, 0xff7b54][Math.abs(dx * 10) % 3 | 0])); f.position.set(x + dx, 1.1, -7 + D / 2 + z); g.add(f); });
    });
    return g;
}

// ---- 소풍길: 여객기 (기수가 플레이어 쪽) + 활주로 ----
function buildAirplane() {
    const g = new THREE.Group();
    const white = std(0xf7f8fa, { metalness: 0.3, roughness: 0.35 });
    const grey = std(0xb8bec7, { metalness: 0.6, roughness: 0.3 });
    const navy = std(0x1e3a8a, { roughness: 0.4 });
    const accent = std(0xf59e0b, { roughness: 0.4 });
    const glassM = std(0x0f172a, { metalness: 0.8, roughness: 0.1 });
    // 활주로 + 중앙선 + 유도등
    addBox(g, 60, 0.15, 90, std(0x2f3237), 0, 0.08, -30);
    for (let z = 10; z > -75; z -= 8) addBox(g, 0.8, 0.05, 4, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 0.2, z);
    [-29, 29].forEach(x => { for (let z = 12; z > -75; z -= 6) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 4), new THREE.MeshBasicMaterial({ color: 0x60a5fa })); l.position.set(x, 0.4, z); g.add(l); } });
    const plane = new THREE.Group(); g.add(plane);
    plane.rotation.y = -0.55; plane.position.x = 4; // 비스듬히 세워 옆모습·날개가 보이게
    const R = 3.2, L = 34, Y = 6.5, noseZ = 0;          // 동체 반지름/길이/높이
    const bodyZ = noseZ - 4 - L / 2;
    // 동체 + 기수(둥근 앞) + 꼬리 원뿔
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 28), white); body.rotation.x = Math.PI / 2; body.position.set(0, Y, bodyZ); plane.add(body);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20), white);
    nose.scale.set(1, 0.95, 1.7); nose.position.set(0, Y - 0.1, bodyZ + L / 2); plane.add(nose);
    const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(R, 0.6, 9, 28), white); tailCone.rotation.x = -Math.PI / 2; tailCone.position.set(0, Y + 0.9, bodyZ - L / 2 - 4.5); plane.add(tailCone);
    // 동체 도장: 아래 남색 띠 + 주황 라인
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, L, 28, 1, true, Math.PI * 0.65, Math.PI * 0.7), navy);
    belly.rotation.x = Math.PI / 2; belly.position.copy(body.position); plane.add(belly);
    [-1, 1].forEach(sd => addBox(plane, 0.08, 0.35, L, accent, sd * (R - 0.25), Y - 0.9, bodyZ));
    // 조종석 창문 (기수 앞 위쪽)
    [-1.5, -0.5, 0.5, 1.5].forEach(x => {
        const w = addBox(plane, 0.85, 0.55, 0.15, glassM, x, Y + 1.85, bodyZ + L / 2 + 3.25 - Math.abs(x) * 0.45);
        w.rotation.x = -0.75; w.rotation.y = -x * 0.3;
    });
    // 객실 창문 줄
    [-1, 1].forEach(sd => { for (let z = bodyZ + L / 2 - 4; z > bodyZ - L / 2 + 2; z -= 1.3) addBox(plane, 0.1, 0.55, 0.4, glassM, sd * (R - 0.05), Y + 0.9, z); });
    // 주날개 (뒤로 젖힌 형태) + 윙렛
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0); wingShape.lineTo(18, -9); wingShape.lineTo(18, -11.5); wingShape.lineTo(0, -8); wingShape.lineTo(0, 0);
    [-1, 1].forEach(sd => {
        const wing = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape, { depth: 0.5, bevelEnabled: false }), grey);
        wing.rotation.x = Math.PI / 2; wing.scale.x = sd; wing.position.set(sd * (R - 0.5), Y - 1.2, bodyZ + 6);
        wing.rotation.z = 0; plane.add(wing);
        const winglet = addBox(plane, 0.3, 2.8, 2.2, navy, sd * (R - 0.5 + 18), Y + 0.1, bodyZ + 6 - 10.3); winglet.rotation.x = -0.3;
        // 엔진 (나셀 + 흡입구 + 팬) + 파일론
        const ex = sd * 8, ez = bodyZ + 6 - 1;
        const nac = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.25, 5.5, 22), grey); nac.rotation.x = Math.PI / 2; nac.position.set(ex, Y - 3.2, ez); plane.add(nac);
        const lip = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.18, 8, 22), white); lip.position.set(ex, Y - 3.2, ez + 2.75); plane.add(lip);
        const fan = new THREE.Mesh(new THREE.CircleGeometry(1.3, 22), std(0x30343a, { metalness: 0.8 })); fan.position.set(ex, Y - 3.2, ez + 2.7); plane.add(fan);
        const spin = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 12), white); spin.rotation.x = Math.PI / 2; spin.position.set(ex, Y - 3.2, ez + 3.0); plane.add(spin);
        addBox(plane, 0.4, 1.8, 3, grey, ex, Y - 1.9, ez - 0.5);
    });
    // 수직 꼬리날개 (남색 + 로고 원)
    const finShape = new THREE.Shape(); finShape.moveTo(0, 0); finShape.lineTo(-7, 0); finShape.lineTo(-10, 9); finShape.lineTo(-6.5, 9); finShape.lineTo(0, 0);
    const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.5, bevelEnabled: false }), navy);
    fin.rotation.y = -Math.PI / 2; fin.position.set(0.25, Y + R - 0.6, bodyZ - L / 2 + 2); plane.add(fin); // 뒤로 젖혀진 꼬리날개
    [-1, 1].forEach(sd => {
        const logo = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), accent); logo.position.set(sd * 0.3, Y + R + 4.8, bodyZ - L / 2 - 4.5); logo.rotation.y = sd * Math.PI / 2; plane.add(logo);
        // 수평 꼬리날개
        const hs = addBox(plane, 8, 0.35, 3, grey, sd * 4.5, Y + 1, bodyZ - L / 2 - 4.5); hs.rotation.y = sd * 0.35;
    });
    // 랜딩기어 (앞 1 + 뒤 2)
    const gearMat = std(0x4b5563, { metalness: 0.7 }), tireM = std(0x111111);
    const gear = (x, z) => {
        addBox(plane, 0.35, Y - R - 0.4, 0.35, gearMat, x, (Y - R) / 2 + 0.6, z);
        [-0.45, 0.45].forEach(dx => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.45, 14), tireM); t.rotation.z = Math.PI / 2; t.position.set(x + dx, 0.6, z); plane.add(t); });
    };
    gear(0, bodyZ + L / 2 - 2); gear(-2.2, bodyZ + 4); gear(2.2, bodyZ + 4);
    // 탑승 계단차 + 콘
    addBox(g, 3, 1.2, 6, std(0xf8fafc), 7, 0.9, bodyZ + L / 2 - 8);
    const stairs = addBox(g, 2.2, 0.3, 7, std(0x9ca3af), 7, 3.2, bodyZ + L / 2 - 6.5); stairs.rotation.x = 0.5;
    [-6, 6].forEach(x => { const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 10), accent); cone.position.set(x, 0.6, 6); g.add(cone); });
    return g;
}

function createDestination(theme) {
    const group = theme === 'morning' ? buildOffice() : theme === 'evening' ? buildHouse() : buildAirplane();
    group.position.set(0, 0, -250); // 멀리서 스폰
    return group;
}

function applyTheme() {
    tConfig = THEME_DB[selectedTheme];
    // 소풍길은 도시 대신 자연 배경
    cityGroup.visible = !tConfig.nature;
    natureGroup.visible = !!tConfig.nature;
    ambientLight.intensity = tConfig.nature ? 0.85 : (selectedTheme === 'evening' ? 0.65 : 0.75);
    // 창문 불빛·가로등·노을
    const glow = tConfig.windowGlow || 0;
    buildingMats.forEach(m => m.emissiveIntensity = glow);
    lampHeadMat.emissiveIntensity = glow;
    sunMesh.visible = !!tConfig.sun;
    dirLight.position.set(tConfig.sun ? -60 : -50, tConfig.sun ? 22 : 40, tConfig.sun ? -50 : 10);
    dirLight.target.position.set(0, 0, -14);
    buildWeather(selectedTheme);
    applyHiMode();
    scene.background = new THREE.Color(tConfig.sky);
    scene.fog = new THREE.Fog(tConfig.sky, tConfig.fogNear, tConfig.fogFar);
    dirLight.color = new THREE.Color(tConfig.light);
}

function initGame(opts = {}) {
    intro = null;
    prepareTrack(selectedTheme);
    if (typeof drawAirportSign === 'function') { drawAirportSign(AIRPORT_KM); signShown = AIRPORT_KM; }
    if (!opts.intro) stopAllMusic();   // 카메라 연출 땐 로비 음악이 페이드아웃 중이라 끊지 않음
    const carInfo = CAR_DB[currentCarIndex];

    applyTheme();

    // 플레이어 셋업
    if(player.meshGroup) removeCar(player.meshGroup);
    const pCar = createCarMesh(carInfo.model, carInfo.color);
    player.meshGroup = pCar.mesh;
    player.width = pCar.width;
    player.length = pCar.length;
    // 차 모델은 앞이 -z(진행 방향)라 회전 없이 카메라에 뒷모습이 보임
    scene.add(player.meshGroup);
    PetKit.setLobby(false);
    PetKit.mount(player.meshGroup, carInfo.model, userData.pet);   // 반려동물 탑승
    lobbyCarKey = '';

    // 능력 초기화
    player.ability = carInfo.ability;
    player.lane = 1;
    player.targetX = laneCenters[player.lane];
    player.meshGroup.position.set(player.targetX, 0, 0);
    player.isJumping = false;
    player.timeScale = 1.0;
    player.skillTimer = 0;
    player.slowTimer = 0;
    player.slowLeft = SLOW_USES;
    runEndless = endlessMode && endlessUnlocked(selectedTheme);
    beginRun();   // 서버에 판 시작 기록 (기록 조작 방어 · 통계)
    endlessAnnounced = false;
    lastEndless = null;
    player.invincibleTimer = 0;
    player.meshGroup.visible = true;
    setGrayscale(false);
    updateSkillUI();

    player.jumpsLeft = (player.ability === 'EXTRA_JUMP') ? 3 : (player.ability === 'TIME_SLOW') ? 0 : 2;
    player.hasShield = (player.ability === 'SHIELD');

    // UI 반영
    document.getElementById('jump3').classList.toggle('hidden', player.ability !== 'EXTRA_JUMP');
    document.getElementById('shieldIcon').classList.toggle('hidden', !player.hasShield);
    document.getElementById('skillBtn').classList.toggle('hidden', player.ability !== 'TIME_SLOW');
    // [수정] 타임 컨트롤러: 점프 버튼·점프 표시 숨김, 스킬 버튼을 점프 자리 크기로
    const noJump = (player.ability === 'TIME_SLOW');
    document.getElementById('jumpBtn').classList.toggle('hidden', noJump);
    document.getElementById('jumpContainer').classList.remove('hidden');   // 타임 컨트롤러는 같은 자리에 감속 횟수(S) 표시
    document.getElementById('skillBtn').classList.toggle('w-20', noJump);
    document.getElementById('skillBtn').classList.toggle('h-20', noJump);
    document.getElementById('skillBtn').classList.toggle('text-base', noJump);
    document.getElementById('skillBtn').classList.toggle('w-14', !noJump);
    document.getElementById('skillBtn').classList.toggle('h-14', !noJump);
    document.getElementById('skillBtn').classList.toggle('text-xs', !noJump);
    updateJumpUI(); // 재시작 시 점프 표시 초기화

    document.getElementById('screenFx').className = "absolute inset-0 pointer-events-none hidden z-10";

    // 캐릭터 팝업 초기화
    nextPopupTime = 5;
    document.getElementById('characterPopup').classList.remove('opacity-100', 'translate-x-0');
    document.getElementById('characterPopup').classList.add('opacity-0', 'translate-x-10');

    // 상태 초기화
    gameTime = 0;
    enemies.forEach(e => removeCar(e.meshGroup));
    enemies = [];
    enemySpawnTimer = 0;

    if (destinationMesh) { scene.remove(destinationMesh); disposeObject(destinationMesh); destinationMesh = null; }
    clearFx(); crash = null; ending = null;
    // [최적화] 목적지를 미리 만들어 카메라 뒤 멀리 숨겨두고, 쓰일 재질을 지금 미리 준비
    destinationMesh = createDestination(selectedTheme);
    destinationMesh.position.set(0, 0, 2000);
    scene.add(destinationMesh);
    prewarmFx();
    camera.clearViewOffset(); camera.aspect = container.clientWidth / container.clientHeight;
    camera.fov = BASE_FOV; camera.updateProjectionMatrix();
    successAnimTimer = 0;
    resetRaceClock();
    hidePetBubble();

    // 화면 전환
    if (!opts.intro) document.getElementById('lobbyScreen').classList.add('hidden');   // 연출 땐 로비 UI가 미끄러져 나간 뒤 숨김
    document.getElementById('endScreen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('controls').classList.add('hidden');

    // 카메라를 시작 위치로 (이전 판 도착 연출 시점 초기화)
    camera.position.set(player.meshGroup.position.x * 0.8, 8, 12);
    camera.lookAt(camera.position.x, 0, -20);
    setText('timeDisplay', "0.0s");
    document.getElementById('hudBest').innerHTML = runEndless
        ? '<svg class="ic" aria-hidden="true"><use href="#i-infinity"/></svg> 최고 ' + (userData.endlessBest[selectedTheme] || 0).toFixed(1) + 's'
        : '최고 ' + (userData.best[selectedTheme] || 0).toFixed(1) + 's';

    // 바로 시작하지 않고 3-2-1 카운트다운
    gameState = 'COUNTDOWN';
    countdownTimer = opts.intro ? -INTRO_COUNT_AT : fading ? -0.5 : 0; // 연출: 카메라가 도착하는 순간 GO / 페이드: 화면이 밝아진 뒤 3-2-1
    countdownStep = -1;
    if (opts.intro) setupIntro();   // 첫 화면부터 로비 시점에서 출발 (게임 시점이 한 프레임도 안 보이게)
    lastTime = performance.now();
    if(animationId) cancelAnimationFrame(animationId);
    gameLoop();
}

// 컨트롤 이벤트
function moveLeft() {
    if (gameState !== 'PLAYING') return;
    if (player.lane > 0) { player.lane--; player.targetX = laneCenters[player.lane]; }
}
function moveRight() {
    if (gameState !== 'PLAYING') return;
    if (player.lane < NUM_LANES - 1) { player.lane++; player.targetX = laneCenters[player.lane]; }
}
function doJump() {
    if (gameState !== 'PLAYING' || player.ability === 'TIME_SLOW') return;
    if (player.jumpsLeft > 0 && !player.isJumping) {
        player.isJumping = true; player.jumpTimer = 1.0; player.jumpsLeft--; userData.stats.jumps++; if (Math.random() < 0.6) petSay('jump');
        updateJumpUI();
        updateScreenFx();
    }
}
function useSkill() {
    if (gameState !== 'PLAYING' || player.ability !== 'TIME_SLOW') return;
    if (player.slowLeft > 0 && player.slowTimer <= 0) {   // 판당 2회 (감속 중엔 다시 못 씀)
        // [수정1] setTimeout 대신 타이머로 관리 (재시작/게임오버 시 꼬이지 않음)
        player.slowLeft--;
        userData.stats.slows++;   // 거북이 입양 조건 (판이 끝날 때 저장됨)
        updateJumpUI();   // 오른쪽 위 S 하나 흐리게
        player.timeScale = 0.5;
        player.slowTimer = SLOW_DURATION;
        setGrayscale(true);
        updateScreenFx();
        updateSkillUI();
    }
}

function setGrayscale(on) { canvas.classList.toggle('grayscale-fx', on); }

// 화면 효과: 점프 > 쉴드 무적 > 감속 순으로 우선 표시
function updateScreenFx() {
    const fx = document.getElementById('screenFx');
    const base = "absolute inset-0 pointer-events-none z-10 ";
    if (player.isJumping) fx.className = base + "invincible-overlay";
    else if (player.invincibleTimer > 0) fx.className = base + "shield-overlay";
    else if (player.slowTimer > 0) fx.className = base + "timeslow-overlay";
    else fx.className = base + "hidden";
}

// 스킬 버튼에 쿨타임 표시
function updateSkillUI() {
    const btn = document.getElementById('skillBtn');
    // 감속 중: 남은 시간 / 평소: SLOW (남은 횟수는 오른쪽 위 S 표시로) / 다 쓰면 흐리게
    const txt = player.slowTimer > 0 ? player.slowTimer.toFixed(1) : 'SLOW';
    if (btn.textContent !== txt) btn.textContent = txt;
    btn.style.opacity = (player.slowTimer > 0 || player.slowLeft > 0) ? '1' : '0.35';
}

document.getElementById('leftBtn').addEventListener('touchstart', (e) => { e.preventDefault(); moveLeft(); });
document.getElementById('rightBtn').addEventListener('touchstart', (e) => { e.preventDefault(); moveRight(); });
document.getElementById('jumpBtn').addEventListener('touchstart', (e) => { e.preventDefault(); doJump(); });
document.getElementById('skillBtn').addEventListener('touchstart', (e) => { e.preventDefault(); useSkill(); });
document.getElementById('leftBtn').addEventListener('mousedown', moveLeft);
document.getElementById('rightBtn').addEventListener('mousedown', moveRight);
document.getElementById('jumpBtn').addEventListener('mousedown', doJump);
document.getElementById('skillBtn').addEventListener('mousedown', useSkill);

window.addEventListener('keydown', (e) => {
    if (typing(e)) return;
    if (e.key === 'ArrowLeft') moveLeft();
    if (e.key === 'ArrowRight') moveRight();
    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        // 타임 컨트롤러는 스페이스바 = 시간 감속, 나머지 차량은 점프
        if (player.ability === 'TIME_SLOW') useSkill(); else doJump();
    }
});

// 오른쪽 위 횟수 표시: 일반 차량은 점프(J, 파랑), 타임 컨트롤러는 감속(S, 보라)
function updateJumpUI() {
    const slow = player.ability === 'TIME_SLOW', left = slow ? player.slowLeft : player.jumpsLeft;
    document.querySelectorAll('.jump-dot').forEach((dot, idx) => {
        dot.textContent = slow ? 'S' : 'J';
        dot.classList.toggle('bg-blue-600', !slow);
        dot.style.background = slow ? '#7e22ce' : '';
        dot.style.opacity = idx < left ? '1' : '0.2';
    });
}

// ---- 무한모드 3대 패턴 ----
// 빈 차선 1개를 남기고 3대가 '조금씩 시간차'를 두고 옴. 충돌 판정은 우리 차 앞부분만이라
// 앞차가 지나간 직후 그 차선으로 비집고 들어가는 식으로 피할 수 있음 (극악 컨트롤)
const TRIPLE_GAP_MIN = 0.2, TRIPLE_GAP_MAX = 0.28;   // 차와 차 사이 시간차(초)
function spawnTriple() {
    const gapLane = Math.floor(Math.random() * NUM_LANES);
    const lanes = [0, 1, 2, 3].filter(l => l !== gapLane).sort(() => Math.random() - 0.5);   // 오는 순서도 랜덤
    const gapT = TRIPLE_GAP_MIN + Math.random() * (TRIPLE_GAP_MAX - TRIPLE_GAP_MIN);
    const step = gapT * roadSpeed;   // 세 대 모두 같은 속도(speed 0)로 와서 오는 동안 시간차가 그대로 유지됨
    lanes.forEach((l, i) => {
        const eType = CAR_DB[Math.floor(Math.random() * CAR_DB.length)];
        const eCar = createCarMesh(eType.model, Math.random() * 0xffffff);
        eCar.mesh.position.set(laneCenters[l], 0, -200 - i * step);
        scene.add(eCar.mesh);
        enemies.push({ meshGroup: eCar.mesh, width: eCar.width, length: eCar.length, speed: 0, passed: false });
    });
    // 패턴이 다 지나갈 때까지 다음 차를 쉬어서 빈 차선이 막히지 않게 (타이머가 spawnRate배로 줄어드니 미리 곱해둠)
    enemySpawnTimer = (2 * gapT + 0.4) * tConfig.spawnRate;
}

function spawnEnemies(dt) {
    enemySpawnTimer -= (dt * tConfig.spawnRate);
    if (enemySpawnTimer <= 0) {
        // 무한모드 60초 이후: 3대 패턴 + 2대 동시 출현이 점점 잦아짐
        const over = runEndless ? gameTime - 60 : -1;
        if (over >= 0 && Math.random() < Math.min(0.3, 0.12 + over * 0.004)) { spawnTriple(); return; }
        const pTwo = over >= 0 ? Math.min(0.6, 0.45 + over * 0.003) : 0.3;
        let numCars = Math.random() < pTwo ? 2 : 1;
        let available = [0,1,2,3].sort(() => Math.random() - 0.5);

        for(let i=0; i<numCars; i++) {
            let eType = CAR_DB[Math.floor(Math.random()*CAR_DB.length)];
            let eCar = createCarMesh(eType.model, Math.random() * 0xffffff);
            eCar.mesh.position.set(laneCenters[available[i]], 0, -200 - (Math.random()*50));
            scene.add(eCar.mesh);
            enemies.push({ meshGroup: eCar.mesh, width: eCar.width, length: eCar.length, speed: (Math.random()*30) - 15, passed: false });
        }
        // 난이도에 따른 생성 간격 감소
        let diff = Math.max(0.3, 1.2 - (gameTime / 60));
        enemySpawnTimer = diff;
    }
}

// 프레임이 끊겨 한 번에 많이 움직였을 때도 충돌을 놓치지 않도록, 직전 위치~현재 위치 사이를 함께 검사
function sweptCollision(p, e, prevZ) {
    const pFrontZ = p.meshGroup.position.z - (p.length * 0.3);
    const pLeft = p.meshGroup.position.x - (p.width * 0.4), pRight = p.meshGroup.position.x + (p.width * 0.4);
    const eLeft = e.meshGroup.position.x - (e.width * 0.4), eRight = e.meshGroup.position.x + (e.width * 0.4);
    const backBefore = prevZ - (e.length * 0.4), frontNow = e.meshGroup.position.z + (e.length * 0.4);
    return pLeft < eRight && pRight > eLeft && backBefore < pFrontZ && frontNow > pFrontZ;
}
function checkCollision(p, e) {
    const pFrontZ = p.meshGroup.position.z - (p.length * 0.3);
    const pLeft = p.meshGroup.position.x - (p.width * 0.4);
    const pRight = p.meshGroup.position.x + (p.width * 0.4);

    const eFront = e.meshGroup.position.z + (e.length * 0.4);
    const eBack = e.meshGroup.position.z - (e.length * 0.4);
    const eLeft = e.meshGroup.position.x - (e.width * 0.4);
    const eRight = e.meshGroup.position.x + (e.width * 0.4);

    return (pLeft < eRight && pRight > eLeft && pFrontZ < eFront && pFrontZ > eBack);
}

function onGameOver(isWin = false) {
    gameState = isWin ? 'WIN' : 'GAMEOVER';
    document.getElementById('countdown').classList.add('hidden');
    // 결과 화면: 코스 음악(출근길/퇴근길/소풍길)을 끊지 않고 그대로 유지
    setGrayscale(false);
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('controls').classList.add('hidden');

    const titleEl = document.getElementById('endTitle');
    if (isWin) {
        titleEl.textContent = "목적지 도착! 🎉";
        titleEl.className = "text-4xl font-black text-emerald-400 mb-4 text-center drop-shadow-2xl";
    } else {
        titleEl.textContent = "게임 오버 💥";
        titleEl.className = "text-4xl font-black text-red-500 mb-4 text-center drop-shadow-2xl";
    }

    // 무한모드: 60초를 넘긴 시간 그대로 (일반 모드 기록·TOP 10에는 반영 안 함)
    const secs = runEndless ? Math.floor(gameTime * 10) / 10 : isWin ? 60 : Math.floor(Math.min(gameTime, 59.9) * 10) / 10;
    if (runEndless) {
        titleEl.textContent = secs >= 60 ? "지각 버티기 끝! ⏰" : "게임 오버 💥";
        titleEl.className = "text-4xl font-black text-red-500 mb-4 text-center drop-shadow-2xl";
    }
    hideRaceNotices();
    const metBefore = PET_INFO.filter(p => !userData.pets.includes(p.id) && p.met()).map(p => p.id);
    userData.stats.runs++;
    if (runEndless && selectedTheme === 'evening') userData.stats.eveningEndless++;   // 햄스터 입양 조건
    if (userData.pet) userData.petTime[userData.pet] = (userData.petTime[userData.pet] || 0) + (runEndless ? gameTime : Math.min(60, gameTime));   // 함께 달린 시간
    let creditEarned = Math.floor(Math.min(gameTime, 60)); // 1초당 1크레딧, 60초까지만 (무한모드도 동일)
    if (player.ability === 'CREDIT_BONUS') creditEarned = Math.floor(creditEarned * 1.2);   // 로드스터: 최대 72C
    userData.credits += creditEarned;
    let prevBest, isRecord;
    if (runEndless) {
        prevBest = userData.endlessBest[selectedTheme] || 0;
        isRecord = secs >= 60 && secs > prevBest;
        if (isRecord) userData.endlessBest[selectedTheme] = secs;
        lastEndless = { secs, isRecord };
    } else {
        prevBest = userData.best[selectedTheme] || 0;
        isRecord = secs > prevBest;
        if (isRecord) userData.best[selectedTheme] = secs;
    }
    saveData();
    // 서버에 판 끝 기록 → 판 번호가 확정되면 명예의 전당용 판 · 못 올린 무한 기록에 연결
    const runCourse = selectedTheme, runCar = CAR_DB[currentCarIndex].id, wasEndless = runEndless;   // 다음 판이 시작돼도 이 판 값으로
    endRun(secs).then(id => {
        if (!id) return;
        if (secs >= 60) { if (!userData.fameRun) userData.fameRun = {}; userData.fameRun[runCourse] = { run: id, s: secs }; }   // 명예의 전당 등록에 쓸 판
        if (wasEndless && isRecord) userData.endlessPending[runCourse] = { s: secs, car: runCar, run: id };                 // 서버에 올라가면 지움
        saveData();
    });
    // 개발자용 플레이 기록 (서버 함수가 60초까지만 받을 수 있어 무한모드는 60초로 맞춰 보냄)
    logPlay(runEndless ? secs >= 60 : isWin, Math.min(secs, 60));
    const newlyMet = PET_INFO.filter(p => !userData.pets.includes(p.id) && p.met() && !metBefore.includes(p.id));
    if (newlyMet.length) setTimeout(() => showToast(`🐾 ${newlyMet.map(p => p.species).join(', ')} 입양 조건 달성! 할인가로 입양할 수 있어요`), 900);

    document.getElementById('endScreen').classList.remove('hidden');
    document.getElementById('endScreen').scrollTop = 0;
    document.getElementById('finalCourse').innerHTML = `${COURSE_NAMES[selectedTheme]}${runEndless ? ' <svg class="ic" aria-hidden="true"><use href="#i-infinity"/></svg> 무한모드' : ''} · 버틴 시간`;
    document.getElementById('finalTime').textContent = secs.toFixed(1) + 's';
    const bestNow = runEndless ? (userData.endlessBest[selectedTheme] || 0) : (userData.best[selectedTheme] || 0);
    document.getElementById('finalBest').innerHTML = isRecord && prevBest > 0
        ? `<span class="text-emerald-300 font-bold">🎉 신기록!</span> (이전 ${prevBest.toFixed(1)}s)`
        : isRecord && runEndless ? `<span class="text-emerald-300 font-bold">🎉 첫 무한모드 기록!</span>`
        : `내 ${runEndless ? '무한모드 ' : ''}최고 기록 ${bestNow.toFixed(1)}s`;
    document.getElementById('earnedCredit').textContent = `+${creditEarned} C`;
    window.lastResult = { course: selectedTheme, endless: runEndless, secs, isRecord, prevBest, best: bestNow, credit: creditEarned, win: !!isWin, title: titleEl.textContent };   // 기록 카드·도전장용
    if (window.onResultShown) try { onResultShown(); } catch (e) {}
    if (runEndless) renderEndlessOnline(secs, isRecord);
    else renderResultOnline(isWin, secs);
}

// 대사 셔플 백: 한 바퀴 다 나오기 전엔 같은 대사가 다시 안 나오고,
// 바퀴가 바뀔 때도 직전 대사가 연속으로 나오지 않음
const quoteBags = {}, lastQuote = {};
function nextQuote(theme) {
    if (!quoteBags[theme] || quoteBags[theme].length === 0) {
        const bag = [...QUOTES[theme]];
        for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
        if (bag.length > 1 && bag[bag.length - 1] === lastQuote[theme]) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
        quoteBags[theme] = bag;
    }
    const q = quoteBags[theme].pop();
    lastQuote[theme] = q;
    return q;
}

function showPopup() {
    const popup = document.getElementById('characterPopup');
    const msgEl = document.getElementById('charMsg');
    const nameEl = document.getElementById('charName');
    const profileEl = document.getElementById('charProfile');

    const themeQuotes = QUOTES[selectedTheme];
    const charInfo = CHAR_INFO[selectedTheme];

    const q = nextQuote(selectedTheme);
    msgEl.textContent = q;
    const qKey = selectedTheme + ':' + QUOTES[selectedTheme].indexOf(q);
    if (!userData.stats.quotes.includes(qKey)) userData.stats.quotes.push(qKey);
    nameEl.textContent = charInfo.name;
    profileEl.className = `char-face w-14 h-14 rounded-full border-2 shadow-lg shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center ${charInfo.color}`;

    popup.classList.remove('opacity-0', 'translate-x-10');
    popup.classList.add('opacity-100', 'translate-x-0');
    const qIdx = QUOTES[selectedTheme].indexOf(q);
    setTimeout(() => { if (gameState === 'PLAYING') petSay('nag', true, qIdx); }, 1300);   // 잔소리에 맞춰 대답 (떠 있던 다른 대사는 덮어씀)

    setTimeout(() => {
        if (gameState === 'PLAYING') {
            popup.classList.remove('opacity-100', 'translate-x-0');
            popup.classList.add('opacity-0', 'translate-x-10');
        }
    }, 4000);
}

