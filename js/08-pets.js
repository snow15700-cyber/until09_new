/* 08-pets.js — 반려동물 3D 모델 · 말풍선
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   반려동물 (툰 셰이딩 모델 · 차 지붕 방석 탑승)
   ========================================== */
const PetKit = (() => {
    const TOON = { on: true };
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lobbyMode = true;
  // ---------- 펫 공통 재료 ----------
  // 툰 셰이딩: 3단계 명암 그라데이션 (밝음 / 중간 / 그늘)
  const toonGrad = (() => {
const d = new Uint8Array([25, 25, 25, 255, 95, 95, 95, 255, 150, 150, 150, 255]);
const tx = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
tx.minFilter = tx.magFilter = THREE.NearestFilter; tx.generateMipmaps = false; tx.needsUpdate = true; return tx;
  })();
  const matCache = {};
  const M = (hex, rough = 0.75) => {
const key = (TOON.on ? 't' : 's') + hex + '_' + rough;
if (!matCache[key]) matCache[key] = TOON.on
  ? new THREE.MeshToonMaterial({ color: new THREE.Color(hex).multiplyScalar(0.86), gradientMap: toonGrad })
  : new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
return matCache[key];
  };
  // 외곽선: 뒤집은 검은 복사본을 두께만큼 키워 겹침 (작은 부위는 생략)
  const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x3a2418, side: THREE.BackSide });
  function addOutlines(root, t = 0.022) {
const targets = [];
root.traverse(o => { if (o.isMesh && !o.userData.noOutline && o.material !== OUTLINE && !o.material.transparent && !o.material.isMeshBasicMaterial) targets.push(o); });
targets.forEach(o => {
  o.geometry.computeBoundingBox();
  const size = new THREE.Vector3(); o.geometry.boundingBox.getSize(size);
  const ws = new THREE.Vector3(); o.getWorldScale(ws);
  const rootScale = new THREE.Vector3(); root.getWorldScale(rootScale);
  const dims = [size.x * ws.x / rootScale.x, size.y * ws.y / rootScale.y, size.z * ws.z / rootScale.z];
  if (Math.min(...dims) < 0.07 || o.geometry.type === 'TorusGeometry') return;
  const ol = new THREE.Mesh(o.geometry, OUTLINE);
  ol.scale.set(1 + 2 * t / dims[0], 1 + 2 * t / dims[1], 1 + 2 * t / dims[2]);
  ol.userData.noOutline = true; ol.castShadow = false;
  o.add(ol);
});
  }
  const SPH = new THREE.SphereGeometry(1, 24, 18);
  const sph = (parent, r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
const m = new THREE.Mesh(SPH, mat); m.scale.set(r * sx, r * sy, r * sz); m.position.set(x, y, z);
m.castShadow = true; parent.add(m); return m;
  };
  const EYE = M(0x17141a, 0.25), SHINE = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const BLUSH = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.55, depthWrite: false });
  // 반짝이는 큰 눈 (흰 하이라이트 2개)
  function eye(parent, x, y, z, r) {
const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
sph(g, r, EYE, 0, 0, 0, 1, 1.12, 0.7);
sph(g, r * 0.34, SHINE, r * 0.3, r * 0.38, r * 0.55);
sph(g, r * 0.16, SHINE, -r * 0.28, -r * 0.3, r * 0.6);
return g;
  }
  function blush(parent, x, y, z, r) { const b = sph(parent, r, BLUSH, x, y, z, 1, 0.62, 0.25); b.castShadow = false; return b; }
  // 행복하게 감은 눈 ^ ^
  function closedEye(parent, x, y, z, r) {
const m = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.28, 8, 16, Math.PI), EYE);
m.position.set(x, y, z); parent.add(m); return m;
  }

  // ---------- 김부장의 빨간 넥타이 (이스터에그 보상, js/patch-notes.js) ----------
  //  neck: 목에 두른 깃 + 매듭 + 가슴으로 늘어진 넥타이 / head: 이마에 질끈 두르고 옆에서 묶은 회식 부장님 스타일
  const tieTex = (() => {   // 빨간 바탕 + 사선 줄무늬 (진한 빨강 · 금색)
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#d61f26'; x.fillRect(0, 0, 64, 64);
    x.lineWidth = 7; x.strokeStyle = '#8f1016';
    for (let i = -64; i < 128; i += 32) { x.beginPath(); x.moveTo(i, 64); x.lineTo(i + 64, 0); x.stroke(); }
    x.lineWidth = 2.5; x.strokeStyle = '#f2c14e';
    for (let i = -48; i < 128; i += 32) { x.beginPath(); x.moveTo(i, 64); x.lineTo(i + 64, 0); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 9); return t;
  })();
  const TIE = TOON.on ? new THREE.MeshToonMaterial({ color: 0xdedede, map: tieTex, gradientMap: toonGrad }) : new THREE.MeshStandardMaterial({ map: tieTex, roughness: 0.6 });
  const TIE_KNOT = M(0xb3161d, 0.6);
  const TIE_OL = new THREE.MeshBasicMaterial({ color: 0x3a2418, side: THREE.BackSide });
  function tieBlade(len, w) {   // 위가 좁고 아래가 넓은 뾰족한 넥타이 한 장 (위 끝이 원점, 아래로 늘어짐)
    const sh = new THREE.Shape();
    sh.moveTo(-w * 0.32, 0); sh.lineTo(w * 0.32, 0); sh.lineTo(w * 0.5, -len * 0.82); sh.lineTo(0, -len); sh.lineTo(-w * 0.5, -len * 0.82); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.022, bevelEnabled: false }); geo.translate(0, 0, -0.011);
    const m = new THREE.Mesh(geo, TIE); m.castShadow = true; m.userData.noOutline = true;
    if (TOON.on) {   // 얇아서 자동 외곽선이 안 붙음 → 직접 붙임
      const sh2 = new THREE.Shape(), o = 0.016;
      sh2.moveTo(-w * 0.32 - o, o); sh2.lineTo(w * 0.32 + o, o); sh2.lineTo(w * 0.5 + o, -len * 0.82); sh2.lineTo(0, -len - o * 1.6); sh2.lineTo(-w * 0.5 - o, -len * 0.82); sh2.closePath();
      const g2 = new THREE.ExtrudeGeometry(sh2, { depth: 0.04, bevelEnabled: false }); g2.translate(0, 0, -0.02);
      const ol = new THREE.Mesh(g2, TIE_OL); ol.userData.noOutline = true; m.add(ol);
    }
    return m;
  }
  function knot(parent, r, x, y, z) { const k = sph(parent, r, TIE_KNOT, x, y, z, 1.1, 0.95, 0.8); k.userData.noOutline = true; return k; }
  function buildTie(sp) {
    const t = new THREE.Group(); t.name = 'bossTie';
    if (sp.type === 'neck') {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(sp.r, 0.022, 8, 28), TIE);
      collar.rotation.x = Math.PI / 2 + (sp.collarTilt || 0); collar.position.set(0, sp.y, sp.z); collar.scale.set(1, sp.rz || 1, 1); t.add(collar);
      const front = new THREE.Group(); front.position.set(0, sp.y - 0.01, sp.front); front.rotation.x = sp.tilt; t.add(front);
      knot(front, sp.w * 0.42, 0, 0, 0.012);
      const b = tieBlade(sp.len, sp.w); b.position.set(0, -sp.w * 0.25, 0.006); front.add(b);
    } else {
      const band = new THREE.Mesh(new THREE.TorusGeometry(sp.r, 0.03, 8, 30), TIE);
      band.rotation.set(Math.PI / 2 - 0.12, 0, 0.16); band.position.set(0, sp.y, sp.z || 0); band.scale.set(1, sp.rz || 1, 1); t.add(band);
      // 오른쪽 옆머리에서 묶은 매듭 + 삐죽 늘어진 두 가닥
      const th = 1.0;   // 매듭 위치: 정면에서 오른쪽으로 약 57° (관자놀이쯤) → 앞에서 봐도 늘어진 가닥이 보임
      const side = new THREE.Group(); const ro = sp.r * 1.06;   // 머리 표면보다 살짝 바깥 (가닥이 머리 속으로 파묻히지 않게)
      side.position.set(ro * Math.sin(th), sp.y - sp.r * 0.12, (sp.z || 0) + ro * Math.cos(th) * (sp.rz || 1)); side.rotation.y = th * 0.6; t.add(side);
      knot(side, sp.w * 0.6, 0, 0, 0);
      // 두 가닥이 옆머리를 따라 아래로 축 늘어짐 (한 가닥은 조금 더 바깥으로)
      const a = tieBlade(sp.len, sp.w); a.rotation.set(-(sp.lift || 0.15), 0, 0.5); side.add(a);
      const b = tieBlade(sp.len * 0.82, sp.w * 0.92); b.rotation.set(-(sp.lift || 0.15) * 0.8, 0.35, 0.18); side.add(b);
    }
    return t;
  }
  let tieOn = false;

  // ---------- 방석 (지붕 고정용) ----------
  function buildCushion(hex) {
const g = new THREE.Group();
const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.62, 0.16, 36), M(hex, 0.9));
base.position.y = 0.08; base.castShadow = true; base.receiveShadow = true; g.add(base);
const puff = sph(g, 0.56, M(hex, 0.9), 0, 0.15, 0, 1, 0.12, 1); puff.receiveShadow = true;
const edge = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.035, 8, 40), M(0xffffff, 0.8));
edge.rotation.x = Math.PI / 2; edge.position.y = 0.16; g.add(edge);
const strapMat = M(0x2b2d31, 0.8);
[-1, 1].forEach(sd => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.16), strapMat); s.position.set(sd * 0.63, 0.06, 0); g.add(s); });
return g;
  }

  // ---------- 펫 모델 (얼굴이 +z 방향) ----------
  function buildCorgi() {
// 포즈: 방석 앞 끝에 앞발 올리고 진행 방향을 봄 → 가끔 뒤(플레이어)를 돌아봄
const outer = new THREE.Group(); outer.rotation.y = Math.PI;
const g = new THREE.Group(); g.position.z = 0.2; g.rotation.x = 0.08; outer.add(g);
const O = M(0xe8913a), W = M(0xfff6ea), P = M(0xff8fa3, 0.5), K = M(0x1d1a1f, 0.3);
sph(g, 0.33, O, 0, 0.32, -0.08, 1, 0.92, 1.12);          // 몸
sph(g, 0.23, W, 0, 0.36, 0.16, 1, 1.12, 0.72);           // 흰 가슴
[-1, 1].forEach(sd => {
  sph(g, 0.15, O, sd * 0.24, 0.15, -0.14, 0.8, 0.95, 1.2); // 뒷다리
  sph(g, 0.085, W, sd * 0.13, 0.1, 0.36, 1, 1.0, 1.5);    // 앞발 (방석 끝에 걸침)
});
sph(g, 0.14, W, 0, 0.3, -0.42);                          // 식빵 엉덩이
const head = new THREE.Group(); head.position.set(0, 0.78, 0.08); g.add(head);
sph(head, 0.3, O, 0, 0, 0, 1.08, 0.96, 1);
sph(head, 0.21, W, 0, -0.07, 0.17, 1.05, 0.88, 0.72);    // 흰 얼굴
sph(head, 0.06, W, 0, 0.06, 0.25, 0.75, 1.3, 0.45);      // 이마 흰 줄
sph(head, 0.13, W, 0, -0.1, 0.27, 1.25, 0.82, 0.95);     // 주둥이
sph(head, 0.048, K, 0, -0.05, 0.39, 1.2, 0.9, 0.9);      // 코
const tongue = sph(head, 0.055, P, 0, -0.2, 0.32, 1, 0.65, 0.7);
eye(head, -0.13, 0.04, 0.26, 0.055); eye(head, 0.13, 0.04, 0.26, 0.055);
blush(head, -0.21, -0.07, 0.22, 0.06); blush(head, 0.21, -0.07, 0.22, 0.06);
const ears = [-1, 1].map(sd => {
  const pivot = new THREE.Group(); pivot.position.set(sd * 0.17, 0.2, -0.02); pivot.rotation.z = -sd * 0.32; head.add(pivot);
  const e = new THREE.Mesh(new THREE.ConeGeometry(0.135, 0.36, 14), O); e.position.y = 0.17; e.castShadow = true; pivot.add(e);
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 12), P); inner.position.set(0, 0.14, 0.06); pivot.add(inner);
  return pivot;
});
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
return { group: outer, tie: { parent: g, type: 'neck', y: 0.53, z: 0.13, r: 0.19, front: 0.3, len: 0.25, w: 0.11, tilt: -0.28 }, update(t, j) {
  // 6초마다 1.6초 동안 뒤돌아봄 (점프하면 바로 돌아봄)
  const c = t % 6, look = lobbyMode ? 0 : Math.max(ease((c - 3.8) / 0.35) * (1 - ease((c - 5.1) / 0.35)), j);
  head.rotation.y = look * 2.3; g.rotation.y = look * 0.75;
  head.rotation.z = Math.sin(t * 1.6) * 0.06 * (1 - look);
  head.rotation.x = j > 0 ? -0.15 * j : Math.sin(t * 1.1) * 0.03;
  ears.forEach((e, i) => { const sd = i ? 1 : -1; e.rotation.z = -sd * (0.32 + Math.sin(t * 13 + i) * 0.06 + j * 0.35); e.rotation.x = -0.15 - Math.abs(Math.sin(t * 9 + i)) * 0.12; });
  tongue.position.y = -0.2 + Math.sin(t * 7) * 0.012;
} };
  }

  function buildCat() {
// 컨셉: 식빵 굽는 고양이. 네 발을 몸 밑에 접어 넣은 동글납작한 식빵 덩어리 + 만족스러운 ^ω^ 표정
const outer = new THREE.Group();
const g = new THREE.Group(); g.position.z = 0.04; outer.add(g);
const O = M(0xf4a94f), D = M(0xd9792b), W = M(0xfff6ea), P = M(0xff9db0, 0.5), K = M(0x5a3a2a, 0.5);
// 식빵 모양 몸통: 구를 둥근 상자 쪽으로 눌러 만든 형태
const loafGeo = new THREE.SphereGeometry(1, 32, 24), lp = loafGeo.attributes.position;
for (let i = 0; i < lp.count; i++) {
  const f = v => Math.sign(v) * Math.pow(Math.abs(v), 0.62);
  lp.setXYZ(i, f(lp.getX(i)), f(lp.getY(i)), f(lp.getZ(i)));
}
loafGeo.computeVertexNormals();
const torso = new THREE.Group(); g.add(torso);
const loaf = new THREE.Mesh(loafGeo, O); loaf.scale.set(0.31, 0.2, 0.4); loaf.position.set(0, 0.2, -0.06); loaf.castShadow = true; torso.add(loaf);
// 등 줄무늬 (식빵 윗면에 얹힌 진한 줄)
[-0.32, -0.16, 0.0].forEach(z => { const st = new THREE.Mesh(loafGeo, D); st.scale.set(0.3, 0.035, 0.045); st.position.set(0, 0.395, z); st.userData.noOutline = true; torso.add(st); });
// 흰 가슴털 + 접어 넣은 앞발 끝
const bib = sph(torso, 0.17, W, 0, 0.17, 0.27, 1.25, 0.95, 0.55); bib.userData.noOutline = true;
[-1, 1].forEach(sd => sph(torso, 0.07, W, sd * 0.1, 0.045, 0.33, 1.15, 0.6, 0.9));
// 꼬리: 오른쪽 옆구리를 따라 앞까지 감싸 놓음
const curve = new THREE.CatmullRomCurve3([v(0.12, 0.06, -0.47), v(0.3, 0.05, -0.36), v(0.36, 0.05, -0.05), v(0.32, 0.05, 0.22), v(0.18, 0.05, 0.38)]);
function v(x, y, z) { return new THREE.Vector3(x, y, z); }
const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.055, 10, false), O); tailMesh.castShadow = true; torso.add(tailMesh);
if (TOON.on) { const tol = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.055 + 0.022, 10, false), OUTLINE); tol.userData.noOutline = true; torso.add(tol); }
const tip = sph(torso, 0.06, D, 0.18, 0.05, 0.38, 1, 1, 1.1);
// 머리: 식빵 앞쪽에 폭 묻힌 느낌
const head = new THREE.Group(); head.position.set(0, 0.44, 0.2); g.add(head);
sph(head, 0.24, O, 0, 0, 0, 1.2, 0.98, 1);
[-0.06, 0, 0.06].forEach((x, i) => { const m = sph(head, 0.028, D, x, 0.19, 0.12 - Math.abs(x) * 0.4, 0.55, 1.5, 0.5); m.rotation.z = -x * 4; m.userData.noOutline = true; });
[-1, 1].forEach(sd => { const m = sph(head, 0.1, W, sd * 0.06, -0.085, 0.18, 1, 0.78, 0.8); m.userData.noOutline = true; });
sph(head, 0.03, P, 0, -0.035, 0.255, 1.35, 0.85, 0.8);                 // 코
// 입: ω
[-1, 1].forEach(sd => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 6, 12, Math.PI), K); m.rotation.z = Math.PI; m.position.set(sd * 0.022, -0.075, 0.262); head.add(m); });
blush(head, -0.19, -0.05, 0.17, 0.055); blush(head, 0.19, -0.05, 0.17, 0.055);
const open = new THREE.Group(), shut = new THREE.Group(); head.add(open); head.add(shut);
eye(open, -0.11, 0.035, 0.205, 0.048); eye(open, 0.11, 0.035, 0.205, 0.048);
closedEye(shut, -0.11, 0.025, 0.228, 0.045); closedEye(shut, 0.11, 0.025, 0.228, 0.045);
const wm = M(0x8a7262, 0.6);
[-1, 1].forEach(sd => [0, 1, 2].forEach(k => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.007, 0.007), wm); w.position.set(sd * 0.22, -0.06 - k * 0.025, 0.15); w.rotation.z = sd * (0.12 - k * 0.12); w.userData.noOutline = true; head.add(w); }));
const ears = [-1, 1].map(sd => {
  const pivot = new THREE.Group(); pivot.position.set(sd * 0.15, 0.16, -0.01); pivot.rotation.z = -sd * 0.32; head.add(pivot);
  const e = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.17, 12), O); e.scale.z = 0.7; e.position.y = 0.075; e.castShadow = true; pivot.add(e);
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.11, 10), P); inner.scale.z = 0.5; inner.position.set(0, 0.06, 0.035); inner.userData.noOutline = true; pivot.add(inner);
  return pivot;
});
return { group: outer, tie: { parent: g, type: 'neck', y: 0.2, z: 0.22, r: 0.16, front: 0.37, len: 0.17, w: 0.085, tilt: -0.35 }, update(t, j) {
  // 평소엔 ^^ 만족한 눈, 7초마다 잠깐 눈 뜸 (점프하면 놀라서 뜸)
  const awake = j > 0 || (t % 7) > 6.1;
  open.visible = awake; shut.visible = !awake;
  torso.scale.set(1 + j * 0.06, 1 + Math.sin(t * 1.3) * 0.02 - j * 0.08, 1);   // 숨쉬기 / 점프 때 납작
  head.position.y = 0.44 + Math.sin(t * 1.3) * 0.008 + j * 0.04;
  head.rotation.z = Math.sin(t * 0.6) * 0.06;
  tip.position.y = 0.05 + Math.max(0, Math.sin(t * 2.6)) * 0.04;            // 꼬리 끝 까딱
  ears.forEach((e, i) => { const sd = i ? 1 : -1; e.rotation.z = -sd * (0.32 + ((t + i * 1.7) % 5 > 4.8 ? 0.3 : 0)); });
} };
  }

  function buildHamster() {
// 포즈: 찻잔 속에서 머리만 빼꼼, 앞발은 찻잔 테두리에 걸침
const g = new THREE.Group(), G = M(0xf0b46c), C = M(0xfff4e2), P = M(0xffa3b5, 0.5);
const body = new THREE.Group(); g.add(body);
sph(body, 0.38, G, 0, 0.36, -0.02, 1.0, 0.95, 0.95);
sph(body, 0.31, C, 0, 0.3, 0.08, 0.94, 0.9, 0.82);        // 흰 배·얼굴
const cheeks = [-1, 1].map(sd => sph(body, 0.12, C, sd * 0.19, 0.38, 0.2, 1, 0.9, 0.95));
blush(body, -0.2, 0.39, 0.31, 0.055); blush(body, 0.2, 0.39, 0.31, 0.055);
const eyes = new THREE.Group(); body.add(eyes);
eye(eyes, -0.12, 0.5, 0.31, 0.058); eye(eyes, 0.12, 0.5, 0.31, 0.058);
sph(body, 0.03, P, 0, 0.43, 0.37, 1.3, 1, 1);             // 코
[-1, 1].forEach(sd => { sph(body, 0.09, G, sd * 0.21, 0.68, 0.0, 1, 1, 0.45); sph(body, 0.055, P, sd * 0.21, 0.68, 0.03, 1, 1, 0.3); });
sph(body, 0.12, M(0xd99a52), 0, 0.72, -0.12, 1.4, 0.35, 1);  // 정수리 진한 털
const paws = [-1, 1].map(sd => sph(body, 0.05, P, sd * 0.11, 0.39, 0.41, 1.1, 0.8, 1.2));  // 테두리에 걸친 앞발
return { group: g, tie: { parent: body, type: 'head', y: 0.63, z: -0.01, r: 0.285, len: 0.36, lift: 0.75, w: 0.075 }, update(t, j) {
  // 천천히 오르내리며 두리번, 가끔 쏙 숨었다 나옴 (점프하면 놀라서 쏙)
  const c = t % 8, duck = c > 6.6 && c < 7.4 ? Math.sin((c - 6.6) / 0.8 * Math.PI) : 0;
  const d = Math.max(duck, j);
  body.position.y = Math.sin(t * 1.4) * 0.012 - d * 0.2;
  body.rotation.y = Math.sin(t * 0.8) * 0.25 * (1 - d);
  paws.forEach(p => p.visible = d < 0.35);
  cheeks.forEach(ch => ch.scale.x = 0.12 * (1 + d * 0.25));
} };
  }

  // 햄스터 전용 찻잔 (방석 대신)
  function buildCup(hex) {
const g = new THREE.Group(), H = 0.38, R = 0.43, r0 = 0.34;
const porcelain = M(0xfdfbf7, 0.5), band = M(hex, 0.7);
const side = new THREE.Mesh(new THREE.CylinderGeometry(R, r0, H, 36, 1, true), porcelain);
side.position.y = H / 2; side.castShadow = true; g.add(side);
const inner = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.02, r0 - 0.02, H, 36, 1, true), M(0xe9e2d6, 0.6));
inner.material.side = THREE.BackSide; inner.position.y = H / 2 + 0.005; inner.userData.noOutline = true; g.add(inner);
const bottom = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0 * 0.92, 0.04, 30), porcelain); bottom.position.y = 0.02; g.add(bottom);
const stripe = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.032, R - 0.05, 0.08, 36, 1, true), band);
stripe.position.y = H * 0.68; stripe.scale.setScalar(1.08); stripe.userData.noOutline = true; g.add(stripe);
const rimRing = new THREE.Mesh(new THREE.TorusGeometry(R, 0.022, 8, 40), porcelain); rimRing.rotation.x = Math.PI / 2; rimRing.position.y = H; g.add(rimRing);
const handle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.032, 8, 18), porcelain);
handle.position.set(R - 0.02, H * 0.52, 0); handle.rotation.y = 0; g.add(handle);
const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.5, 0.05, 40), porcelain); saucer.position.y = -0.0; g.add(saucer);
const strapMat = M(0x2b2d31, 0.8);
[-1, 1].forEach(sd => { const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.16), strapMat); st.position.set(0, 0.02, sd * 0.55); g.add(st); });
return g;
  }

  function buildRabbit() {
const g = new THREE.Group(), W = M(0xfbfaf7), Gy = M(0xe5dfd8), P = M(0xffa3b5, 0.5);
const hop = new THREE.Group(); g.add(hop);
sph(hop, 0.31, W, 0, 0.31, -0.06, 1, 1.05, 1.08);
sph(hop, 0.11, W, 0, 0.22, -0.4);                         // 솜뭉치 꼬리
[-1, 1].forEach(sd => { sph(hop, 0.1, W, sd * 0.15, 0.05, 0.16, 0.8, 0.5, 1.6); sph(hop, 0.07, W, sd * 0.1, 0.2, 0.25, 0.9, 1.3, 0.9); });
const head = new THREE.Group(); head.position.set(0, 0.7, 0.07); hop.add(head);
sph(head, 0.26, W, 0, 0, 0, 1.1, 0.95, 1);
[-1, 1].forEach(sd => sph(head, 0.085, W, sd * 0.05, -0.1, 0.2, 1, 0.82, 0.85));
sph(head, 0.028, P, 0, -0.05, 0.27, 1.3, 1, 1);
eye(head, -0.12, 0.03, 0.21, 0.052); eye(head, 0.12, 0.03, 0.21, 0.052);
blush(head, -0.19, -0.07, 0.19, 0.055); blush(head, 0.19, -0.07, 0.19, 0.055);
const ears = [-1, 1].map(sd => {
  const pivot = new THREE.Group(); pivot.position.set(sd * 0.09, 0.2, -0.02); head.add(pivot);
  sph(pivot, 0.085, W, 0, 0.24, 0, 1, 3.1, 0.55);
  sph(pivot, 0.05, P, 0, 0.24, 0.03, 1, 3.6, 0.35);
  return pivot;
});
ears[1].children.forEach(c => c.material = c.material);   // 오른쪽 귀는 살짝 접힘 (update에서 처리)
return { group: g, tie: { parent: hop, type: 'neck', y: 0.47, z: 0.0, r: 0.19, front: 0.24, len: 0.21, w: 0.1, tilt: -0.22 }, update(t, j) {
  const cyc = t % 3.2, h = cyc < 0.45 ? Math.sin(cyc / 0.45 * Math.PI) : 0;
  hop.position.y = (reduceMotion ? 0 : h * 0.18) + j * 0.15;
  ears[0].rotation.z = 0.12 + Math.sin(t * 1.5) * 0.05 - h * 0.15;
  ears[1].rotation.z = -0.35 - Math.sin(t * 1.5 + 1) * 0.05 + h * 0.15; // 한쪽 귀 접힘
  ears[1].rotation.x = 0.35;
  ears.forEach(e => e.rotation.x = (e === ears[1] ? 0.35 : -0.1) - j * 0.5);
  head.rotation.z = Math.sin(t * 0.9) * 0.05;
} };
  }

  function buildParrot() {
const g = new THREE.Group(), Gr = M(0x58c45a, 0.6), Dg = M(0x2f9a49, 0.6), Pe = M(0xff8a5c, 0.55), Y = M(0xffd54a, 0.55), B = M(0x2f8fd0, 0.6), Bk = M(0xe8403a, 0.4), Ft = M(0x9b8f86, 0.7);
sph(g, 0.24, Gr, 0, 0.42, -0.02, 1, 1.32, 1);
sph(g, 0.19, M(0x8bdb6a, 0.6), 0, 0.38, 0.1, 0.95, 1.2, 0.8);  // 밝은 배
const wings = [-1, 1].map(sd => { const w = sph(g, 0.17, Dg, sd * 0.2, 0.44, -0.04, 0.38, 1.12, 0.85); w.rotation.z = sd * 0.18; return w; });
const tail = sph(g, 0.1, B, 0, 0.2, -0.3, 0.7, 0.3, 2.2); tail.rotation.x = 0.55;
[-1, 1].forEach(sd => sph(g, 0.045, Ft, sd * 0.08, 0.04, 0.06, 1.3, 0.5, 1.4));
const head = new THREE.Group(); head.position.set(0, 0.8, 0.04); g.add(head);
sph(head, 0.21, Gr, 0, 0, -0.02);
sph(head, 0.175, Pe, 0, -0.02, 0.09, 1, 0.98, 0.75);       // 복숭아색 얼굴
sph(head, 0.11, Y, 0, -0.12, 0.08, 1.3, 0.6, 0.8);
const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.13, 12), Bk);
beak.rotation.x = Math.PI / 2 + 0.55; beak.position.set(0, -0.04, 0.24); head.add(beak);
[-1, 1].forEach(sd => {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.013, 8, 18), M(0xffffff, 0.5));
  ring.position.set(sd * 0.1, 0.04, 0.205); head.add(ring);
  eye(head, sd * 0.1, 0.04, 0.2, 0.045);
});
sph(head, 0.05, Gr, 0, 0.2, -0.02, 0.6, 1.3, 1);           // 머리깃
return { group: g, tie: { parent: head, type: 'head', y: 0.13, z: -0.02, r: 0.172, len: 0.3, w: 0.065 }, update(t, j) {
  const bob = Math.sin(t * 2.4);
  head.rotation.z = bob > 0.7 ? 0.32 : Math.sin(t * 0.8) * 0.05;  // 갸웃
  head.position.y = 0.8 + Math.max(0, Math.sin(t * 5)) * 0.025;
  const flap = j > 0 ? Math.sin(t * 40) * 0.6 : 0;
  wings.forEach((w, i) => { const sd = i ? 1 : -1; w.rotation.z = sd * (0.18 + Math.abs(flap)); });
  tail.rotation.x = 0.55 + Math.sin(t * 3) * 0.05;
} };
  }

  function buildTurtle() {
const g = new THREE.Group(), Sh = M(0x4f9a46, 0.55), Sp = M(0x7cc26a, 0.55), Rim = M(0xd9b46a, 0.7), Sk = M(0xb3d977, 0.65);
const shellGeo = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const shell = new THREE.Mesh(shellGeo, Sh); shell.scale.set(0.42, 0.34, 0.48); shell.position.y = 0.1; shell.castShadow = true; g.add(shell);
const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 32), Rim); rim.scale.z = 1.14; rim.position.y = 0.1; g.add(rim);
// 등껍질 육각 무늬
const hexGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.02, 6);
const spots = [[0, Math.PI / 2]].concat([0, 1, 2, 3, 4, 5].map(k => [k * Math.PI / 3 + Math.PI / 6, 0.62]));
spots.forEach(([az, el]) => {
  const n = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  const p = new THREE.Vector3(n.x * 0.42, n.y * 0.34 + 0.1, n.z * 0.48);
  const h = new THREE.Mesh(hexGeo, Sp); h.position.copy(p);
  h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(n.x / 0.42, n.y / 0.34, n.z / 0.48).normalize());
  h.scale.set(el > 1 ? 1.2 : 0.85, 1, el > 1 ? 1.2 : 0.85); g.add(h);
});
[[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => sph(g, 0.09, Sk, sx * 0.3, 0.07, sz * 0.3, 1, 0.6, 1.25));
const tailC = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 10), Sk); tailC.rotation.x = -Math.PI / 2 - 0.3; tailC.position.set(0, 0.1, -0.56); g.add(tailC);
const head = new THREE.Group(); head.position.set(0, 0.2, 0.5); g.add(head);
head.scale.setScalar(1.12);
sph(head, 0.16, Sk, 0, 0, 0, 1, 0.92, 1.05);
const open = new THREE.Group(), shut = new THREE.Group(); head.add(open); head.add(shut);
eye(open, -0.075, 0.04, 0.12, 0.042); eye(open, 0.075, 0.04, 0.12, 0.042);
closedEye(shut, -0.075, 0.035, 0.145, 0.032); closedEye(shut, 0.075, 0.035, 0.145, 0.032);
blush(head, -0.11, -0.03, 0.11, 0.04); blush(head, 0.11, -0.03, 0.11, 0.04);
const smile = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 12, Math.PI), EYE); smile.rotation.z = Math.PI; smile.position.set(0, -0.035, 0.155); head.add(smile);
return { group: g, tie: { parent: head, type: 'head', y: 0.09, z: 0.0, r: 0.135, rz: 1.05, len: 0.26, w: 0.055 }, update(t, j) {
  const peek = (Math.sin(t * 0.6) + 1) / 2;           // 천천히 머리 넣었다 빼기
  head.position.z = 0.42 + peek * 0.12 - j * 0.1;
  head.rotation.y = Math.sin(t * 0.4) * 0.2;
  const blink = (t % 5) > 4.75; open.visible = !blink; shut.visible = blink;
} };
  }

  const PETS = [
{ id: 'corgi',   name: '웰시코기', faceSign: -1, build: buildCorgi,   cushion: 0x8ecae6, persona: '충성스러운 내 편. 앞발을 방석 끝에 올리고 앞을 보다가, 가끔 뒤돌아 주인을 봐요.', cond: '첫 펫', price: '무료', direct: '무료' },
{ id: 'cat',     name: '치즈냥',   faceSign: 1, build: buildCat,     cushion: 0x9fdcbc, persona: '식빵 굽는 잠꾸러기. 네 발을 쏙 접어 넣고 만족스럽게 졸다가 가끔 눈을 떠요.', cond: '출근길 첫 클리어', price: '600C', direct: '1200C' },
{ id: 'hamster', name: '햄스터',   faceSign: 1, build: buildHamster, cushion: 0xcbb8ea, prop: buildCup, holderY: 0.0, persona: '겁 많은 쫄보. 찻잔 속에서 빼꼼 내다보고, 점프하면 쏙 숨어요.', cond: '퇴근길 무한모드 플레이', price: '375C', direct: '750C' },
{ id: 'rabbit',  name: '토끼',     faceSign: 1, build: buildRabbit,  cushion: 0xf5a9a9, persona: '활발한 점프 친구. 가끔 폴짝 뛰고, 한쪽 귀가 살짝 접혀 있어요.', cond: '누적 점프 30회', price: '375C', direct: '750C' },
{ id: 'parrot',  name: '앵무새',   faceSign: 1, build: buildParrot,  cushion: 0xf6e3a1, persona: '수다쟁이 모란앵무. 고개를 갸웃거리며 잔소리를 따라 해요.', cond: '서로 다른 대사 20개 보기', price: '450C', direct: '900C' },
{ id: 'turtle',  name: '거북이',   faceSign: 1, build: buildTurtle,  cushion: 0xf7c59f, persona: '느긋한 평화주의자. 머리를 천천히 넣었다 뺐다 해요.', cond: '감속 능력 20회 사용', price: '750C', direct: '1500C' }
  ];


    // 차종별 탑승 자리 (방석 바닥 높이 · 앞뒤 위치). 오픈카는 트렁크 위
    const MOUNT = { roadster: { y: 0.895, z: 1.62 }, santafe: { y: 2.70, z: 0.90 }, pony: { y: 2.00, z: 0.45 }, sonata: { y: 1.35, z: 0.35 }, grandeur: { y: 1.83, z: 0.15 } };
    const cache = {};
    let cur = null, model = 'roadster';
    function get(id) {
        if (cache[id]) return cache[id];
        const def = PETS.find(p => p.id === id) || PETS[0];
        const root = new THREE.Group();
        root.add(def.prop ? def.prop(def.cushion) : buildCushion(def.cushion));
        const holder = new THREE.Group(); holder.position.y = def.holderY ?? 0.17; root.add(holder);
        const m = def.build(); holder.add(m.group);
        addOutlines(root);
        const tie = m.tie ? buildTie(m.tie) : null;   // 외곽선은 넥타이가 직접 가짐
        if (tie) { m.tie.parent.add(tie); tie.visible = tieOn; }
        root.traverse(o => { if (o.isMesh && o.material !== OUTLINE) o.castShadow = true; });
        return (cache[id] = { id, def, root, holder, model: m, tie });
    }
    return {
        cushionOf: id => (PETS.find(p => p.id === id) || PETS[0]).cushion,
        setLobby(v) { lobbyMode = v; },
        // 김부장 넥타이 착용/해제 (모든 반려동물에 한 번에)
        setTie(v) { tieOn = !!v; Object.values(cache).forEach(c => { if (c.tie) c.tie.visible = tieOn; }); },
        mount(carMesh, carModel, id) {
            model = carModel;
            if (!id) { if (cur && cur.root.parent) cur.root.parent.remove(cur.root); cur = null; return null; }   // 반려동물 없이
            cur = get(id);
            const mt = MOUNT[carModel] || MOUNT.pony;
            cur.root.position.set(0, mt.y, mt.z); cur.holder.rotation.y = 0;
            carMesh.add(cur.root);
            return cur;
        },
        mountPoint() { return MOUNT[model] || MOUNT.pony; },
        get current() { return cur; },
        tick(t, j, dt) {
            if (!cur) return;
            cur.model.update(reduceMotion ? 0 : t, j);
            if (!lobbyMode) cur.holder.rotation.y += (0 - cur.holder.rotation.y) * Math.min(1, dt * 3);
        }
    };
})();

