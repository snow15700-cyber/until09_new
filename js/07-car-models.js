/* 07-car-models.js — 차량 3D 모델
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   차량 모델 (앞 = -z, 뒤 = +z)
   차종별 템플릿을 한 번 만들고 복제해서 사용 (지오메트리 공유)
   ========================================== */
const CARMAT = {
    glass:  new THREE.MeshStandardMaterial({ color: 0x1c2a38, metalness: 0.6, roughness: 0.15 }),
    tire:   new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }),
    rim:    new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.9, roughness: 0.25 }),
    darkRim:new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: 0.7, roughness: 0.3 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe6e6e6, metalness: 1.0, roughness: 0.15 }),
    gold:   new THREE.MeshStandardMaterial({ color: 0xf5c542, metalness: 1.0, roughness: 0.25 }),
    black:  new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 }),
    plastic:new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.8 }),
    seat:   new THREE.MeshStandardMaterial({ color: 0x5a2e1a, roughness: 0.7 }),
    white:  new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.4 }),
    head:   new THREE.MeshBasicMaterial({ color: 0xfff6d5 }),
    tail:   new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
    plate:  new THREE.MeshStandardMaterial({ color: 0xf0f0f0 }),
    neonPurple: new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.55, depthWrite: false }),
    neonCyan:   new THREE.MeshBasicMaterial({ color: 0x22d3ee }),
    neonCyanGlow: new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.45, depthWrite: false }),
    orange: new THREE.MeshBasicMaterial({ color: 0xff9a1f })
};
const PAINT_PLACEHOLDER = new THREE.MeshStandardMaterial({ color: 0xffffff });
const ACCENT_PLACEHOLDER = new THREE.MeshStandardMaterial({ color: 0xffffff });

// bw/bl/bh: 차체 폭/길이/높이, cy: 차체 중심 높이, wr: 바퀴 반지름 (충돌 판정은 bw·bl 사용)
const CAR_SPECS = {
    roadster: { bw:2.3, bl:4.4, bh:0.55, cy:0.62, wr:0.38 },
    santafe:  { bw:2.6, bl:4.9, bh:1.1,  cy:1.0,  wr:0.52 },
    pony:     { bw:2.1, bl:3.9, bh:0.75, cy:0.72, wr:0.36 },
    sonata:   { bw:2.5, bl:5.0, bh:0.5,  cy:0.55, wr:0.42 },
    grandeur: { bw:2.5, bl:5.4, bh:0.72, cy:0.76, wr:0.43 }
};

