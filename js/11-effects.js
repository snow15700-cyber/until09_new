/* 11-effects.js — 연출(속도감·충돌·폭발) · 고사양 모드
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   연출 모음: 속도감 · 충돌 · 엔딩 폭발 · 고사양 모드(그림자·빛 번짐·날씨)
   ========================================== */

// ---------- 공통: 둥근 빛 텍스처 ----------
const GLOW_TEX = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.65)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.15)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
})();
const GLOW_MATS = [];   // 고사양 모드에서만 보이는 빛 번짐 재질
const glowMatCache = {};
function glowMat(color, opts = {}) {
    const key = color + '_' + (opts.fog === false ? 'nf' : 'f') + '_' + (opts.opacity || 1);
    if (glowMatCache[key]) return glowMatCache[key];
    const m = new THREE.SpriteMaterial({ map: GLOW_TEX, color, transparent: true, opacity: opts.opacity || 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: opts.fog !== false });
    GLOW_MATS.push(m); glowMatCache[key] = m;
    return m;
}
function glowSprite(color, size, opts) {
    const s = new THREE.Sprite(glowMat(color, opts)); s.scale.set(size, size, 1); s.userData.isGlow = true; return s;
}

// ---------- 고사양 모드 ----------
let hiMode = true;
try { const v = localStorage.getItem('racingHiMode'); if (v !== null) hiMode = v === '1'; } catch (e) {}
// 그림자 설정 (플레이어 주변만 선명하게)
dirLight.shadow.mapSize.set(1024, 1024);
Object.assign(dirLight.shadow.camera, { left: -22, right: 22, top: 34, bottom: -34, near: 1, far: 220 });
dirLight.shadow.bias = -0.0008;
scene.add(dirLight.target);
const streetGlowMat = new THREE.SpriteMaterial({ map: GLOW_TEX, color: 0xffcf7a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });

let appliedShadow = null;
function applyHiMode() {
    renderer.shadowMap.enabled = hiMode;
    dirLight.castShadow = hiMode;
    // [최적화] 그림자 켜짐/꺼짐이 실제로 바뀔 때만 재질을 다시 준비 (레이싱 시작 끊김 방지)
    if (appliedShadow !== hiMode) {
        appliedShadow = hiMode;
        scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
    }
    applyQuality();
    GLOW_MATS.forEach(m => m.visible = hiMode);
    streetGlowMat.visible = hiMode && selectedTheme === 'evening';
    weatherGroup.visible = hiMode;
    const btn = document.getElementById('hiModeBtn');
    if (btn) {
        btn.innerHTML = hiMode ? '<svg class="ic" aria-hidden="true"><use href="#i-sparkles"/></svg> 고사양 ON' : '<svg class="ic" aria-hidden="true"><use href="#i-zap"/></svg> 고사양 OFF';
        btn.className = 'lb-pill lb-hi ' + (hiMode ? 'on' : 'off');
    }
}
function toggleHiMode() {
    hiMode = !hiMode;
    try { localStorage.setItem('racingHiMode', hiMode ? '1' : '0'); } catch (e) {}
    applyHiMode();
    showToast(hiMode ? '✨ 고사양 모드: 그림자·빛 번짐·날씨 켜짐' : '⚡ 고사양 모드 꺼짐 (가볍게 실행)');
}

// 신호등·가로등·해에 빛 번짐 붙이기
const LAMP_GLOW_COLOR = { red: 0xff3030, yellow: 0xffc21a, green: 0x22e07a };
trafficLights.forEach(tl => Object.entries(tl.lamps).forEach(([k, m]) => {
    const s = glowSprite(LAMP_GLOW_COLOR[k], 2.6); s.position.copy(m.position); s.position.z += 0.1;
    s.material = s.material.clone(); GLOW_MATS.push(s.material); tl.glowMats.push(s.material);   // 신호등마다 따로 (반투명용)
    m.parent.add(s); m.userData.glow = s; s.visible = (k === tl.state);
}));
// 철길 건널목 경고등 빛 번짐
railLamps.forEach(pair => pair.forEach(l => {
    const s = glowSprite(0xff2a2a, 2.0); s.position.copy(l.position); s.position.z += 0.08;
    l.parent.add(s); l.userData.glow = s; s.visible = false;
}));
cityGroup.traverse(o => {
    if (o.isMesh && o.material === lampHeadMat) {
        const s = new THREE.Sprite(streetGlowMat); s.scale.set(4, 4, 1); s.position.copy(o.position); s.position.y -= 0.2; o.parent.add(s);
    }
});
{ const sg = glowSprite(0xff9a40, 150, { fog: false, opacity: 0.85 }); sunMesh.add(sg); }

// ---------- 날씨 (고사양 모드) ----------
const weatherGroup = new THREE.Group(); scene.add(weatherGroup);
let weather = null;
function pointsMat(color, size, opacity) {
    return new THREE.PointsMaterial({ color, size, map: GLOW_TEX, transparent: true, opacity, depthWrite: false, sizeAttenuation: true });
}
/* ---------- 바퀴 뒤로 날리는 조각 (퇴근길 은행잎 · 소풍길 꽃잎/풀잎) + 흙먼지 ----------
   이 게임은 차가 제자리에 있고 도로가 뒤로 흘러감 → 바퀴에서 떨어진 조각은 '도로 속도'로 끌려가야 자연스러움
   · 처음엔 도로 속도의 절반으로 출발 → 공기 저항으로 금방 도로와 같은 속도가 됨 (차 뒤로 길게 흩날림)
   · 땅에 떨어지면 도로에 붙어 같이 흘러감 · 카메라 뒤(z > 25)로 지나가면 바로 재사용
   · 빠를수록 진행 방향으로 길쭉하게 (잔상)
   · 감속 스킬을 쓰면 worldSpeed가 줄어 조각도 같이 느려짐
   부하: 종류마다 InstancedMesh / Points 1개 = 그리기 1번, 계산은 1프레임에 수십 개뿐 */
