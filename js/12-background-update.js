/* 12-background-update.js — 배경 물체 합치기(최적화) · 매 프레임 게임 진행(update)
   ※ index.html에 적힌 순서대로 불러와야 함 (앞 파일의 변수·함수를 뒤 파일이 씀) */

/* ==========================================
   [최적화 2단계] 배경 물체 합치기
   - 건물·가로등(도시)과 나무·꽃·물결(소풍길)을 '같은 재질끼리' 한 덩어리로 합침
   - 합친 띠(길이 450)를 2개 이어 붙여 번갈아 흘려보냄 → 예전과 같은 위치에 같은 모습
   - 신호등·횡단보도는 불빛이 바뀌어야 해서 따로 둠
   - 문제가 생기면 MERGE_BACKGROUND = false 로 바꾸면 예전 방식으로 돌아감
   ========================================== */
const MERGE_BACKGROUND = true;
const STRIP_LEN = 450;
let cityStrips = null, natureStrips = null, crossings = [];
let cityScroll = 0, natureScroll = 0;
// 예전 배경은 z -400 ~ 50 사이에만 있었음 → 합친 띠도 -400보다 먼 부분은 잘라서 똑같이 보이게
const STRIP_CLIP = [new THREE.Plane(new THREE.Vector3(0, 0, 1), 400)];

function bakeStrip(objs, parent) {
    const strip = new THREE.Group();
    const buckets = new Map();   // 재질 → { pos, nor, uv }
    const m3 = new THREE.Matrix3(), v = new THREE.Vector3(), n = new THREE.Vector3();
    parent.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
    const rel = new THREE.Matrix4();
    objs.forEach(o => {
        o.updateMatrixWorld(true);
        o.traverse(c => {
            rel.multiplyMatrices(inv, c.matrixWorld);           // 부모 기준 위치
            if (c.isSprite) {                                   // 빛 번짐은 합칠 수 없어서 그대로 복사
                c.material.clippingPlanes = STRIP_CLIP;
                const s = new THREE.Sprite(c.material); s.scale.copy(c.scale); s.visible = c.visible;
                s.position.setFromMatrixPosition(rel); s.userData = c.userData; strip.add(s); return;
            }
            if (!c.isMesh) return;
            const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry;
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            const groups = g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
            const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
            m3.getNormalMatrix(rel);
            groups.forEach(gr => {
                // 재질이 하나뿐인 물체는 면 그룹 번호와 상관없이 그 재질 사용
                const mat = Array.isArray(c.material) ? mats[gr.materialIndex || 0] : c.material;
                let bk = buckets.get(mat); if (!bk) { bk = { pos: [], nor: [], uv: [] }; buckets.set(mat, bk); }
                for (let i = gr.start; i < gr.start + gr.count; i++) {
                    v.fromBufferAttribute(P, i).applyMatrix4(rel); bk.pos.push(v.x, v.y, v.z);
                    n.fromBufferAttribute(N, i).applyMatrix3(m3).normalize(); bk.nor.push(n.x, n.y, n.z);
                    if (U) bk.uv.push(U.getX(i), U.getY(i)); else bk.uv.push(0, 0);
                }
            });
            if (g !== c.geometry) g.dispose();
        });
        parent.remove(o);
        o.traverse(c => { if (c.isMesh && c.geometry) c.geometry.dispose(); });
    });
    buckets.forEach((bk, mat) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(bk.pos, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(bk.nor, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(bk.uv, 2));
        geo.computeBoundingSphere();
        mat.clippingPlanes = STRIP_CLIP;
        const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true;
        strip.add(mesh);
    });
    const copy = strip.clone();      // 두 번째 띠 (지오메트리·재질 공유)
    parent.add(strip, copy);
    return [strip, copy];
}
function placeStrips(pair, S) {
    const o = ((S % STRIP_LEN) + STRIP_LEN) % STRIP_LEN;
    pair[0].position.z = o; pair[1].position.z = o - STRIP_LEN;
}
if (MERGE_BACKGROUND) {
    renderer.localClippingEnabled = true;
    crossings = buildings.filter(b => trafficLights.some(tl => tl.group.parent === b));
    crossings.forEach(b => { b.userData.tl = trafficLights.find(tl => tl.group.parent === b); fadeTrafficLight(b.userData.tl, b.position.z); });
    const cityStatic = buildings.filter(b => !crossings.includes(b));
    cityStrips = bakeStrip(cityStatic, cityGroup);
    natureStrips = bakeStrip(natureScrollers, natureGroup);
    placeStrips(cityStrips, 0); placeStrips(natureStrips, 0);
}
applyHiMode();