function buildCarTemplate(type) {
    const car = new THREE.Group();
    const s = CAR_SPECS[type] || CAR_SPECS.pony;
    const { bw, bl, bh, cy, wr } = s;
    const top = cy + bh / 2;   // 차체 윗면 높이
    const front = -bl / 2, back = bl / 2;
    const box = (w, h, d, mat, x, y, z, parent = car) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z); parent.add(m); return m;
    };
    const paint = PAINT_PLACEHOLDER, accent = ACCENT_PLACEHOLDER;

    // ---- 공통: 차체 ----
    box(bw, bh, bl, paint, 0, cy, 0);

    // ---- 공통: 바퀴 (타이어 + 휠) ----
    const axle = bl * 0.31;
    const tireW = (type === 'santafe' || type === 'sonata') ? 0.42 : 0.32;
    const rimMat = (type === 'sonata' || type === 'grandeur') ? CARMAT.darkRim : CARMAT.rim;
    const tireGeo = new THREE.CylinderGeometry(wr, wr, tireW, 18);
    const rimGeo = new THREE.CylinderGeometry(wr * 0.6, wr * 0.6, tireW + 0.02, 10);
    [[-1, axle], [1, axle], [-1, -axle], [1, -axle]].forEach(([sx, z]) => {
        const x = sx * (bw / 2 + (type === 'sonata' ? 0.08 : -0.02));
        const t = new THREE.Mesh(tireGeo, CARMAT.tire); t.rotation.z = Math.PI / 2; t.position.set(x, wr, z); car.add(t);
        const r = new THREE.Mesh(rimGeo, rimMat); r.rotation.z = Math.PI / 2; r.position.set(x, wr, z); car.add(r);
    });

    // ---- 공통: 라이트·번호판·사이드미러 ----
    const lightY = cy + bh * 0.15;
    if (type !== 'grandeur') {
        [-1, 1].forEach(sd => {
            box(0.5, 0.18, 0.06, CARMAT.head, sd * (bw / 2 - 0.4), lightY, front - 0.03);
            box(0.45, 0.18, 0.06, CARMAT.tail, sd * (bw / 2 - 0.35), lightY, back + 0.03);
        });
    }
    box(0.7, 0.22, 0.04, CARMAT.plate, 0, cy - bh * 0.15, back + 0.04);
    // 범퍼
    box(bw * 0.98, 0.18, 0.2, type === 'santafe' ? CARMAT.plastic : CARMAT.black, 0, cy - bh / 2 + 0.12, back + 0.05);
    box(bw * 0.98, 0.18, 0.2, type === 'santafe' ? CARMAT.plastic : CARMAT.black, 0, cy - bh / 2 + 0.12, front - 0.05);

    const mirrors = (z, y) => [-1, 1].forEach(sd => box(0.3, 0.16, 0.12, paint, sd * (bw / 2 + 0.12), y, z));

    if (type === 'roadster') {
        // 기본 로드스터 (크레딧 보너스): 지붕 없는 오픈카 + 금색 트림 + 크롬 디테일
        box(bw * 0.86, 0.06, 0.08, CARMAT.chrome, 0, top + 0.42, -0.35);                  // 앞유리 프레임 위
        const ws = box(bw * 0.84, 0.75, 0.05, CARMAT.glass, 0, top + 0.05, -0.35); ws.rotation.x = -0.45; // 앞유리 (기울어짐)
        ws.position.y = top + 0.3;
        box(bw * 0.8, 0.12, 1.5, CARMAT.black, 0, top + 0.02, 0.6);                        // 실내 바닥
        [-1, 1].forEach(sd => {
            box(0.65, 0.3, 0.55, CARMAT.seat, sd * 0.45, top + 0.2, 0.75);                 // 가죽 시트
            box(0.65, 0.6, 0.15, CARMAT.seat, sd * 0.45, top + 0.38, 1.05);                // 등받이
            box(0.12, 0.65, 0.12, CARMAT.chrome, sd * 0.45, top + 0.4, 1.3);               // 롤바 기둥
        });
        box(1.05, 0.12, 0.12, CARMAT.chrome, 0, top + 0.72, 1.3);                          // 롤바
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 14), CARMAT.black);
        wheel.position.set(-0.45, top + 0.38, 0.15); wheel.rotation.x = -0.6; car.add(wheel);
        [-1, 1].forEach(sd => box(0.04, 0.08, bl * 0.85, CARMAT.gold, sd * (bw / 2 + 0.01), cy + bh * 0.25, 0)); // 금색 사이드 라인
        box(0.5, 0.06, 0.04, CARMAT.gold, 0, cy + bh * 0.25, front - 0.04);               // 금색 엠블럼
        box(bw * 0.5, 0.18, 0.05, CARMAT.chrome, 0, cy - 0.02, front - 0.04);              // 크롬 그릴
        [-1, 1].forEach(sd => { const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8), CARMAT.chrome); ex.rotation.x = Math.PI/2; ex.position.set(sd * 0.5, cy - bh/2 + 0.05, back + 0.12); car.add(ex); });
        mirrors(-0.2, top + 0.2);
    }
    else if (type === 'santafe') {
        // 튼튼한 SUV (쉴드): 각진 캐빈 + 범퍼가드 + 펜더 + 루프랙 + 스페어 타이어
        const cl = 3.3, ch = 0.95, cz = 0.35;
        box(bw * 0.9, ch, cl, paint, 0, top + ch / 2, cz);                                 // 캐빈 (차체색)
        [-1, 1].forEach(sd => box(0.04, ch * 0.62, cl * 0.86, CARMAT.glass, sd * (bw * 0.45 + 0.02), top + ch * 0.55, cz)); // 옆 유리
        box(bw * 0.8, ch * 0.6, 0.04, CARMAT.glass, 0, top + ch * 0.55, cz - cl / 2 - 0.02); // 앞 유리
        box(bw * 0.8, ch * 0.5, 0.04, CARMAT.glass, 0, top + ch * 0.6, cz + cl / 2 + 0.02);  // 뒷 유리
        // 루프랙 (레일 + 가로대)
        [-1, 1].forEach(sd => box(0.1, 0.12, cl * 0.9, CARMAT.black, sd * bw * 0.38, top + ch + 0.08, cz));
        [-0.8, 0.2, 1.2].forEach(z => box(bw * 0.8, 0.07, 0.1, CARMAT.black, 0, top + ch + 0.16, cz + z));
        // 범퍼 가드 (불바)
        box(bw * 0.7, 0.12, 0.12, CARMAT.chrome, 0, cy + 0.15, front - 0.35);
        box(bw * 0.7, 0.12, 0.12, CARMAT.chrome, 0, cy - 0.35, front - 0.35);
        [-1, 1].forEach(sd => box(0.12, 0.65, 0.12, CARMAT.chrome, sd * bw * 0.32, cy - 0.1, front - 0.35));
        // 펜더 오버휀더 + 사이드 스텝 + 하부 보호판
        [-1, 1].forEach(sd => {
            [axle, -axle].forEach(z => box(0.18, 0.25, 1.4, CARMAT.plastic, sd * (bw / 2 + 0.06), wr * 2 + 0.05, z));
            box(0.35, 0.08, bl * 0.4, CARMAT.chrome, sd * (bw / 2 + 0.15), 0.55, 0);
        });
        box(bw * 0.6, 0.08, 0.6, CARMAT.rim, 0, cy - bh / 2 - 0.02, front + 0.3);
        // 뒤 스페어 타이어
        const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 18), CARMAT.tire);
        sp.rotation.x = Math.PI / 2; sp.position.set(0, cy + 0.15, back + 0.2); car.add(sp);
        const spc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.32, 10), accent);
        spc.rotation.x = Math.PI / 2; spc.position.copy(sp.position); car.add(spc);
        // 루프 위 보조등
        [-0.5, 0, 0.5].forEach(x => box(0.3, 0.2, 0.15, CARMAT.head, x, top + ch + 0.3, cz - cl / 2 + 0.3));
        mirrors(cz - cl / 2 + 0.2, top + 0.4);
    }
    else if (type === 'pony') {
        // 경량 해치백 (점프 +1): 둥글고 통통한 실루엣 + 흰색 투톤 지붕 + 레이싱 스트라이프 + 스포일러
        const cl = 2.5, ch = 0.8, cz = 0.55;
        box(bw * 0.86, ch, cl, CARMAT.glass, 0, top + ch / 2, cz);                         // 유리 캐빈
        [-1, 1].forEach(sd => box(0.08, ch, 0.12, paint, sd * bw * 0.43, top + ch / 2, cz - cl / 2 + 0.06)); // A필러
        box(bw * 0.88, 0.1, cl - 0.1, CARMAT.white, 0, top + ch + 0.05, cz);               // 흰 지붕
        box(bw * 0.86, 0.08, 0.45, accent, 0, top + ch + 0.05, cz + cl / 2 - 0.05);         // 지붕 끝 스포일러
        [-0.25, 0.25].forEach(x => {                                                        // 레이싱 스트라이프
            box(0.22, 0.02, bl * 0.48, accent, x, top + 0.01, front + bl * 0.24);
        });
        // 스프링 감성: 동글동글한 큰 헤드램프
        [-1, 1].forEach(sd => {
            const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 14), CARMAT.head);
            hl.rotation.x = Math.PI / 2; hl.position.set(sd * (bw / 2 - 0.4), cy + 0.15, front - 0.05); car.add(hl);
        });
        // 안테나 + 지붕 위 작은 점프 스프링 장식
        box(0.03, 0.6, 0.03, CARMAT.black, -bw * 0.3, top + ch + 0.35, cz + 0.6);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), accent); ball.position.set(-bw * 0.3, top + ch + 0.68, cz + 0.6); car.add(ball);
        mirrors(cz - cl / 2 + 0.25, top + 0.3);
    }
    else if (type === 'sonata') {
        // 드리프트 머신 (이동 3배): 낮고 넓은 바디킷 + 대형 윙 + 사이드 스커트 + 보라 네온 언더글로우
        const cl = 1.9, ch = 0.5, cz = 0.25;
        box(bw * 0.72, ch, cl, CARMAT.glass, 0, top + ch / 2, cz);
        box(bw * 0.74, 0.06, cl * 0.75, paint, 0, top + ch + 0.02, cz + 0.1);              // 지붕
        // 와이드 펜더
        [-1, 1].forEach(sd => [axle, -axle].forEach(z => box(0.22, bh + 0.15, 1.5, paint, sd * (bw / 2 + 0.06), cy + 0.05, z)));
        // 프론트 립 + 사이드 스커트 + 디퓨저 (검정 카본)
        box(bw * 1.04, 0.06, 0.4, CARMAT.black, 0, cy - bh / 2 - 0.02, front - 0.15);
        [-1, 1].forEach(sd => box(0.12, 0.12, bl * 0.45, CARMAT.black, sd * (bw / 2 + 0.12), cy - bh / 2 + 0.04, 0));
        [-0.6, -0.2, 0.2, 0.6].forEach(x => box(0.06, 0.25, 0.4, CARMAT.black, x, cy - bh / 2 + 0.05, back - 0.1));
        // 대형 리어 윙 + 엔드플레이트
        box(bw * 1.05, 0.08, 0.7, CARMAT.black, 0, top + 0.75, back - 0.35);
        [-1, 1].forEach(sd => {
            box(0.06, 0.35, 0.8, CARMAT.black, sd * bw * 0.52, top + 0.68, back - 0.35);
            box(0.08, 0.7, 0.18, CARMAT.black, sd * bw * 0.32, top + 0.35, back - 0.35);
        });
        // 보닛 에어벤트 + 레이싱 넘버
        box(0.8, 0.04, 0.6, CARMAT.black, 0, top + 0.02, front + 0.8);
        box(0.03, 0.5, 0.5, CARMAT.white, bw / 2 + 0.18, cy + 0.02, 0);                    // 사이드 넘버 판
        box(0.03, 0.5, 0.5, CARMAT.white, -bw / 2 - 0.18, cy + 0.02, 0);
        // 쌍 머플러 (주황 불꽃 느낌 팁)
        [-0.35, 0.35].forEach(x => {
            const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.35, 10), CARMAT.chrome);
            ex.rotation.x = Math.PI / 2; ex.position.set(x, cy - bh / 2 + 0.1, back + 0.12); car.add(ex);
            const fl = new THREE.Mesh(new THREE.CircleGeometry(0.08, 10), CARMAT.orange); fl.position.set(x, cy - bh / 2 + 0.1, back + 0.3); car.add(fl);
        });
        // 네온 언더글로우
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(bw + 0.8, bl + 0.6), CARMAT.neonPurple);
        glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; car.add(glow);
        mirrors(cz - cl / 2 + 0.15, top + 0.25);
    }
    else if (type === 'grandeur') {
        // 타임 컨트롤러 (시간 감속): 미래형 고급 세단 + 시안 네온 라인 + 보닛 위 시계 엠블럼
        const cl = 2.7, ch = 0.66, cz = 0.15;
        box(bw * 0.82, ch, cl, CARMAT.glass, 0, top + ch / 2, cz);
        box(bw * 0.84, 0.06, cl * 0.8, paint, 0, top + ch + 0.02, cz);
        // 전면/후면 일자형 라이트바 (시안)
        box(bw * 0.95, 0.07, 0.06, CARMAT.neonCyan, 0, cy + bh * 0.35, front - 0.04);
        box(bw * 0.95, 0.1, 0.06, CARMAT.tail, 0, cy + bh * 0.3, back + 0.04);
        box(bw * 0.55, bh * 0.5, 0.05, CARMAT.chrome, 0, cy - 0.05, front - 0.04);          // 크롬 그릴
        // 차체 측면 네온 라인 + 휠 주변 시안 링
        [-1, 1].forEach(sd => {
            box(0.03, 0.05, bl * 0.9, CARMAT.neonCyan, sd * (bw / 2 + 0.01), cy + bh * 0.1, 0);
            [axle, -axle].forEach(z => {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(wr * 0.62, 0.03, 6, 20), CARMAT.neonCyan);
                ring.rotation.y = Math.PI / 2; ring.position.set(sd * (bw / 2 + 0.01), wr, z); car.add(ring);
            });
        });
        // 보닛 위 시계 엠블럼 (링 + 시침/분침)
        const clock = new THREE.Group();
        const face = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 24), CARMAT.gold); clock.add(face);
        const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.02), CARMAT.gold); h1.position.y = 0.1; clock.add(h1);
        const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.02), CARMAT.gold); h2.position.x = 0.07; clock.add(h2);
        clock.rotation.x = -Math.PI / 2; clock.position.set(0, top + 0.02, front + 0.8); car.add(clock);
        // 트렁크 위 작은 시안 스포일러 립 + 은은한 하부 글로우
        box(bw * 0.8, 0.05, 0.25, CARMAT.neonCyan, 0, top + 0.03, back - 0.15);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(bw + 0.4, bl + 0.2), CARMAT.neonCyanGlow);
        glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; car.add(glow);
        mirrors(cz - cl / 2 + 0.2, top + 0.25);
    }
    // [고사양] 라이트·네온에 빛 번짐
    const glowFor = new Map([[CARMAT.head, [0xfff1c0, 1.4]], [CARMAT.tail, [0xff2a2a, 1.3]], [CARMAT.neonCyan, [0x22d3ee, 1.1]], [CARMAT.orange, [0xff9a1f, 0.9]]]);
    const lights = []; car.traverse(o => { if (o.isMesh && glowFor.has(o.material)) lights.push(o); });
    lights.forEach(o => {
        const [col, sz] = glowFor.get(o.material);
        o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox, w = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y);
        const sp = glowSprite(col, Math.min(3.2, Math.max(0.8, w * 2.2)) * sz); sp.position.copy(o.position);
        sp.position.z += o.position.z > 0 ? 0.15 : -0.15; car.add(sp);
    });
    return { mesh: car, width: bw, length: bl };
}

