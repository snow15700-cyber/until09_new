# 9시까지 출근하세요

HINT 2조 (김창명 · 김홍기 · 박소희 · 신재현 · 정인채 · 홍의성)

## 업데이트할 때 꼭 지킬 것
- **압축 푼 폴더 전체를 통째로 올리기.** 파일이 하나라도 빠지면 게임이 안 떠요.
- 먼저 `test` 브랜치에 올려서 확인 → 괜찮으면 Pull request로 `main`에 합치기.
- `js` 폴더의 파일은 `index.html`에 적힌 **순서대로** 불러와요. 파일 이름이나 순서를 바꾸면 안 돼요.

## 파일 지도
| 파일 | 하는 일 |
|---|---|
| `index.html` | 화면 뼈대 (로비·HUD·팝업·결과 화면 HTML), 로딩 화면, 파일 불러오기 |
| `css/tailwind.css` | 미리 빌드한 Tailwind 스타일 (손으로 고치지 않음) |
| `css/game.css` | 게임 기본 디자인 |
| `css/ui-polish.css` | 폰트 · 버튼 눌림 · 화면 전환 · 아이콘 스타일 |
| `js/01-data.js` | 저장 데이터(크레딧·차량·기록) 불러오기/저장 |
| `js/02-online-ranking.js` | 닉네임 · 온라인 랭킹 · 명예의 전당 (Supabase) |
| `js/03-lobby-ui.js` | 로비 화면 · 코스/차량/반려동물 탭 |
| `js/04-admin.js` | 관리자 통계 |
| `js/05-audio.js` | 배경음악 · 효과음 · 음소거 |
| `js/06-scene.js` | 3D 화면 준비 · 배경 만들기 |
| `js/07-car-models.js` | 차량 3D 모델 |
| `js/08-pets.js` | 반려동물 3D 모델 · 말풍선 |
| `js/09-game-state.js` | 게임 상태 · 출발 준비 |
| `js/10-destination.js` | 60초 도착 목적지 · 주행 중 처리 |
| `js/11-effects.js` | 속도감 · 충돌 · 폭발 연출 · 고사양 모드 |
| `js/12-background-update.js` | 배경 합치기(최적화) · 매 프레임 게임 진행 |
| `js/13-lobby-cinema.js` | 로비 카메라 연출 |
| `js/14-race-intro.js` | 로비 → 주행 카메라 연출 · 게임 루프 |
| `js/15-screenshot.js` | 스크린샷 저장 |
| `js/16-car-preview.js` | 로비 차량 미리보기 |
| `js/17-gacha.js` | 차량 뽑기 연출 · 게임 시작 (맨 마지막) |
| `js/ui-tap.js` | 탭 효과음 · 진동 |
| `js/ui-transitions.js` | 팝업 등장/퇴장 · 숫자 카운트업 |
| `audio/` | 배경음악 · 뽑기 효과음 (mp3) |