const KICK_END_Z = 25;
const kickM = new THREE.Matrix4(), kickR = new THREE.Matrix4(), kickS = new THREE.Matrix4(), kickE = new THREE.Euler(), kickZero = new THREE.Matrix4().makeScale(0, 0, 0);
function makeKick(n, w, h, colors) {
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: true }), n);
    mesh.frustumCulled = false;
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) { mesh.setMatrixAt(i, kickZero); mesh.setColorAt(i, col.setHex(colors[i % colors.length])); }
    mesh.instanceColor.needsUpdate = true;
    return { mesh, n, next: 0, acc: 0, p: new Float32Array(n * 3), v: new Float32Array(n * 3), r: new Float32Array(n * 3), rv: new Float32Array(n * 3), life: new Float32Array(n), down: new Uint8Array(n) };
}
// rate: 1초에 몇 개 · o: { up, side, grav, life, drag(도로 속도를 따라잡는 빠르기) }
function tickKick(k, dt, emitting, rate, o, worldSpeed) {
    if (emitting && player.meshGroup) {
        k.acc += rate * dt;
        while (k.acc >= 1) {
            k.acc -= 1;
            const i = k.next; k.next = (i + 1) % k.n;
            const sd = Math.random() < 0.5 ? -1 : 1;
            k.p[i * 3] = player.meshGroup.position.x + sd * (player.width / 2 - 0.1) + (Math.random() - 0.5) * 0.3;
            k.p[i * 3 + 1] = 0.25; k.p[i * 3 + 2] = player.meshGroup.position.z + player.length * 0.32;
            k.v[i * 3] = sd * (0.4 + Math.random() * o.side); k.v[i * 3 + 1] = o.up * (0.6 + Math.random() * 0.6);
            k.v[i * 3 + 2] = worldSpeed * (0.03 + Math.random() * 0.07);   // 바퀴에서 막 떨어진 순간 → 공기에 끌려 급가속 (화면엔 0.2초쯤 보임)
            for (let a = 0; a < 3; a++) { k.r[i * 3 + a] = Math.random() * 6.28; k.rv[i * 3 + a] = (Math.random() - 0.5) * 18; }
            k.life[i] = o.life * (0.7 + Math.random() * 0.5); k.down[i] = 0;
        }
    }
    const follow = Math.min(1, o.drag * dt);
    for (let i = 0; i < k.n; i++) {
        if (k.life[i] <= 0) continue;
        k.life[i] -= dt;
        if (k.p[i * 3 + 2] > KICK_END_Z) k.life[i] = 0;
        if (k.life[i] <= 0) { k.mesh.setMatrixAt(i, kickZero); continue; }
        const j = i * 3;
        if (k.down[i]) k.v[j + 2] = worldSpeed;                        // 땅에 붙어 도로와 같이 흘러감
        else {
            k.v[j + 2] += (worldSpeed - k.v[j + 2]) * follow;            // 공기에 끌려 도로 속도로
            k.v[j + 1] -= o.grav * dt; k.v[j] *= 1 - 1.5 * dt;
            for (let a = 0; a < 3; a++) k.r[j + a] += k.rv[j + a] * dt;
        }
        k.p[j] += k.v[j] * dt; k.p[j + 1] += k.v[j + 1] * dt; k.p[j + 2] += k.v[j + 2] * dt;
        if (!k.down[i] && k.p[j + 1] < 0.05) { k.down[i] = 1; k.p[j + 1] = 0.05; k.v[j] = k.v[j + 1] = 0; k.r[j] = -Math.PI / 2; k.r[j + 2] = 0; }
        // 잔상: 카메라 쪽으로 빠르게 지나갈수록 앞뒤(z)로 길쭉하게
        const stretch = 1 + Math.min(1.6, (k.down[i] ? 0 : k.v[j + 2]) / 140);
        const sc = Math.min(1, k.life[i] * 4);
        kickE.set(k.r[j], k.r[j + 1], k.r[j + 2]); kickR.makeRotationFromEuler(kickE);
        kickS.makeScale(sc, sc, sc * stretch);
        kickM.copy(kickS).multiply(kickR); kickM.setPosition(k.p[j], k.p[j + 1], k.p[j + 2]);
        k.mesh.setMatrixAt(i, kickM);
    }
    k.mesh.instanceMatrix.needsUpdate = true;
}
/* ---------- 앞에서 날아오는 조각 (퇴근길 은행잎 · 소풍길 꽃잎/풀잎) ----------
   도로 위 공중에 떠 있는 잎은 땅에 대해 거의 멈춰 있음 → 차 기준으론 '도로 속도'로 다가와 옆을 휙 스쳐 감
   멀리(안개 속)에서 나타나 다가오므로 오래 보이고 속도감이 큼. 카메라 뒤로 지나가면 다시 먼 곳에서 나타남 */
