/* 13-lobby-cinema.js — 시네마틱 로비 카메라
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   시네마틱 로비: 코스 배경 위에서 차와 반려동물을 카메라 4컷으로 보여줌
   ========================================== */
const LOBBY_SPEED = 22;
let petTime = 0, lobbyT = 0, lobbyCarKey = '', lobbySheetH = 0, shotIdx = 0, shotT = 0, glanceT0 = 0;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lobbyLookAt = new THREE.Vector3(0, 1.3, 0);   // 로비 카메라가 마지막으로 보던 곳 (출발 연출 시작점)
const SHOTS = [
    { dur: 7, pose(p) { const a = -0.55 + p * 0.5, r = 8.2; return [V3(Math.sin(a) * r, 2.1 + p * 0.4, -Math.cos(a) * r), V3(0, 1.3, 0)]; } },          // 앞쪽 3/4 로우앵글
    { dur: 6, pose(p) { const m = PetKit.mountPoint(), y = m.y + 0.55, a = -0.5 + p * 0.6, r = 3.0;                                                          // 반려동물 클로즈업 (뒤쪽 위)
        return [V3(Math.sin(a) * r + 0.4, y + 0.7, m.z + Math.cos(a) * r), V3(0, y, m.z)]; } },
    { dur: 7, pose(p) { return [V3(7.2, 1.4, 2.6 - p * 5.2), V3(0, 1.1, 0.8 - p * 1.6)]; } },                                                                // 옆에서 나란히
    { dur: 6, pose(p) { const a = 0.35 - p * 0.7; return [V3(Math.sin(a) * 10, 6.5 - p * 1.2, 9.5), V3(0, 0.8, -6)]; } }                                    // 뒤쪽 하이앵글
];
const BLEND = 1.4;
const easeIO = x => x * x * (3 - 2 * x);
const clamp01 = x => Math.max(0, Math.min(1, x));
function lobbyCut(i, glance) { shotIdx = i; shotT = 0; if (glance) glanceT0 = lobbyT - 5.6; }

function refreshLobbyCar(force) {
    if (gameState !== 'LOBBY') return;
    const car = CAR_DB[currentCarIndex], key = car.id + '|' + userData.pet;
    if (!force && key === lobbyCarKey && player.meshGroup) return;
    lobbyCarKey = key;
    if (player.meshGroup) removeCar(player.meshGroup);
    const pc = createCarMesh(car.model, car.color);
    player.meshGroup = pc.mesh; player.width = pc.width; player.length = pc.length;
    player.meshGroup.position.set(laneCenters[1], 0, 0);
    scene.add(player.meshGroup);
    PetKit.setLobby(true);
    PetKit.mount(player.meshGroup, car.model, userData.pet);
}

function updateLobby(dt) {
    lobbyT += dt;
    const sp = LOBBY_SPEED * dt;
    roadOffset += sp; markersGroup.position.z = roadOffset % 15;
    scrollEnvironment(sp);
    const car = player.meshGroup; if (!car) return;
    car.position.y = Math.abs(Math.sin(lobbyT * 7)) * 0.015;
    car.rotation.z = Math.sin(lobbyT * 1.3) * 0.006;

    // 패널이 가린 만큼 화면 중심을 위로 올리고, 세로 화면에선 시야각을 넓히거나 카메라를 뒤로 뺌
    const w = container.clientWidth, h = container.clientHeight, sheet = document.getElementById('lobbySheet');
    lobbySheetH += ((sheet.offsetHeight - 40) - lobbySheetH) * Math.min(1, dt * 8);
    const aspect = w / (h + lobbySheetH), tanRef = Math.tan(THREE.MathUtils.degToRad(23));
    const vf = Math.min(70, Math.max(42, THREE.MathUtils.radToDeg(2 * Math.atan(tanRef / aspect))));
    const distK = tanRef / (Math.tan(THREE.MathUtils.degToRad(vf / 2)) * aspect);
    camera.fov = vf; camera.aspect = aspect;
    camera.setViewOffset(w, h + lobbySheetH, 0, lobbySheetH, w, h);
    camera.updateProjectionMatrix();

    shotT += dt;
    if (shotT > SHOTS[shotIdx].dur) { shotT -= SHOTS[shotIdx].dur; shotIdx = (shotIdx + 1) % SHOTS.length; if (shotIdx === 1 && !PetKit.current) shotIdx = 2; }
    const s = SHOTS[shotIdx], [pos, tgt] = s.pose(shotT / s.dur);
    if (shotT > s.dur - BLEND) {
        const nx = (shotIdx + 1) % SHOTS.length, [pb, tb] = SHOTS[nx === 1 && !PetKit.current ? 2 : nx].pose(0), k = easeIO((shotT - (s.dur - BLEND)) / BLEND);
        pos.lerp(pb, k); tgt.lerp(tb, k);
    }
    pos.sub(tgt).multiplyScalar(distK).add(tgt);

    // 반려동물: 평소엔 레이싱 때와 같은 방향, 9초마다 약 2초 동안 카메라를 슬쩍 봄
    const pet = PetKit.current;
    if (pet) {
        const m = PetKit.mountPoint();
        const want = Math.atan2(pos.x, pos.z - m.z) - (pet.def.faceSign > 0 ? 0 : Math.PI);
        const cyc = ((lobbyT - glanceT0) % 9 + 9) % 9;
        const g = easeIO(clamp01((cyc - 6) / 0.6)) * (1 - easeIO(clamp01((cyc - 8.1) / 0.6)));
        const target = Math.atan2(Math.sin(want), Math.cos(want)) * g;
        pet.holder.rotation.y += (target - pet.holder.rotation.y) * Math.min(1, dt * 3);
    }
    camera.position.copy(pos).add(car.position);
    camera.lookAt(tgt.add(car.position));
    lobbyLookAt.copy(tgt);   // 출발 연출이 이어받을 시선
}