function update(realDt) {
    if (gameState === 'LOBBY') { updateLobby(realDt); return; }
    if (gameState === 'COUNTDOWN') { if (intro) updateIntro(realDt); updateCountdown(realDt); return; }
    if (gameState === 'CRASH' && crash) { updateCrash(realDt); return; }
    if (gameState === 'ENDING' && ending) { updateEnding(realDt); return; }
    if (gameState === 'SUCCESS_ANIM') {
        successAnimTimer += realDt;

        // 환경 이동 (속도 유지)
        roadOffset += roadSpeed * realDt;
        markersGroup.position.z = roadOffset % 15;
        scrollEnvironment(roadSpeed * realDt);

        // 목적지 다가오기
        if (destinationMesh) {
            destinationMesh.position.z += roadSpeed * realDt;
            // 플레이어 차량과 목적지 충돌 시 클리어 처리
            if (destinationMesh.position.z > -5) { startEnding(); return; }
        }

        // 플레이어를 중앙으로 서서히 이동
        player.meshGroup.position.x = THREE.MathUtils.lerp(player.meshGroup.position.x, 0, 5 * realDt);
        player.meshGroup.rotation.z = player.meshGroup.position.x * 0.1;

        // 충돌 직전 카메라 줌인 연출 (시점이 차를 똑바로 보도록)
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 2 * realDt);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, player.meshGroup.position.z + 8, 2 * realDt);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 5, 2 * realDt);
        camera.lookAt(0, 0, -20);

        return;
    }

    if (gameState !== 'PLAYING') return;

    // 무한모드: 60초에 목적지 없이 '지각' 알림(시계 파동·late-fx.js)만 주고 계속 달림
    if (runEndless && gameTime >= 60 && !endlessAnnounced) {
        endlessAnnounced = true; endlessNextBanner = 70;
        showEndlessBanner(0);
    }
    if (runEndless && endlessAnnounced && gameTime >= endlessNextBanner) {   // 70초, 80초, 90초 …
        showEndlessBanner(endlessNextBanner - 60);
        endlessNextBanner += 10;
    }
    // 60초 도달 시 도착 애니메이션 진입 (일반 모드)
    if (gameTime >= 60 && !runEndless) {
        gameState = 'SUCCESS_ANIM';
        hideRaceNotices();
        petSay('win', true);
        setText('clockDisplay', pad2(COURSE_INFO[selectedTheme].startH + 1) + ':00:00');
        document.getElementById('clockDisplay').classList.remove('late');
        setText('clockGoal', '✓ 도착'); document.getElementById('clockGoal').parentElement.classList.remove('late');
        successAnimTimer = 0;

        // 남은 적 모두 제거
        enemies.forEach(e => removeCar(e.meshGroup));
        enemies = [];

        // 조작 버튼 숨기기 + 효과 정리
        document.getElementById('controls').classList.add('hidden');
        player.slowTimer = 0; player.timeScale = 1.0; setGrayscale(false);
        player.invincibleTimer = 0; player.meshGroup.visible = true;
        player.isJumping = false; player.meshGroup.position.y = 0;
        updateScreenFx();

        // 테마에 맞는 목적지 생성
        // [최적화] 시작할 때 미리 만들어둔 목적지를 앞으로 꺼내기만 함 (60초 순간 끊김 방지)
        if (!destinationMesh) { destinationMesh = createDestination(selectedTheme); scene.add(destinationMesh); }
        destinationMesh.position.set(0, 0, -250);
        return;
    }

    // 잔소리 팝업 트리거
    if (gameTime > nextPopupTime) {
        showPopup();
        nextPopupTime = gameTime + 8 + Math.random() * 5;
    }

    // [수정1] 타임 슬로우: 세상(도로·적·점수)만 느려지고, 생존 시간은 실제 시간으로 흐름
    if (player.slowTimer > 0) {
        player.slowTimer -= realDt;
        if (player.slowTimer <= 0) {
            player.slowTimer = 0;
            player.timeScale = 1.0;
            setGrayscale(false);
            updateScreenFx();
        }
    }
    if (player.skillTimer > 0) player.skillTimer = Math.max(0, player.skillTimer - realDt);
    if (player.ability === 'TIME_SLOW') updateSkillUI();

    let dt = realDt * player.timeScale;

    gameTime += realDt;
    setText('timeDisplay', (Math.floor(gameTime * 10) / 10).toFixed(1) + "s");   // 결과 화면·랭킹과 같은 방식(버림)
    updateRaceClock();

    // 속도 계산 (테마 적용)
    roadSpeed = (120 + Math.min(gameTime, 60) * 2) * tConfig.speedMult;   // 무한모드: 60초 때 속도 그대로 유지
    updateSpeedHud(roadSpeed);


    // 플레이어 이동 (드리프트 특성 반영)
    // [수정] 드리프트 머신은 기본 대비 300% (10 -> 30)
    // 프레임이 끊겨도 차가 목표 차선을 지나쳐 튀지 않도록 지수 보간 사용
    let moveLerp = player.ability === 'FAST_MOVE' ? 30 : 10;
    const moveT = 1 - Math.exp(-moveLerp * realDt);
    player.meshGroup.position.x = THREE.MathUtils.lerp(player.meshGroup.position.x, player.targetX, moveT);
    player.meshGroup.rotation.z = (player.meshGroup.position.x - player.targetX) * 0.1;

    // 점프 처리
    if (player.isJumping) {
        player.jumpTimer -= realDt;
        player.meshGroup.position.y = Math.sin((1 - player.jumpTimer) * Math.PI) * 4;
        if (player.jumpTimer <= 0) {
            player.isJumping = false; player.meshGroup.position.y = 0;
            updateScreenFx();
        }
    }

    // [수정3] 쉴드 발동 후 무적 (점프와 별개, 차량 깜빡임)
    if (player.invincibleTimer > 0) {
        player.invincibleTimer -= realDt;
        player.meshGroup.visible = Math.floor(player.invincibleTimer * 12) % 2 === 0;
        if (player.invincibleTimer <= 0) {
            player.invincibleTimer = 0;
            player.meshGroup.visible = true;
            updateScreenFx();
        }
    }

    // 카메라 추적 (좌우 이동 시 시점이 꺾이지 않고 자동차의 뒤를 평행하게 쫓아감)
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, player.meshGroup.position.x * 0.8, 5 * realDt);
    camera.position.z = 12; camera.position.y = 8;
    camera.lookAt(camera.position.x, 0, -20);

    // 환경 스크롤
    roadOffset += roadSpeed * dt;
    markersGroup.position.z = roadOffset % 15;
    scrollEnvironment(roadSpeed * dt);

    spawnEnemies(dt);

    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        const prevZ = e.meshGroup.position.z;
        e.meshGroup.position.z += (roadSpeed - e.speed) * dt;

        if (e.meshGroup.position.z > 20) {
            removeCar(e.meshGroup); enemies.splice(i, 1); continue;
        }

        // 충돌 판정
        const isInvincible = player.isJumping || player.invincibleTimer > 0;
        if (!isInvincible && (checkCollision(player, e) || sweptCollision(player, e, prevZ))) {
            if (player.hasShield) {
                player.hasShield = false;
                document.getElementById('shieldIcon').classList.add('hidden');

                // 적 제거 + 별도 무적 타이머 (점프 상태는 건드리지 않음)
                removeCar(e.meshGroup); enemies.splice(i, 1);
                player.invincibleTimer = SHIELD_INVINCIBLE;
                updateScreenFx();
                showToast("🛡️ 쉴드가 충돌을 막았습니다!");
            } else {
                startCrash(e); return;
            }
        }
    }
}