function makeAir(n, w, h, colors, box) {
    const k = makeKick(n, w, h, colors);
    k.box = box; k.ph = new Float32Array(n);
    for (let i = 0; i < n; i++) airSpawn(k, i, -160 + Math.random() * 180);
    return k;
}
function airSpawn(k, i, z) {
    const b = k.box, j = i * 3;
    k.p[j] = (Math.random() - 0.5) * 2 * b.x; k.p[j + 1] = b.y0 + Math.random() * (b.y1 - b.y0); k.p[j + 2] = z;
    for (let a = 0; a < 3; a++) { k.r[j + a] = Math.random() * 6.28; k.rv[j + a] = (Math.random() - 0.5) * 7; }
    k.ph[i] = Math.random() * 6.28; k.life[i] = 1;
}
function tickAir(k, dt, worldSpeed, t) {
    const b = k.box, stretch = 1 + Math.min(1.6, worldSpeed / 140);
    for (let i = 0; i < k.n; i++) {
        const j = i * 3;
        k.p[j] += Math.sin(t * 1.6 + k.ph[i]) * b.sway * dt;                     // 바람에 좌우로 흔들
        k.p[j + 1] -= (b.fall + Math.sin(t * 2.3 + k.ph[i]) * b.fall) * dt;      // 팔랑팔랑 내려앉음
        k.p[j + 2] += worldSpeed * dt;                                            // 도로와 같은 속도로 다가옴
        for (let a = 0; a < 3; a++) k.r[j + a] += k.rv[j + a] * dt;
        if (k.p[j + 2] > KICK_END_Z || k.p[j + 1] < 0.05) airSpawn(k, i, -170 + Math.random() * 60);
        kickE.set(k.r[j], k.r[j + 1], k.r[j + 2]); kickR.makeRotationFromEuler(kickE);
        kickS.makeScale(1, 1, stretch);                                           // 빠를수록 앞뒤로 길쭉 (잔상)
        kickM.copy(kickS).multiply(kickR); kickM.setPosition(k.p[j], k.p[j + 1], k.p[j + 2]);
        k.mesh.setMatrixAt(i, kickM);
    }
    k.mesh.instanceMatrix.needsUpdate = true;
}
// 흙먼지: 바퀴 바로 뒤에서 피어올라 도로를 따라 뒤로 길게 뻗는 연기 꼬리
function makeDust(n, color, size, opacity) {
    const p = new Float32Array(n * 3).fill(-999), geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(geo, pointsMat(color, size, opacity));
    pts.frustumCulled = false;   // 처음엔 모두 화면 밖(-999)이라 통째로 안 그려지는 문제 방지
    return { pts, n, next: 0, acc: 0, v: new Float32Array(n * 3), life: new Float32Array(n) };
}
function tickDust(d, dt, emitting, rate, worldSpeed) {
    const p = d.pts.geometry.attributes.position.array;
    if (emitting && player.meshGroup) {
        d.acc += rate * dt;
        while (d.acc >= 1) {
            d.acc -= 1;
            const i = d.next, sd = Math.random() < 0.5 ? -1 : 1; d.next = (i + 1) % d.n;
            p[i * 3] = player.meshGroup.position.x + sd * (player.width / 2 - 0.15) + (Math.random() - 0.5) * 0.5;
            p[i * 3 + 1] = 0.15; p[i * 3 + 2] = player.meshGroup.position.z + player.length * 0.35;
            d.v[i * 3] = sd * (0.6 + Math.random() * 1.8); d.v[i * 3 + 1] = 0.8 + Math.random() * 1.4;
            d.v[i * 3 + 2] = worldSpeed * Math.random() * 0.04;   // 거의 제자리에서 시작 → 점점 도로에 끌려감 = 뒤로 늘어지는 꼬리
            d.life[i] = 0.7 + Math.random() * 0.5;
        }
    }
    const follow = Math.min(1, 2.2 * dt);
    for (let i = 0; i < d.n; i++) {
        if (d.life[i] <= 0) continue;
        d.life[i] -= dt;
        if (d.life[i] <= 0 || p[i * 3 + 2] > KICK_END_Z) { d.life[i] = 0; p[i * 3 + 1] = -999; continue; }
        d.v[i * 3 + 2] += (worldSpeed - d.v[i * 3 + 2]) * follow;
        d.v[i * 3] *= 1 - 2 * dt; d.v[i * 3 + 1] *= 1 - 1.2 * dt;
        p[i * 3] += d.v[i * 3] * dt; p[i * 3 + 1] += d.v[i * 3 + 1] * dt; p[i * 3 + 2] += d.v[i * 3 + 2] * dt;
    }
    d.pts.geometry.attributes.position.needsUpdate = true;
}
function clearWeather() {
    while (weatherGroup.children.length) {
        const o = weatherGroup.children.pop();
        o.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            // 재질·텍스처도 정리 (공용 빛 텍스처 GLOW_TEX는 남겨둠)
            const mats = c.material ? (Array.isArray(c.material) ? c.material : [c.material]) : [];
            mats.forEach(m => { if (m.map && m.map !== GLOW_TEX) m.map.dispose(); m.dispose(); });
        });
    }
    weather = null;
}
function buildWeather(theme) {
    clearWeather();
    weather = { theme };
    if (theme === 'morning') {
        // 빗줄기 (기울어진 짧은 선)
        const N = 700, pos = new Float32Array(N * 6);
        for (let i = 0; i < N; i++) {
            const x = (Math.random() - 0.5) * 70, y = Math.random() * 40, z = -140 + Math.random() * 160;
            pos.set([x, y, z, x + 0.15, y - 1.6, z + 0.5], i * 6);
        }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        weather.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xc9d6e3, transparent: true, opacity: 0.55, depthWrite: false }));
        weatherGroup.add(weather.rain);
        // 바퀴 물보라 (작은 물방울 입자 풀)
        const M = 160, sp = new Float32Array(M * 3).fill(-999);
        const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
        weather.spray = new THREE.Points(sgeo, pointsMat(0xeaf4ff, 0.45, 0.75));
        weather.spray.frustumCulled = false;   // 처음 위치(-999) 기준으로 화면 밖 판정돼 물보라가 안 보이던 문제
        weather.sprayVel = new Float32Array(M * 3); weather.sprayLife = new Float32Array(M); weather.sprayNext = 0;
        weatherGroup.add(weather.spray);
    } else if (theme === 'evening') {
        // 노을 빛내림: 해 쪽에서 내려오는 반투명 빛기둥
        const c = document.createElement('canvas'); c.width = 32; c.height = 256;
        const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
        gr.addColorStop(0, 'rgba(255,200,120,0.9)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 32, 256);
        const tex = new THREE.CanvasTexture(c);
        weather.rays = [];
        for (let i = 0; i < 6; i++) {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(10 + Math.random() * 14, 260), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
            m.position.set((i - 2.5) * 9, 70, -330 + i * 6);
            m.rotation.z = (i - 2.5) * 0.12; m.rotation.x = -0.35;
            m.userData.phase = Math.random() * 6.28;
            weatherGroup.add(m); weather.rays.push(m);
        }
        // 공중에 떠다니는 먼지 (따뜻한 빛 알갱이)
        const N = 304, pos = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) pos.set([(Math.random() - 0.5) * 50, Math.random() * 18, -90 + Math.random() * 105], i * 3);
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        weather.dust = new THREE.Points(geo, pointsMat(0xffd08a, 0.28, 0.8));
        weatherGroup.add(weather.dust);
        // 바퀴 뒤: 노을빛 흙먼지 + 은행잎 조금
        weather.trailDust = makeDust(240, 0xffc48a, 0.95, 0.3); weatherGroup.add(weather.trailDust.pts);
        weather.kick = makeKick(32, 0.32, 0.25, [0xffd23a, 0xf2b21f, 0xffe066, 0xe8961c]); weatherGroup.add(weather.kick.mesh);
        weather.kickOpt = { up: 6, side: 3, grav: 7, life: 1.2, drag: 2.6 }; weather.kickRate = 8;
        // 앞에서 날아와 차 옆을 스쳐 가는 은행잎 (도로 + 인도 위)
        weather.air = makeAir(56, 0.42, 0.34, [0xffd23a, 0xf2b21f, 0xffe066, 0xe8961c], { x: 16, y0: 0.4, y1: 6, sway: 1.2, fall: 0.5 }); weatherGroup.add(weather.air.mesh);
    } else {
        // 꽃잎 (분홍·흰색), 흩날리며 떨어짐
        const N = 256, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
        const palette = [[1, 0.72, 0.82], [1, 0.9, 0.94], [1, 0.6, 0.75]];
        for (let i = 0; i < N; i++) {
            pos.set([(Math.random() - 0.5) * 60, Math.random() * 22, -110 + Math.random() * 125], i * 3);
            col.set(palette[i % 3], i * 3);
        }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const pm = pointsMat(0xffffff, 0.5, 0.95); pm.vertexColors = true;
        weather.petals = new THREE.Points(geo, pm);
        weather.petalPhase = Float32Array.from({ length: N }, () => Math.random() * 6.28);
        weatherGroup.add(weather.petals);
        // 나비 (날개 두 장이 팔랑팔랑)
        weather.butterflies = [];
        const wingCols = [0xffd84a, 0x7dd3fc, 0xf9a8d4, 0xffffff, 0xfb923c];
        for (let i = 0; i < 10; i++) {
            const b = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: wingCols[i % 5], side: THREE.DoubleSide });
            const wg = new THREE.PlaneGeometry(0.55, 0.45);
            [-1, 1].forEach(sd => { const pivot = new THREE.Group(); const w = new THREE.Mesh(wg, mat); w.position.x = sd * 0.28; w.rotation.x = -Math.PI / 2; pivot.add(w); b.add(pivot); b.userData['w' + sd] = pivot; });
            const side = i % 2 ? 1 : -1;
            b.position.set(side * (13.5 + Math.random() * 5), 1.2 + Math.random() * 2.5, -100 + Math.random() * 110);
            b.userData.phase = Math.random() * 6.28; b.userData.side = side;
            weatherGroup.add(b); weather.butterflies.push(b);
        }
        // 바퀴 뒤: 꽃잎(분홍·흰색) + 풀잎(초록, 가늘고 길쭉)
        weather.kick = makeKick(48, 0.26, 0.18, [0xff9fc0, 0xffd6e4, 0xffffff, 0xff7fa8]); weatherGroup.add(weather.kick.mesh);
        weather.kickOpt = { up: 6, side: 3, grav: 8, life: 1.0, drag: 2.8 }; weather.kickRate = 18;
        weather.kick2 = makeKick(40, 0.06, 0.36, [0x5cbf4a, 0x3f9e3a, 0x8fd16a]); weatherGroup.add(weather.kick2.mesh);
        weather.kickOpt2 = { up: 5.5, side: 2.6, grav: 9, life: 0.8, drag: 3 }; weather.kickRate2 = 13;
        // 앞에서 날아와 스쳐 가는 꽃잎(높이 다양) + 풀잎(낮게)
        weather.air = makeAir(64, 0.34, 0.24, [0xff9fc0, 0xffd6e4, 0xffffff, 0xff7fa8], { x: 18, y0: 0.4, y1: 7, sway: 1.6, fall: 0.6 }); weatherGroup.add(weather.air.mesh);
        weather.air2 = makeAir(32, 0.07, 0.42, [0x5cbf4a, 0x3f9e3a, 0x8fd16a], { x: 16, y0: 0.2, y1: 2.2, sway: 1, fall: 0.25 }); weatherGroup.add(weather.air2.mesh);
    }
    weatherGroup.visible = hiMode;
}
// worldSpeed: 도로가 흘러가는 속도 (날씨도 같이 흘러가야 속도감이 남)
function updateWeather(dt, worldSpeed) {
    if (!weather || !hiMode) return;
    const t = performance.now() / 1000;
    if (weather.rain) {
        const a = weather.rain.geometry.attributes.position, p = a.array, fall = 55 * dt, dz = worldSpeed * 0.35 * dt;
        for (let i = 0; i < p.length; i += 6) {
            p[i + 1] -= fall; p[i + 4] -= fall; p[i + 2] += dz; p[i + 5] += dz;
            if (p[i + 4] < 0 || p[i + 2] > 20) {
                const x = (Math.random() - 0.5) * 70, y = 30 + Math.random() * 12, z = -140 + Math.random() * 140;
                p[i] = x; p[i + 1] = y; p[i + 2] = z; p[i + 3] = x + 0.15; p[i + 4] = y - 1.6; p[i + 5] = z + 0.5;
            }
        }
        a.needsUpdate = true;
        // 물보라: 달리는 중에 뒷바퀴에서 튀어오름
        const sa = weather.spray.geometry.attributes.position, sp = sa.array, v = weather.sprayVel, life = weather.sprayLife;
        if (worldSpeed > 0 && player.meshGroup && player.meshGroup.position.y < 0.3) {
            for (let k = 0; k < 4; k++) {
                const i = weather.sprayNext; weather.sprayNext = (i + 1) % life.length;
                const sd = k % 2 ? 1 : -1;
                sp[i * 3] = player.meshGroup.position.x + sd * (player.width / 2 - 0.1) + (Math.random() - 0.5) * 0.3;
                sp[i * 3 + 1] = 0.2; sp[i * 3 + 2] = player.meshGroup.position.z + player.length * 0.32;
                v[i * 3] = sd * (0.5 + Math.random() * 1.5); v[i * 3 + 1] = 2 + Math.random() * 2.5; v[i * 3 + 2] = worldSpeed * (0.03 + Math.random() * 0.07);   // 바퀴에서 떨어진 뒤 도로 속도로 끌려감
                life[i] = 0.45;
            }
        }
        for (let i = 0; i < life.length; i++) {
            if (life[i] <= 0 || sp[i * 3 + 2] > KICK_END_Z) { life[i] = 0; sp[i * 3 + 1] = -999; continue; }
            life[i] -= dt; v[i * 3 + 1] -= 14 * dt; v[i * 3 + 2] += (worldSpeed - v[i * 3 + 2]) * Math.min(1, 2.8 * dt);   // 공기에 끌려 도로 속도로
            sp[i * 3] += v[i * 3] * dt; sp[i * 3 + 1] += v[i * 3 + 1] * dt; sp[i * 3 + 2] += v[i * 3 + 2] * dt;
        }
        sa.needsUpdate = true;
    }
    // 바퀴 뒤 조각: 달리는 중이고 바퀴가 땅에 닿아 있을 때만 (점프 중엔 안 날림)
    const onGround = worldSpeed > 0 && player.meshGroup && player.meshGroup.position.y < 0.3;
    if (weather.trailDust) tickDust(weather.trailDust, dt, onGround, 128, worldSpeed);
    if (weather.kick) tickKick(weather.kick, dt, onGround, weather.kickRate, weather.kickOpt, worldSpeed);
    if (weather.kick2) tickKick(weather.kick2, dt, onGround, weather.kickRate2, weather.kickOpt2, worldSpeed);
    if (weather.air) tickAir(weather.air, dt, worldSpeed, t);
    if (weather.air2) tickAir(weather.air2, dt, worldSpeed, t);
    if (weather.rays) weather.rays.forEach(r => r.material.opacity = 0.08 + 0.06 * Math.sin(t * 0.7 + r.userData.phase));
    if (weather.dust) {
        const a = weather.dust.geometry.attributes.position, p = a.array, dz = worldSpeed * dt;   // 도로와 같은 속도
        for (let i = 0; i < p.length; i += 3) {
            p[i] += Math.sin(t * 0.5 + i) * 0.2 * dt; p[i + 1] += Math.cos(t * 0.4 + i) * 0.15 * dt; p[i + 2] += dz;
            if (p[i + 2] > 15) { p[i + 2] = -90; p[i] = (Math.random() - 0.5) * 50; p[i + 1] = Math.random() * 18; }
        }
        a.needsUpdate = true;
    }
    if (weather.petals) {
        const a = weather.petals.geometry.attributes.position, p = a.array, ph = weather.petalPhase, dz = worldSpeed * dt;   // 도로와 같은 속도
        for (let i = 0, j = 0; i < p.length; i += 3, j++) {
            p[i] += Math.sin(t * 1.3 + ph[j]) * 1.2 * dt;
            p[i + 1] -= (1.2 + (j % 5) * 0.2) * dt;
            p[i + 2] += dz;
            if (p[i + 1] < 0 || p[i + 2] > 15) { p[i] = (Math.random() - 0.5) * 60; p[i + 1] = 4 + Math.random() * 18; p[i + 2] = -150 + Math.random() * 60; }
        }
        a.needsUpdate = true;
    }
    if (weather.butterflies) weather.butterflies.forEach(b => {
        const f = Math.sin(t * 14 + b.userData.phase) * 0.9;
        b.userData['w-1'].rotation.z = f; b.userData['w1'].rotation.z = -f;
        b.position.z += worldSpeed * dt;
        b.position.y += Math.sin(t * 2 + b.userData.phase) * 0.8 * dt;
        b.position.x += Math.cos(t * 1.3 + b.userData.phase) * 0.8 * dt;
        b.rotation.y = Math.sin(t * 0.8 + b.userData.phase) * 0.6;
        if (b.position.z > 20) { b.position.z = -110 - Math.random() * 30; b.position.x = b.userData.side * (13.5 + Math.random() * 5); }
    });
}