// 입양 정보: 조건을 달성하면 할인가(price), 아니면 바로 입양가(direct)
const PET_INFO = [
    { id: 'corgi',   species: '웰시코기', persona: '앞을 보다 가끔 뒤돌아봐요', cond: '첫 반려동물', price: 0, direct: 0, met: () => true, progress: () => '' },
    // direct = 바로 입양가 (기존의 1.5배), price = 조건 달성 시 50% 할인가
    { id: 'cat',     species: '치즈냥',   persona: '식빵 굽는 잠꾸러기', cond: '출근길 첫 클리어', price: 600, direct: 1200,
      met: () => (userData.best.morning || 0) >= 60, progress: () => '미달성' },
    { id: 'hamster', species: '햄스터',   persona: '찻잔 속에서 빼꼼', cond: '퇴근길 무한모드 플레이', price: 375, direct: 750,
      met: () => userData.stats.eveningEndless >= 1, progress: () => `${Math.min(1, userData.stats.eveningEndless)}/1판` },
    { id: 'rabbit',  species: '토끼',     persona: '가끔 폴짝 뛰어요', cond: '누적 점프 30회', price: 375, direct: 750,
      met: () => userData.stats.jumps >= 30, progress: () => `${Math.min(30, userData.stats.jumps)}/30회` },
    { id: 'parrot',  species: '앵무새',   persona: '고개를 갸웃거려요', cond: '서로 다른 대사 20개 보기', price: 450, direct: 900,
      met: () => userData.stats.quotes.length >= 20, progress: () => `${Math.min(20, userData.stats.quotes.length)}/20개` },
    { id: 'turtle',  species: '거북이',   persona: '느긋한 평화주의자', cond: '감속 능력 20회 사용', price: 750, direct: 1500,
      met: () => userData.stats.slows >= 20, progress: () => `${Math.min(20, userData.stats.slows)}/20회` }
];
const PET_IDS = PET_INFO.map(p => p.id);

