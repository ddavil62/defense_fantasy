# Fantasy Tower Defense — 아트 스타일 가이드

## 기본 방향

- **스타일**: 픽셀아트, 탑다운 뷰, 카툰 느낌
- **생성 방식**: AI 이미지 생성 (Midjourney / DALL-E / Stable Diffusion) + 후보정
- **소스 해상도**: 500x500px (AI 생성) → 128x128px (리사이즈 후 저장)
- **게임 표시 크기**: 64x64px (`setDisplaySize`) — 셀(40x40)보다 크게 돌출하여 존재감 확보
- **애니메이션**: 1단계 정적, 향후 idle(2~4f) + 공격 모션 확장 예정

---

## 컬러 팔레트

### 타워 10종 대표색

| 타워 | 코드 색상 | HEX | 아트 팔레트 방향 |
|---|---|---|---|
| Archer (궁수) | `0x00b894` | #00B894 | 민트/에메랄드 그린 — 가죽+나무 활, 녹색 후드 |
| Mage (마법사) | `0x6c5ce7` | #6C5CE7 | 보라/인디고 — 보라 로브, 마법 구슬 |
| Ice (얼음) | `0x74b9ff` | #74B9FF | 하늘/아이스블루 — 얼음 결정체, 파란 광택 |
| Lightning (번개) | `0xfdcb6e` | #FDCB6E | 골드/옐로우 — 번개 문양, 노란 전기 이펙트 |
| Flame (불꽃) | `0xe17055` | #E17055 | 코랄/오렌지 — 화로/횃불, 주황 불꽃 |
| Rock (바위) | `0x636e72` | #636E72 | 슬레이트/그레이 — 거대 바위+쇠뇌, 무게감 |
| Poison (독안개) | `0xa8e063` | #A8E063 | 라임/독 그린 — 독 플라스크, 연기 |
| Wind (바람) | `0x81ecec` | #81ECEC | 시안/민트 — 바람개비/소용돌이, 투명감 |
| Light (빛) | `0xffeaa7` | #FFEAA7 | 페일 골드/크림 — 프리즘/등대, 빛줄기 |
| Dragon (드래곤) | `0xd63031` | #D63031 | 진홍/크림슨 — 용 조각상/제단, 불꽃 |

### 공통 팔레트 규칙