// ---------- 속도감: 화각 소폭 확대 + 스피드 라인 ----------
const BASE_FOV = 70, MAX_FOV_ADD = 4;    // "아주 조금만"
const speedCanvas = document.getElementById('speedFx');
const sctx = speedCanvas.getContext('2d');
let speedSize = null, speedDrawn = false;
window.addEventListener('resize', () => { speedSize = null; });
const speedLines = Array.from({ length: 46 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), v: 0.6 + Math.random() * 0.9, w: 1 + Math.random() * 1.6 }));
function updateSpeedFx(dt, active) {
    const intensity = active ? Math.min(1, Math.max(0, (roadSpeed - 135) / 140)) : 0;
    // 화각
    const fov = BASE_FOV + MAX_FOV_ADD * intensity;
    if (Math.abs(camera.fov - fov) > 0.02) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
    // 스피드 라인
    if (!speedSize) { speedSize = [speedCanvas.clientWidth, speedCanvas.clientHeight]; speedCanvas.width = speedSize[0]; speedCanvas.height = speedSize[1]; }
    const w = speedSize[0], h = speedSize[1];
    if (intensity <= 0.01) { if (speedDrawn) { sctx.clearRect(0, 0, w, h); speedDrawn = false; } return; }
    sctx.clearRect(0, 0, w, h); speedDrawn = true;
    const cx = w / 2, cy = h * 0.36, R = Math.hypot(w, h) * 0.6;
    sctx.lineCap = 'round';
    speedLines.forEach(l => {
        l.r += l.v * dt * (0.8 + intensity * 1.6);
        if (l.r > 1) { l.r = 0.3 + Math.random() * 0.2; l.a = Math.random() * Math.PI * 2; }
        const r0 = l.r * R, r1 = r0 + R * (0.06 + 0.12 * intensity);
        const ca = Math.cos(l.a), sa = Math.sin(l.a);
        sctx.strokeStyle = `rgba(255,255,255,${(0.35 * intensity * Math.min(1, (l.r - 0.3) * 3)).toFixed(3)})`;
        sctx.lineWidth = l.w;
        sctx.beginPath(); sctx.moveTo(cx + ca * r0, cy + sa * r0); sctx.lineTo(cx + ca * r1, cy + sa * r1); sctx.stroke();
    });
}