const carTemplates = {};
// 액센트 색 (차체색과 어울리는 포인트 컬러)
const ACCENT_COLOR = { roadster: 0xf5c542, santafe: 0x111111, pony: 0xffffff, sonata: 0x111111, grandeur: 0x22d3ee };

// [최적화] 차를 장면에서 뺄 때 그 차 전용 재질도 정리 (메모리 누적 방지)
function removeCar(mesh) {
    if (!mesh) return;
    if (mesh.parent) mesh.parent.remove(mesh);
    (mesh.userData.ownMats || []).forEach(m => m.dispose());
    mesh.userData.ownMats = [];
}
function createCarMesh(type, colorHex) {
    if (!carTemplates[type]) carTemplates[type] = buildCarTemplate(type);
    const tpl = carTemplates[type];
    const paintMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.35, roughness: 0.3 });
    const accentMat = new THREE.MeshStandardMaterial({ color: (ACCENT_COLOR[type] !== undefined ? ACCENT_COLOR[type] : 0xffffff), metalness: 0.3, roughness: 0.4 });
    const mesh = tpl.mesh.clone(); // 지오메트리 공유
    mesh.userData.ownMats = [paintMat, accentMat];   // 차가 사라질 때 정리할 재질
    mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
    mesh.traverse(o => {
        if (!o.isMesh) return;
        if (o.material === PAINT_PLACEHOLDER) o.material = paintMat;
        else if (o.material === ACCENT_PLACEHOLDER) o.material = accentMat;
    });
    return { mesh, width: tpl.width, length: tpl.length };
}