- 각 타워의 대표색을 메인으로, **밝은 하이라이트 1색 + 어두운 쉐도우 1색** = 3색 기본
- 배경과 구분되도록 **외곽선(outline)**: 1px 검정(#1a1a2e) 또는 짙은 색
- 눈, 장식 등 디테일에 **화이트/크림 악센트** 허용
- 타워당 **총 4~6색** 제한 (픽셀아트 클린함 유지)

---

## 타워 디자인 가이드

### 공통 규칙

- **탑다운 시점**: 약간 비스듬한 탑다운 (3/4 뷰 아님, 순수 위에서 내려다보는 느낌)
- **실루엣 구분**: 10종이 64px 표시 크기에서 즉시 구별되어야 함
- **성격 표현**: 각 타워는 "건물/구조물" + "무기/특성 힌트"로 구성
- **크기**: 소스 128x128px 전체 사용, 투명 여백으로 자연스러운 실루엣 확보
- **배경**: 투명(transparent)

### 타워별 디자인 시트

#### 1. Archer (궁수)
- **형태**: 나무 감시탑 + 상단에 활/화살 장식
- **실루엣**: 위로 좁아지는 삼각형 계열
- **색상**: 에메랄드 그린 지붕/후드 + 갈색 나무
- **특징**: 화살이 꽂힌 화살통 표현

#### 2. Mage (마법사)
- **형태**: 둥근 마법사 탑 + 꼭대기 수정 구슬
- **실루엣**: 원형/돔
- **색상**: 보라 로브/벽면 + 보라빛 광택의 구슬
- **특징**: 구슬에 밝은 하이라이트 점

#### 3. Ice (얼음)
- **형태**: 얼음 결정(크리스탈) 기둥
- **실루엣**: 마름모/다이아몬드
- **색상**: 아이스 블루 + 흰색 하이라이트
- **특징**: 반투명 느낌, 날카로운 각진 모서리

#### 4. Lightning (번개)
- **형태**: 테슬라 코일/피뢰침 구조물
- **실루엣**: 세로로 긴 형태 + 상단 지그재그
- **색상**: 금속 회색 베이스 + 노란 전기
- **특징**: 번개 볼트 장식이 핵심 식별자

#### 5. Flame (불꽃)
- **형태**: 화로/용광로 — 상단이 열린 가마
- **실루엣**: 아래 넓고 위에 불꽃이 피어오름
- **색상**: 짙은 오렌지/빨강 + 노란 불꽃 팁
- **특징**: 위에서 보이는 불씨/불꽃 파티클

#### 6. Rock (바위)
- **형태**: 거대 바위 + 카타펄트/투석기
- **실루엣**: 육각형 계열, 묵직한 덩어리
- **색상**: 슬레이트 그레이 + 약간의 갈색
- **특징**: 거칠고 각진 질감, 무게감

#### 7. Poison (독안개)
- **형태**: 독 가마솥/연금술 플라스크
- **실루엣**: 오각형 또는 둥근 솥 형태
- **색상**: 라임 그린 + 진녹색 그림자
- **특징**: 위로 피어오르는 독 연기(1~2px)

#### 8. Wind (바람)
- **형태**: 바람개비/풍차 — 회전체가 보이는 구조
- **실루엣**: 반원 + 날개, 움직임을 암시
- **색상**: 밝은 시안 + 흰색 바람 줄기
- **특징**: 소용돌이/회오리 표현

#### 9. Light (빛)
- **형태**: 프리즘/등대 — 빛을 집중하는 렌즈
- **실루엣**: 팔각형, 방사형
- **색상**: 페일 골드/크림 + 밝은 노란 중심
- **특징**: 중앙에서 퍼지는 빛줄기

#### 10. Dragon (드래곤)
- **형태**: 용의 제단/둥지 — 용 두상 조각
- **실루엣**: 원형 베이스 + X형 교차, 가장 큰 존재감
- **색상**: 진홍/크림슨 + 금색 악센트
- **특징**: 작은 불꽃/용 뿔 디테일, 가장 화려

---

## AI 생성 프롬프트 템플릿

### 기본 프롬프트 구조

```
32x32 pixel art, top-down view, single [타워 설명],
dark fantasy cartoon style, clean pixel art,
limited palette (4-6 colors), black outline,
transparent background, game asset sprite sheet style,
no text, centered composition
```

### 타워별 프롬프트

#### Archer
```
32x32 pixel art, top-down view, wooden watchtower with green hood and arrows,
emerald green (#00B894) roof, brown wood base,
dark fantasy cartoon style, clean pixel art, limited palette, black outline,
transparent background, game asset, no text, centered
```

#### Mage
```
32x32 pixel art, top-down view, round wizard tower with purple crystal orb on top,
indigo purple (#6C5CE7) robes and walls, glowing orb highlight,
dark fantasy cartoon style, clean pixel art, limited palette, black outline,
transparent background, game asset, no text, centered
```

#### Ice
```
32x32 pixel art, top-down view, ice crystal pillar / diamond shaped frozen structure,
ice blue (#74B9FF) with white highlights, sharp angular edges,
dark fantasy cartoon style, clean pixel art, limited palette, black outline,
transparent background, game asset, no text, centered
```

#### Lightning
```
32x32 pixel art, top-down view, tesla coil / lightning rod tower,
metallic gray base with golden yellow (#FDCB6E) electric sparks,
dark fantasy cartoon style, clean pixel art, limited palette, black outline,
transparent background, game asset, no text, centered
```

#### Flame
```
32x32 pixel art, top-down view, furnace / brazier with flames rising from top,
coral orange (#E17055) body with yellow flame tips,
dark fantasy cartoon style, clean pixel art, limited palette, black outline,
transparent background, game asset, no text, centered
```

#### Rock
```
32x32 pixel art, front-facing symmetrical view, massive stone fortress tower
with a giant boulder loaded on top, heavy stone brick walls,
slate gray (#636E72) stone base with dark brown wood reinforcements,
thick chunky silhouette, hexagonal bulky shape, front-facing centered composition,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset sprite, no text, centered,
same perspective as other tower sprites in the set
```

#### Poison
```
32x32 pixel art, top-down view, bubbling cauldron / alchemy flask,
lime green (#A8E063) liquid with dark green shadows, toxic smoke wisps,
dark fantasy cartoon style, clean pixel art, limited palette, black outline,
transparent background, game asset, no text, centered
```

#### Wind
```
32x32 pixel art, top-down view, windmill / wind vane with spinning blades,
bright cyan (#81ECEC) with white wind streaks, airy and light,
dark fantasy cartoon style, clean pixel art, limited palette, black outline,
transparent background, game asset, no text, centered
```

#### Light
```
32x32 pixel art, top-down view, lighthouse / prism lens focusing light,
pale gold (#FFEAA7) with bright yellow center, radiating light rays,
dark fantasy cartoon style, clean pixel art, limited palette, black outline,
transparent background, game asset, no text, centered
```

#### Dragon
```
32x32 pixel art, top-down view, dragon altar / dragon head statue with small flames,
crimson red (#D63031) with gold accents, horns and fire details,
dark fantasy cartoon style, clean pixel art, limited palette, black outline,
transparent background, game asset, no text, centered
```

---

## 기술 사양

### 파일 규격

- **포맷**: PNG (투명 배경)
- **소스 크기**: 500x500px (AI 생성 원본)
- **저장 크기**: 128x128px (HighQualityBicubic 리사이즈)
- **네이밍**: `{Type}.png` (PascalCase, 예: `Archer.png`, `Dragon.png`)
- **경로**: `fantasydefence/assets/tower/`

### 렌더링 규칙

- **T1 기본 타워**: `Sprite` 기반 이미지 렌더링 (64x64 displaySize, depth 10)
- **T2~T5 합성 타워**: 이미지 없음 → 기존 `Graphics` 도형 폴백
- **합성 시**: T1 스프라이트를 `destroy()` 후 Graphics로 전환
- **UI 아이콘** (TowerPanel, CollectionScene 등): Graphics 도형 유지 (소형 아이콘에 적합)
- **프리로드**: `BootScene.preload()`에서 `tower_{type}` 키로 10종 로드

### 향후 확장 (애니메이션)

- 스프라이트시트: 가로 나열 (128x128 x N프레임)
- idle: 2~4프레임, 300~500ms 간격
- attack: 3~5프레임, 100~200ms 간격
- 네이밍: `{Type}_idle.png`, `{Type}_attack.png`