// ---------- 파티클(파편·불꽃·연기) 공통 ----------
const fxParts = [];
const FX_BOX = new THREE.BoxGeometry(1, 1, 1);
const FX_BALL = new THREE.IcosahedronGeometry(1, 1);
setTimeout(() => { SHARED_GEO.add(FX_BOX); SHARED_GEO.add(FX_BALL); }, 0);
let shake = 0;
function addPart(mesh, o) {
    scene.add(mesh);
    fxParts.push(Object.assign({ mesh, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 2, age: 0, gravity: 0, grow: 0, fadeFrom: 999, floor: true, drag: 0 }, o));
}
function updateFx(dt) {
    for (let i = fxParts.length - 1; i >= 0; i--) {
        const p = fxParts[i]; p.age += dt;
        if (p.age >= p.life) { scene.remove(p.mesh); if (p.dest) disposeObject(p.mesh); else if (p.ownMat) p.mesh.material.dispose(); fxParts.splice(i, 1); continue; }
        p.vel.y -= p.gravity * dt;
        if (p.drag) p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.rotation.x += p.spin.x * dt; p.mesh.rotation.y += p.spin.y * dt; p.mesh.rotation.z += p.spin.z * dt;
        if (p.floor && p.mesh.position.y < 0.15 && p.vel.y < 0) { p.mesh.position.y = 0.15; p.vel.y *= -0.35; p.vel.x *= 0.7; p.vel.z *= 0.7; p.spin.multiplyScalar(0.6); }
        if (p.grow) { const k = p.mesh.userData.base * (1 + p.grow * Math.min(1, p.age / (p.growTime || 0.5))); p.mesh.scale.setScalar(k); }
        if (p.age > p.fadeFrom && p.mesh.material.transparent) p.mesh.material.opacity = Math.max(0, (p.baseOpacity || 1) * (1 - (p.age - p.fadeFrom) / (p.life - p.fadeFrom)));
    }
}
// 폭발·충돌 효과에 쓰는 재질을 미리 준비해두기 (처음 터질 때 멈칫 방지)
function prewarmFx() {
    const tmp = [
        new THREE.Mesh(FX_BALL, new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0.9 })),
        new THREE.Mesh(FX_BALL, new THREE.MeshStandardMaterial({ color: 0x6b6b6b, transparent: true, opacity: 0.85, roughness: 1, flatShading: true })),
        new THREE.Mesh(FX_BOX, new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.3 })),
        new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9, side: THREE.DoubleSide })),
        new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, fog: false }))
    ];
    tmp.forEach(m => { m.position.set(0, 0, 2000); scene.add(m); });
    try { renderer.compile(scene, camera); } catch (e) {}
    tmp.forEach(m => scene.remove(m));   // 재질은 정리하지 않음 (정리하면 준비해둔 셰이더도 같이 지워짐)
}
// 목적지 물체 정리 (지오메트리·재질·글자 텍스처까지)
const SHARED_GEO = new Set();   // 효과에서 같이 쓰는 지오메트리는 지우면 안 됨 (FX_BOX, FX_BALL)
function disposeObject(o) {
    o.traverse(c => {
        if (c.geometry && !SHARED_GEO.has(c.geometry)) c.geometry.dispose();
        const mats = c.material ? (Array.isArray(c.material) ? c.material : [c.material]) : [];
        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
    });
}
function clearFx() {
    fxParts.forEach(p => { scene.remove(p.mesh); if (p.dest) disposeObject(p.mesh); else if (p.ownMat) p.mesh.material.dispose(); });
    fxParts.length = 0; shake = 0;
    speedCanvas && sctx.clearRect(0, 0, speedCanvas.width, speedCanvas.height);
}
function flashScreen(color, peak, dur) {
    const el = document.getElementById('flashOverlay');
    el.style.transition = 'none'; el.style.background = color; el.style.opacity = String(peak);
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = `opacity ${dur}s ease-out`; el.style.opacity = '0'; }));
}