// 반려동물 리액션: "울음소리 (속마음)" 형식
const PET_LINES = {
    corgi: {
        start: ['왈! (출발이다 주인!)', '멍멍! (오늘도 내가 지켜줄게)', '왈왈! (창문 열어줘! 바람 맞을래)'],
        nag:   ['왈왈!! (우리 주인 건드리지 마!)', '으르릉… (말이 좀 심하시네)', '멍! (주인은 최선을 다하고 있다구!)'],
        jump:  ['왈~! (날았다!)', '멍?! (나도 같이 날았어!)'],
        late:  ['왈왈왈! (서둘러! 10초 남았어!)', '멍!! (꼬리 프로펠러 가동!)'],
        crash: ['깨갱… (주인 괜찮아?)', '낑… (다음엔 내가 앞을 더 잘 볼게)'],
        win:   ['왈왈! (해냈다! 간식 줘!)', '멍~! (역시 우리 주인 최고)'],
        hello: ['왈! (잘 부탁해 주인!)', '멍멍! (같이 달리자!)']
    },
    cat: {
        start: ['…냥 (깨우지 마)', '냐아… (도착하면 깨워)'],
        nag:   ['…냥. (시끄러워)', '하암~ (또 저 소리야)', '냥? (나한텐 안 들려)'],
        jump:  ['냐앙?! (식빵이 흔들렸잖아)', '…! (방금 꿈이었지?)'],
        late:  ['냥. (10초면 한숨 더 잘 수 있겠다)', '냐아… (서두르는 건 집사 몫)'],
        crash: ['…냥. (그럴 줄 알았다)', '캬악! (내 낮잠 돌려내)'],
        win:   ['냥~ (도착했으면 츄르)', '골골골… (나쁘지 않았어)'],
        hello: ['…냥 (이 방석 마음에 드네)', '골골… (집사로 임명한다)']
    },
    hamster: {
        start: ['찍! (벌써 출발해?!)', '찌익… (찻잔 꽉 잡았어)'],
        nag:   ['찍?! (무, 무서워…)', '찌익… (찻잔 속에 숨을래)', '찍찍! (해바라기씨 줄 테니 그만해요)'],
        jump:  ['찌이익!!! (살려줘!)', '찍?! (볼에 넣어둔 씨앗 떨어질 뻔)'],
        late:  ['찍찍찍! (빨리빨리빨리!)', '찍! (쳇바퀴보다 빨리 달려!)'],
        crash: ['찍… (기절한 척해야지)', '찌익… (씨앗 다 쏟았어…)'],
        win:   ['찍~! (볼 빵빵 축하!)', '찍찍! (살았다! 해바라기씨 파티!)'],
        hello: ['찍! (안녕… 나 좀 숨어도 돼?)', '찌익~ (찻잔 아늑하다)']
    },
    rabbit: {
        start: ['뿅! (달리기다!)', '킁킁! (바람 냄새 좋다)'],
        nag:   ['킁? (저 사람 왜 화났어?)', '뿅뿅! (내가 대신 뛰어갈까?)', '…킁 (귀 접고 못 들은 척)'],
        jump:  ['뿅~! (한 번 더! 한 번 더!)', '뿌잉! (점프는 내 전문이야)'],
        late:  ['뿅뿅뿅! (10초! 깡총깡총!)', '킁! (마지막 스퍼트!)'],
        crash: ['뿌엥… (귀 아파…)', '킁… (괜찮아, 다시 뛰면 돼)'],
        win:   ['뿅뿅! (승리의 점프!)', '뿌잉~ (당근 주세요!)'],
        hello: ['뿅! (같이 뛰어놀자!)', '킁킁~ (새 친구 냄새!)']
    },
    parrot: {
        start: ['출발! 출발! (꽉 잡아!)', '빠르게! 빠르게!'],
        nag:   ['또 잔소리! 또 잔소리!'],
        nagBy: {
            morning: ['시말서! 시말서!', '지각이야! 지각이야!', '뛰어와! 당장! 뛰어와!'],
            evening: ['계란 한 판! 계란 한 판!', '치킨 식는다! 치킨 식는다!', '소파에서 자! 소파에서 자!'],
            night:   ['언제 도착해? 언제 도착해?', '비행기 간다! 비행기 간다!', '화장실! 화장실!']
        },
        jump:  ['날았다! 날았다!', '나도 날 줄 알아! 짹!'],
        late:  ['10초! 10초! 서둘러!', '늦는다! 늦는다!'],
        crash: ['쾅! 쾅! (깃털 다 빠졌어)', '다시! 다시!'],
        win:   ['도착! 도착! 짝짝짝!', '최고야! 최고야!'],
        hello: ['안녕! 안녕! 반가워!', '이름이 뭐야? 이름이 뭐야?']
    },
    turtle: {
        start: ['…… (천천히 가자)', '느릿~ (서두르면 체해)'],
        nag:   ['…… (인생은 기니까)', '느릿… (화내면 주름 생겨요)', '…음? (뭐라고 하셨나요)'],
        jump:  ['……!! (등껍질 속으로 쏙)', '어이쿠… (이 나이에 점프라니)'],
        late:  ['…… (10초면 아직 넉넉해)', '느릿… (조급해하지 말아요)'],
        crash: ['…… (등껍질이 있어서 다행이야)', '끄응… (천천히 가자고 했잖아)'],
        win:   ['…… (거봐, 결국 도착하잖아)', '느릿~ (토끼보다 빨랐다)'],
        hello: ['…… (반갑구려)', '느릿~ (오래오래 함께해요)']
    }
};
// 잔소리 대사별 맞춤 대답: [코스][대사 번호] = [웰시코기, 치즈냥, 햄스터, 토끼, 앵무새, 거북이] (QUOTES 순서와 같음)
const PET_NAG_REACT = {"morning":[["왈! (주인 지금 날아오는 중이거든요!)","…냥 (곧 가. 재촉하지 마)","찍! (주, 주인 오는 중이에요!)","뿅! (지금 깡총깡총 가는 중이에요!)","언제 오는거야! 언제 오는거야! (지금 가요!)","…… (곧 갑니다. 너무 재촉 마시오)"],["으르릉… (기어오다뇨, 우리 주인 달리는 중이에요)","캬악 (기어오는 건 부장님이겠지)","찌익… (기어오다니… 너무해요)","킁! (기어오는 거 아니고 뛰어오는 중이에요!)","기어와! 기어와! (기는 건 거북이죠!)","어흠… (기는 건 제 전문이지요, 주인은 아니오)"],["멍! (그건 부장님 때 얘기고요!)","하암~ (컴퓨터 켜놓고 졸았겠지)","찍찍! (그땐 차가 안 막혔대요!)","킁킁? (그럼 10분 더 일하신 거네요)","나때는! 나때는! (또 시작이네)","느릿… (그 시절은 그 시절이지요)"],["왈왈!! (시말서는 제가 물어뜯을게요)","…냥. (시말서는 내 방석으로 쓸게)","찌익?! (시말서 싫어! 씨앗으로 막을게요)","뿌잉! (시말서 대신 당근 드릴게요)","시말서! 시말서! (난 안 써요!)","…… (시말서 한 장에 인생 안 바뀝니다)"],["멍! (김대리는 김대리, 우리 주인은 우리 주인!)","냥. (김대리는 김대리 집사나 하라 그래)","찍… (김대리님은 집이 가깝대요!)","뿅! (우리 주인은 막판 역전 스타일!)","김대리! 김대리! (김대리가 누군데!)","어흠 (남과 비교하면 주름만 늘지요)"],["왈! (진짜 막히는 거 제가 봤어요!)","…냥 (진짜 막혀. 내가 증인이다)","찍찍! (진짜 막혀요! 제 볼처럼 꽉꽉!)","킁! (진짜 막혀요! 제 귀로 들었어요)","핑계! 핑계! (진짜 막힌다고요!)","…… (막히는 건 핑계가 아니라 사실이지요)"],["멍멍! (보고서는 주인 머릿속에 다 있어요)","골골… (보고서보다 낮잠이 중요해)","찍?! (보고서… 주인 다 했을 거예요!)","뿅뿅! (보고서는 주인 가방에 있어요!)","보고서! 보고서! (주인이 다 했어!)","느릿~ (보고서는 도착해서 차분히)"],["왈! (주인도 일찍 나왔다고요!)","냐아… (일찍은 고양이한테 실례야)","찌익… (주인 일찍 나왔는데…)","킁… (주인도 일찍 나왔는데요)","일찍 일찍! (주인도 일찍 나왔어!)","…… (일찍보다 무사히가 먼저입니다)"],["으르릉… (그 자리는 제가 지키고 있을게요)","…냥 (빈자리면 내가 가서 식빵 굽지)","찍! (자리는 금방 채워질 거예요!)","뿅! (곧 채울게요! 기다리세요!)","비어있네! 비어있네! (곧 채운다!)","어흠… (자리는 도망가지 않습니다)"],["왈왈! (뛰는 건 제가 할게요, 주인은 운전!)","냥? (고양이는 뛰지 않는다)","찌이익!! (뛰라니! 차 타고 있잖아요!)","뿅뿅! (뛰는 건 내 전문인데, 차가 더 빨라요!)","뛰어와! 당장! (우린 날아간다!)","…… (뛰면 넘어집니다)"],["멍? (그때랑 지금은 달라요멍)","하암~ (걸레질 자랑 또 시작이야)","찍… (새벽 5시는 햄스터도 자는 시간이에요)","킁? (새벽 5시는 너무해요)","걸레질! 걸레질! (자랑 그만!)","느릿… (새벽 걸레질이라… 무릎 조심하시오)"],["으르릉! (근성이라면 우리 주인이 최고예요)","캬악! (근성 없는 건 저 잔소리야)","찍찍! (우리 주인 근성 있어요! 진짜예요!)","뿌잉!! (우리 주인 근성 최고예요!)","근성! 근성! (우리 주인 근성 최고!)","어흠! (뛰라니, 차로 가는 게 맞지요)"],["왈왈왈!! (사표는 무슨! 절대 안 돼요!)","…냥. (사표는 내가 발로 밀어 떨어뜨릴게)","찌익!!! (사표 안 돼요! 해바라기씨 못 사요!)","뿅?! (사표는 안 돼요! 당근 못 사요!)","사표! 사표! (절대 안 돼!)","…… (사표는 함부로 쓰는 게 아니오)"],["으르릉!!! (복도 근무라니, 제가 가만 안 있어요)","캬악!! (복도라니. 우리 집사한테 무슨 짓이야)","찍?! (복도 근무라니… 제 찻잔 빌려줄게요)","킁!! (복도 근무라니! 귀 쫑긋 항의할래요)","복도 근무! 복도 근무! (그건 너무해!)","어흠!! (복도 근무라니, 그건 지나치시오)"],["왈!! (부모님 얘기는 선 넘었어요!)","…냥!! (부모님 얘기는 선 넘었다)","찌익… (그 말은 너무 심해요…)","뿌엥… (부모님 얘기는 너무해요)","시간 개념! 시간 개념! (부모님 얘긴 반칙!)","…… (부모님 얘기는 하는 게 아니오)"],["왈왈! (세 장이면 제가 다 물어갈 거예요)","냥. (세 장이면 내가 다 찢어줄게)","찍찍찍! (시말서 세 장 제가 갉아먹을게요!)","뿅! (세 장이면 종이비행기 세 개!)","세 장! 세 장! (한 장도 안 써!)","느릿… (세 장이나요? 화 좀 가라앉히시오)"]],"evening":[["멍! (주인, 아이 픽업은 꼭 해야 해요)","…냥 (아이 픽업은 해야지. 당연한 거야)","찍! (아기 픽업은 꼭 해요 주인!)","뿅! (아기 데리러 가요! 신난다!)","픽업! 픽업! (아기 데리러 가야지!)","…… (아이 마중은 미루면 안 되지요)"],["왈… (설거지는… 주인 차례 맞아요)","냐아… (설거지 미루면 혼나는 게 맞아)","찌익… (설거지… 주인 차례 맞아요)","킁… (설거지는 주인 차례 맞아요)","설거지! 설거지! (주인 차례 맞아!)","어흠 (설거지는 주인 차례가 맞소)"],["멍멍! (오늘 저녁 주인 담당 맞죠? 저도 기대할게요)","골골… (저녁 당번이면 츄르도 준비해)","찍~ (저녁 당번이에요 주인! 저는 씨앗이요)","뿌잉~ (주인 요리 당번! 당근 넣어줘요)","오빠가! 오빠가! (오늘 요리 당번!)","느릿~ (저녁 당번이면 장 볼 생각부터 하시오)"],["왈! (바로 가요! 제가 길 안내할게요)","…냥 (바로 가. 나도 집에 가고 싶어)","찍! (바로 집으로! 딴 데 가면 무서워요)","뿅! (곧장 집으로! 깡총!)","바로 와! 바로 와! (새지 마 주인!)","…… (바로 가시오. 집이 최고요)"],["멍! (분리수거 잊으면 안 돼요 주인!)","냥. (분리수거는 집사 일이야)","찍찍! (분리수거 오늘까지래요!)","킁킁! (분리수거 잊으면 안 돼요!)","분리수거! 분리수거! (오늘까지래!)","어흠… (분리수거는 오늘 하는 게 맞소)"],["왈~ (계란 한 판! 제가 기억해 둘게요)","냥~ (계란 말고 츄르도 사)","찍! (계란 한 판! 해바라기씨도 한 봉지!)","뿅~ (계란 한 판이랑 당근 하나!)","계란 한 판! 계란 한 판! (잊지 마!)","느릿~ (계란은 깨지지 않게 조심히)"],["멍멍! (진짜 막혀요! 주인 잘못 아니에요)","…냥 (막혀. 집사 잘못 아니야)","찌익… (차가 너무 많아서 그래요…)","킁… (차가 너무 많아요, 주인 탓 아니에요)","차 막혀! 차 막혀! (진짜 막혀요!)","…… (차가 막혀서 그렇소. 주인 탓 아니오)"],["왈! (목욕은 주인 담당! 저는 물은 싫어요)","냐아… (씻기는 건 집사 몫. 나는 빼줘)","찍! (씻겨야죠! 저는 모래 목욕이요)","뿅! (목욕 시간! 거품 놀이 하자!)","애 씻겨! 애 씻겨! (주인 담당!)","어흠 (아이 목욕은 따뜻한 물로 오래오래)"],["왈왈!! (치킨이다! 주인 밟아요!)","냥!! (치킨이면 서둘러야지)","찍찍!! (치킨! 서둘러요 주인!)","뿌잉!! (치킨! 빨리 가요!)","치킨! 치킨! (식기 전에!)","…… (치킨은 식기 전이 제일이지요)"],["멍… (오늘 주인 고생 많이 했어요)","골골… (오늘 고생했어. 특별히 쓰다듬게 해줄게)","찍… (주인 오늘 많이 힘들었어요)","킁… (오늘 주인 고생 많았어요)","별 일 없었어? 별 일 없었어? (주인 고생했어!)","느릿… (오늘도 무사히 버텼소, 장하오)"],["으르릉… (옆집은 옆집! 비교는 반칙이에요)","캬악 (옆집 남편 얘기는 반칙이야)","찌익… (옆집이랑 비교는 무서워요…)","킁! (옆집은 옆집! 우리 주인도 최고예요)","옆집 남편! 옆집 남편! (비교는 반칙!)","어흠! (옆집과 비교는 안 하는 게 좋소)"],["왈! (지금도 날아가는 중이에요!)","…냥 (지금도 날고 있다고)","찍! (지금도 열심히 날아가요!)","뿅! (지금도 날아가는 중이에요!)","날아오더니! 날아오더니! (지금도 날아가는 중!)","…… (지금도 마음만은 날아가는 중이오)"],["멍! (이번엔 진짜 거의 다 왔어요!)","냥. (이번엔 진짜야. 내가 봤어)","찍찍! (이번엔 진짜 거의 다 왔어요!)","뿅뿅! (이번엔 진짜 거의 다 왔어요!)","거의 다 왔어! 거의 다 왔어! (이번엔 진짜!)","느릿… (이번엔 정말 거의 다 왔소)"],["낑… (소파는 안 돼요! 제가 같이 빌어줄게요)","냐앙… (소파는 내 자리야. 그건 안 돼)","찌이익!! (소파 안 돼요! 제가 대신 빌게요)","뿌엥… (소파는 안 돼요! 같이 빌어요)","소파! 소파! (그건 안 돼!)","…… (소파에서 자면 허리 상하오. 그건 아니오)"],["왈왈!! (안 돼요! 주인 치킨 지켜주세요!)","캬악!! (집사 치킨은 내가 지킨다)","찍?! (주인 치킨! 제 볼에 숨겨둘게요!)","킁!! (주인 치킨 남겨주세요!)","내가 먹는다! 내가 먹는다! (주인 거 남겨줘!)","어흠… (주인 몫은 남겨 두시오)"]],"night":[["멍멍! (꼬마 말이 맞아요, 조금만 더 빨리!)","…냥 (꼬마가 기다려. 서둘러 집사)","찍! (금방 가요 꼬마야! 주인 서둘러요!)","뿅! (금방 가! 주인 조금만 더 빨리!)","언제 도착해? 언제 도착해? (꼬마 말 맞아!)","…… (곧 간다 꼬마야, 주인이 힘내는 중이오)"],["왈! (걱정 마 꼬마야, 내가 주인 재촉할게)","냥 (꼬마 말이 맞아. 좀 밟아)","찌익… (꼬마 말 맞아요, 좀 더 빨리!)","킁… (꼬마 말이 맞아요, 서둘러요!)","비행기 못 타! 비행기 못 타! (서둘러 주인!)","어흠 (꼬마 걱정이 맞소. 서두르시오 주인)"],["왈왈! (꼬마가 화났어요! 주인 서둘러요!)","냐앙 (꼬마가 화났다. 집사 탓이야)","찍! (꼬마 화났어요! 주인 밟아요!)","뿅뿅! (꼬마 화났다! 주인 깡총!)","아빠 미워! 아빠 미워! (꼬마 화났다!)","…… (꼬마가 화났소. 주인이 분발해야지)"],["낑… (주인! 휴게소 급해요!)","…냥! (휴게소 급하다. 꼬마 편이야)","찍찍! (휴게소! 휴게소 급해요!)","킁킁! (휴게소 급해요 주인!)","화장실! 화장실! (휴게소 급해!)","느릿… (휴게소부터 들르시오, 급하오)"],["멍! (꼬마야 조금만 참자, 주인 달린다!)","하암~ (꼬마야, 조금만. 집사 달린다)","찍~ (조금만 참자 꼬마야)","뿅~ (조금만 더! 같이 숫자 세자 꼬마야)","얼마나 더! 얼마나 더! (조금만!)","…… (조금만 더 가면 된다 꼬마야)"],["왈왈! (비행기 놓치면 안 돼! 주인 밟아요!)","냥! (비행기 놓치면 꼬마 운다. 서둘러)","찌익?! (비행기 놓치면 안 돼요!)","뿅?! (비행기 놓치면 안 돼! 밟아요 주인!)","비행기 날아간다! 비행기 날아간다! (밟아 주인!)","어흠! (비행기는 기다려주지 않소. 서두르시오)"],["왈왈왈! (다 비켜라! 꼬마랑 나 지나간다!)","…냥 (그래, 다 비켜라)","찍찍! (다 비켜 주세요~!)","뿅뿅뿅! (다 비켜라~!)","다 비켜라! 다 비켜라! (꼬마 최고!)","느릿~ (그래, 다들 비켜 주시오)"],["멍… (꼬마 말도 일리는 있어요 주인)","냥. (꼬마 눈은 정확하지)","찍… (꼬마 말이 조금 맞아요…)","킁… (꼬마 말도 맞아요 주인)","운전 짱 못해! 운전 짱 못해! (꼬마 말 인정!)","…… (꼬마 눈이 정확하오)"],["왈~ (나도 놀고 싶어! 같이 놀자 꼬마야)","골골… (나도 노는 거 좋아해, 꼬마야)","찍! (나도 놀고 싶어 꼬마야!)","뿌잉~ (나도 놀고 싶어! 깡총깡총!)","놀고 싶어! 놀고 싶어! (나도!)","느릿~ (놀 땐 실컷 노는 거요, 꼬마야)"],["멍멍! (나도 창밖 구경 중이야!)","…냥 (창밖 새 구경은 나도 좋아)","찍~ (나도 찻잔에서 구경 중이야!)","킁킁~ (나도 창밖 구경 좋아!)","재밌다! 재밌다! (구경 최고!)","…… (창밖 구경, 그게 여행의 묘미지)"],["왈?! (진짜다… 거북이한테 졌어요 주인)","냥?! (거북이한테 졌다고? 부끄럽다 집사)","찌익?! (거북이한테 졌어요 주인!)","뿅?! (거북이한테 지다니! 주인 분발!)","거북이 추월! 거북이 추월! (분발해 주인!)","……!! (그게 나요. 미안하오)"],["멍! (꼬마가 게임을 잘 아네요)","…냥 (꼬마 말 인정)","찍… (꼬마 말이 맞아요…)","킁! (꼬마 말 인정!)","게임오버! 게임오버! (꼬마 말이 맞아!)","어흠 (꼬마 말에 반박할 수가 없소)"],["낑… (내비도 꼬마 편이네요)","하암~ (내비도 꼬마 편이네)","찌익… (내비도 꼬마 편이에요)","뿌엥… (내비도 꼬마 편이래요)","포기하세요! 포기하세요! (그래도 포기는 안 돼!)","…… (내비도 꼬마 편이구려)"],["멍… (주인, 꼬마 말 들었죠? 분발해요)","냥. (꼬마 말 틀린 거 하나 없다)","찍! (꼬마 말 들었죠? 서둘러요!)","킁… (꼬마 말 들었죠 주인?)","안 기다릴 듯! 안 기다릴 듯! (꼬마 예리해!)","느릿… (꼬마 말이 틀린 데가 없소)"],["왈! (안 돼 꼬마야! 내가 대신 뛸게!)","…냥 (뛰지 마 꼬마야, 집사가 갈게)","찍?! (뛰지 마 꼬마야! 위험해!)","뿅! (뛰는 건 내가 할게 꼬마야!)","뛰어갈까? 뛰어갈까? (뛰지 마 꼬마야!)","어흠! (뛰지 마라 꼬마야, 넘어진다)"],["멍멍! (할머니 차 빨라요, 주인 분발!)","냥. (할머니 차가 더 빠른 거 맞아)","찍… (할머니 차가 더 빠르대요 주인)","킁… (할머니 차 진짜 빨라요 주인)","할머니 차! 할머니 차! (할머니 최고!)","…… (할머니 차가 빠른 건 사실이오)"],["왈? (주인… 설마 일부러예요?)","…냥? (설마 졸면서 운전하는 거야?)","찍? (설마요… 주인 진짜예요?)","뿅? (주인 설마… 일부러요?)","일부러? 일부러? (설마 주인!)","느릿… (천천히 가는 게 내 철학이긴 하오만)"],["낑… (자전거 형아 빨랐어요…)","냐아… (자전거한테도 졌네)","찌익… (자전거 형아 진짜 빨랐어요)","뿌엥… (자전거 형아 빨라요…)","자전거 형아! 자전거 형아! (빨랐다!)","…… (자전거 형아, 대단하오)"],["멍! (엄마 운전 잘하긴 하죠…)","냥~ (엄마 운전이 낫긴 하지)","찍! (엄마 운전 잘하시죠…)","킁~ (엄마 운전이 빠르긴 하죠)","엄마가 운전! 엄마가 운전! (엄마 최고!)","어흠 (엄마 운전 실력은 인정하오)"]]};
const PET_ORDER = ['corgi', 'cat', 'hamster', 'rabbit', 'parrot', 'turtle'];
let petBubbleUntil = 0, petSayReadyAt = 0, petLastLine = '';
// kind: start · nag · jump · late · crash · win · hello / force: 쿨타임 무시
function petSay(kind, force, quoteIdx) {
    const id = userData.pet, set = PET_LINES[id];
    if (!set || !PetKit.current) return;
    const now = performance.now();
    if (!force && now < petSayReadyAt) return;
    let lines = (set[kind] || []).slice();
    if (kind === 'nag' && set.nagBy) lines = lines.concat(set.nagBy[selectedTheme] || []);
    const exact = kind === 'nag' && quoteIdx >= 0 && PET_NAG_REACT[selectedTheme] && PET_NAG_REACT[selectedTheme][quoteIdx];
    if (exact) lines = [exact[PET_ORDER.indexOf(id)]];          // 방금 나온 잔소리에 딱 맞는 대답
    if (!lines.length) return;
    lines = lines.filter(Boolean); if (!lines.length) return;
    const pool = lines.length > 1 ? lines.filter(l => l !== petLastLine) : lines;
    const line = pool[Math.floor(Math.random() * pool.length)];
    petLastLine = line;
    const m = line.match(/^(.*?)\s*\((.*)\)\s*$/);
    const sound = m ? m[1] : line, thought = m ? m[2] : '';
    document.getElementById('petBubbleWho').textContent = petDisplayName(id);
    document.getElementById('petBubbleFace').textContent = PET_EMOJI[id] || '🐾';
    document.getElementById('petBubbleText').innerHTML = `<b>${esc(sound)}</b>` + (thought ? `<i>${esc(thought)}</i>` : '');
    petBubbleUntil = now + 2600; petSayReadyAt = now + 3200;
    document.getElementById('petBubble').classList.add('on');
}
function hidePetBubble() { petBubbleUntil = 0; document.getElementById('petBubble').classList.remove('on'); }
const PET_EMOJI = { corgi: '🐶', cat: '🐱', hamster: '🐹', rabbit: '🐰', parrot: '🦜', turtle: '🐢' };