// ---------- 합성 효과음 (충돌 / 폭발) ----------
function noiseBurst(dur, freqFrom, freqTo, vol) {
    if (!actx || isMuted) return;
    const t = actx.currentTime, n = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = actx.createBufferSource(); src.buffer = buf;
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(freqFrom, t); lp.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    const g = actx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(lp); lp.connect(g); g.connect(masterGain); src.start(t);
}
function thump(dur, fFrom, fTo, vol) {
    if (!actx || isMuted) return;
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(fFrom, t); o.frequency.exponentialRampToValueAtTime(fTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(masterGain); o.start(t); o.stop(t + dur + 0.05);
}
function playCrashSound() { noiseBurst(0.55, 5000, 300, 0.7); thump(0.35, 140, 45, 0.8); }
function playBoomSound() { noiseBurst(1.8, 2400, 80, 0.9); thump(1.2, 90, 28, 1.0); setTimeout(() => noiseBurst(0.9, 1500, 120, 0.4), 180); }

// ---------- 충돌 연출: 슬로모션 + 파편 + 흔들림 ----------
let crash = null;
function startCrash(e) {
    setTimeout(() => petSay('crash', true), 350);
    gameState = 'CRASH';
    if (RS) RS.hit = (e.kind || 'single') + (player.timeScale < 1 ? '_slow' : '');   // 부딪힌 차 (관리자 통계)
    crash = { t: 0, enemy: e, spinP: (Math.random() < 0.5 ? -1 : 1) * 7, spinE: (Math.random() < 0.5 ? -1 : 1) * 5 };
    document.getElementById('controls').classList.add('hidden');
    player.slowTimer = 0; player.timeScale = 1.0; setGrayscale(false); updateScreenFx();
    const hit = new THREE.Vector3(player.meshGroup.position.x, 0.9, player.meshGroup.position.z - player.length * 0.45);
    const pColor = CAR_DB[currentCarIndex].color;
    let eColor = 0x888888; e.meshGroup.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.metalness === 0.35) eColor = o.material.color.getHex(); });
    // 차체 파편
    for (let i = 0; i < 26; i++) {
        const col = [pColor, eColor, 0x1c2a38, 0x18181b, 0xdddddd][i % 5];
        const m = new THREE.Mesh(FX_BOX, new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, metalness: 0.3 }));
        const s = 0.15 + Math.random() * 0.35; m.scale.set(s, s * (0.4 + Math.random()), s * (0.6 + Math.random())); m.position.copy(hit);
        m.castShadow = true;
        addPart(m, { ownMat: true, life: 2.4, gravity: 22, vel: new THREE.Vector3((Math.random() - 0.5) * 14, 5 + Math.random() * 9, (Math.random() - 0.3) * 10), spin: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12) });
    }
    // 불꽃
    for (let i = 0; i < 24; i++) {
        const m = new THREE.Mesh(FX_BALL, new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd166 : 0xff8a3d, transparent: true }));
        m.userData.base = 0.07 + Math.random() * 0.08; m.scale.setScalar(m.userData.base); m.position.copy(hit);
        addPart(m, { ownMat: true, life: 0.7, gravity: 10, fadeFrom: 0.2, vel: new THREE.Vector3((Math.random() - 0.5) * 18, 3 + Math.random() * 7, (Math.random() - 0.5) * 14), floor: false });
    }
    // 충격 순간 섬광 구
    const fl = new THREE.Mesh(FX_BALL, new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.9 }));
    fl.userData.base = 0.6; fl.position.copy(hit);
    addPart(fl, { ownMat: true, life: 0.35, grow: 3, growTime: 0.2, fadeFrom: 0.05, baseOpacity: 0.9, floor: false });
    shake = 0.9;
    flashScreen('#ffffff', 0.55, 0.35);
    playCrashSound();
    if (navigator.vibrate) try { navigator.vibrate([60, 40, 120]); } catch (er) {}
}
function updateCrash(realDt) {
    crash.t += realDt;
    const slow = crash.t < 0.75 ? 0.22 : 0.55;           // 처음 0.75초는 강한 슬로모션
    const dt = realDt * slow;
    roadSpeed *= Math.max(0, 1 - 1.8 * dt);
    roadOffset += roadSpeed * dt; markersGroup.position.z = roadOffset % 15; scrollEnvironment(roadSpeed * dt);
    enemies.forEach(e => { if (e !== crash.enemy) e.meshGroup.position.z += (roadSpeed - e.speed) * dt; });
    // 내 차: 튕겨 오르며 회전 / 상대 차: 밀려남
    const pg = player.meshGroup;
    pg.rotation.y += crash.spinP * dt; pg.rotation.z += crash.spinP * 0.25 * dt;
    pg.position.y = Math.max(0, Math.sin(Math.min(1, crash.t / 1.1) * Math.PI) * 1.6);
    pg.position.z += 6 * dt;
    const eg = crash.enemy.meshGroup;
    eg.rotation.y += crash.spinE * dt; eg.position.z -= 10 * dt; eg.position.y = Math.max(0, Math.sin(Math.min(1, crash.t / 0.9) * Math.PI) * 0.9);
    crash.fxSlow = slow;
    if (crash.t > 1.35) { crash = null; onGameOver(false); }
}

// ---------- 엔딩: 목적지에 부딪히며 만화풍 대폭발 ----------
let ending = null;
function makeBoomTexture(text) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    // 만화 폭발 말풍선 (뾰족뾰족)
    g.translate(256, 128); g.beginPath();
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, r = i % 2 ? 92 : 128; g.lineTo(Math.cos(a) * r * 1.7, Math.sin(a) * r * 0.9); }
    g.closePath(); g.fillStyle = '#ffde3b'; g.fill(); g.lineWidth = 10; g.strokeStyle = '#d6281b'; g.stroke();
    g.font = "900 120px var(--fb),'Apple SD Gothic Neo','Malgun Gothic',sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 16; g.strokeStyle = '#7a1208'; g.strokeText(text, 0, 8); g.fillStyle = '#ff3b1f'; g.fillText(text, 0, 8);
    return new THREE.CanvasTexture(c);
}
function startEnding() {
    gameState = 'ENDING';
    ending = { t: 0 };
    const center = new THREE.Vector3(0, 7, destinationMesh.position.z - 10);   // 조각이 흩어지는 기준점
    const front = new THREE.Vector3(0, 6, destinationMesh.position.z + 1);    // 불길이 터지는 곳 (건물 정면)
    // 1) 목적지를 조각내서 사방으로 날림
    destinationMesh.updateMatrixWorld(true);
    const meshes = []; destinationMesh.traverse(o => { if (o.isMesh) meshes.push(o); });
    const tmp = new THREE.Vector3();
    meshes.forEach(m => {
        scene.attach(m);
        m.getWorldPosition(tmp);
        const dir = tmp.clone().sub(center); dir.y = Math.abs(dir.y) * 0.5 + 2;
        dir.z = -Math.abs(dir.z) - 0.6;          // 카메라 쪽으로 날아오지 않게 뒤·옆으로
        dir.normalize();
        if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
        const radius = m.geometry.boundingSphere.radius * Math.max(m.scale.x, m.scale.y, m.scale.z);
        if (tmp.y < 0.8 && radius > 6) { addPart(m, { life: 3.2, floor: false, dest: true }); return; }   // 바닥·잔디·활주로는 그대로
        if (radius > 9) {                                                                     // 큰 덩어리(타워 등)는 뒤로 무너짐
            addPart(m, { life: 3.2, gravity: 5, floor: false, dest: true, vel: new THREE.Vector3(dir.x * 3, -1.5, -6), spin: new THREE.Vector3(-0.5 - Math.random() * 0.4, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4) });
            return;
        }
        const power = (14 + Math.random() * 26) / (1 + radius / 5);   // 큰 조각은 느리게
        addPart(m, { life: 3.2, gravity: 26, drag: 0.15, dest: true, vel: dir.multiplyScalar(power).add(new THREE.Vector3(0, 8 + Math.random() * 14, 0)), spin: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6) });
    });
    destinationMesh.children.forEach(c => c.visible = false);
    // 2) 불덩어리 (노랑 → 주황 → 빨강, 커지며 사라짐)
    const fireCols = [0xfff6c2, 0xffd23d, 0xff9a1f, 0xff5a1f, 0xe8341c];
    for (let i = 0; i < 22; i++) {
        const m = new THREE.Mesh(FX_BALL, new THREE.MeshBasicMaterial({ color: fireCols[i % 5], transparent: true, opacity: 0.95 }));
        m.userData.base = 0.9 + Math.random() * 1.1;
        m.scale.setScalar(m.userData.base);
        m.position.copy(front).add(new THREE.Vector3((Math.random() - 0.5) * 22, (Math.random() - 0.2) * 12, -Math.random() * 6));
        addPart(m, { ownMat: true, life: 1.1 + Math.random() * 0.6, grow: 1.6 + Math.random() * 1.4, growTime: 0.45, fadeFrom: 0.35, baseOpacity: 0.95, floor: false, vel: new THREE.Vector3(0, 4 + Math.random() * 6, 0) });
    }
    // 3) 연기 (회색 구름이 피어오름)
    for (let i = 0; i < 14; i++) {
        const m = new THREE.Mesh(FX_BALL, new THREE.MeshStandardMaterial({ color: [0x6b6b6b, 0x8a8a8a, 0x4b4b4b][i % 3], transparent: true, opacity: 0.85, roughness: 1, flatShading: true }));
        m.userData.base = 1.4 + Math.random() * 1.2;
        m.scale.setScalar(m.userData.base);
        m.position.copy(front).add(new THREE.Vector3((Math.random() - 0.5) * 20, 2 + Math.random() * 6, -1 - Math.random() * 5));
        addPart(m, { ownMat: true, life: 3, grow: 1.2, growTime: 2.5, fadeFrom: 1.2, baseOpacity: 0.85, floor: false, vel: new THREE.Vector3((Math.random() - 0.5) * 3, 5 + Math.random() * 4, 0) });
    }
    // 4) 땅에 퍼지는 충격파 링
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(front.x, 0.3, front.z); ring.userData.base = 2;
    addPart(ring, { ownMat: true, life: 0.9, grow: 30, growTime: 0.9, fadeFrom: 0.1, baseOpacity: 0.9, floor: false });
    // 5) 만화 "쾅!!" 글자
    const boom = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeBoomTexture('쾅!!'), transparent: true, depthTest: false, fog: false }));
    boom.position.copy(front).add(new THREE.Vector3(0, 7, 3)); boom.userData.base = 1; boom.scale.set(15, 7.5, 1);
    boom.renderOrder = 999;
    scene.add(boom); ending.boom = boom;
    // 6) 내 차도 뒤로 튕겨남
    ending.carVel = new THREE.Vector3(0, 9, 16);
    shake = 2.2;
    flashScreen('#ffffff', 1, 0.7);
    playBoomSound();
    if (navigator.vibrate) try { navigator.vibrate([120, 60, 260]); } catch (er) {}
}
function updateEnding(dt) {
    ending.t += dt;
    // "쾅!!" 팝업: 커졌다가 살짝 줄어든 뒤 사라짐
    const b = ending.boom, k = ending.t < 0.18 ? ending.t / 0.18 * 1.25 : ending.t < 0.4 ? 1.25 - (ending.t - 0.18) * 1.1 : 1;
    b.scale.set(15 * k, 7.5 * k, 1);
    b.material.opacity = ending.t > 1.4 ? Math.max(0, 1 - (ending.t - 1.4) / 0.5) : 1;
    // 내 차 튕겨남
    const pg = player.meshGroup, v = ending.carVel;
    v.y -= 24 * dt; pg.position.addScaledVector(v, dt); pg.rotation.x -= 3 * dt;
    if (pg.position.y < 0) { pg.position.y = 0; v.set(0, 0, v.z * 0.5); }
    // 카메라: 조금 뒤로 물러나며 폭발을 바라봄
    camera.position.lerp(new THREE.Vector3(0, 13, 30), Math.min(1, dt * 2.5));
    camera.lookAt(0, 9, -18);
    if (ending.t > 2.6) { scene.remove(b); b.material.map.dispose(); b.material.dispose(); ending = null; onGameOver(true); }
}

// 바닥·건물이 그림자를 받도록
[cityGroup, natureGroup].forEach(g => g.traverse(o => { if (o.isMesh) o.receiveShadow = true; }));
