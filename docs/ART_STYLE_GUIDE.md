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

### T2 합성 타워 프롬프트 (55종)

#### 동종 합성 (10종)

##### Rapid Archer (연속 사격수)
```
32x32 pixel art, top-down view, dual crossbow watchtower with rapid-fire mechanism and arrow belt feed,
teal green (#00D6A4) mechanical arms, brown wood base with spinning arrow drums,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Overload Mage (과충전 술사)
```
32x32 pixel art, top-down view, cracked arcane tower overflowing with unstable magical energy,
deep violet (#8B7CF7) swirling aura, fractured crystal orb pulsing with power,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Zero Field (절대 영역)
```
32x32 pixel art, top-down view, frozen obelisk radiating concentric frost rings outward,
icy blue (#5FA8FF) crystalline spire, pale white frost waves expanding from base,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Thunder Lord (뇌제)
```
32x32 pixel art, top-down view, towering tesla spire crowned with eight branching lightning arcs,
electric gold (#FDD835) bolts arcing between antenna tips, dark iron frame,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Inferno (업화)
```
32x32 pixel art, top-down view, raging infernal furnace with pillars of fire erupting upward,
deep flame red (#FF5733) molten core, orange-yellow fire columns rising from vents,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Quake (지진파)
```
32x32 pixel art, top-down view, massive seismic hammer embedded in cracked stone platform,
gunmetal gray (#808E93) steel head, fractured ground lines radiating outward,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Plague (역병의 근원)
```
32x32 pixel art, top-down view, corrupted cauldron overflowing with bubbling plague miasma,
sickly green (#7BC842) toxic fumes, dark iron pot with dripping ooze puddles,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Typhoon (대태풍)
```
32x32 pixel art, top-down view, swirling vortex engine with spinning blade ring,
turquoise (#63D8D8) cyclone spiral, white wind streaks around rotating core,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Solar Burst (태양 폭발)
```
32x32 pixel art, top-down view, radiant sun prism emitting explosive light beams in all directions,
bright gold (#FFE066) glowing core, pale yellow radiating shockwave rings,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Ancient Dragon (고대 용왕)
```
32x32 pixel art, top-down view, ancient dragon skull throne wreathed in poison smoke and fire,
dark crimson (#B71C1C) bone altar, green toxic fumes and orange embers swirling,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

#### 이종 합성 — 궁수 관련 (8종)

##### Arcane Archer (마법 화살사)
```
32x32 pixel art, top-down view, enchanted crossbow tower with glowing arcane-tipped bolts,
mystic blue (#368BBD) magical runes on arrows, purple crystal scope mounted on wood frame,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Cryo Sniper (냉동 저격수)
```
32x32 pixel art, top-down view, frost-coated sniper tower with icicle-tipped long rifle,
frozen teal (#3AB8CA) ice-encrusted barrel, white frost crystals along scope,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Shock Arrow (전격 화살)
```
32x32 pixel art, top-down view, electrified bow tower with sparking chain-lightning arrows,
green-gold (#7EC281) bow limbs, yellow electric arcs jumping between arrowheads,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Fire Arrow (화염 화살)
```
32x32 pixel art, top-down view, blazing bow tower with fire-dipped arrows in flaming quiver,
forest green (#70C475) wooden frame, orange flame trails on arrow tips,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Armor Pierce (철갑 화살)
```
32x32 pixel art, top-down view, reinforced siege crossbow tower with heavy steel-tipped bolts,
dark teal (#319483) iron-plated frame, metallic silver piercing arrowheads,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Venom Shot (독화살)
```
32x32 pixel art, top-down view, poison-dipped arrow tower with dripping venom vials on rack,
toxic green (#54CC7B) oozing arrowheads, dark wood base with bubbling poison jars,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Gale Arrow (폭풍 화살)
```
32x32 pixel art, top-down view, wind-enchanted bow tower with swirling air current around arrows,
aqua green (#40D2C0) wind-wrapped shaft, white spiral gusts trailing from bow,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Holy Arrow (신성 화살)
```
32x32 pixel art, top-down view, sacred bow tower emitting piercing holy light beam from arrow tip,
holy green (#7FD19E) gilded bow frame, bright golden beam cutting forward,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

#### 이종 합성 — 마법사 관련 (7종)

##### Frost Mage (서리 술사)
```
32x32 pixel art, top-down view, frozen wizard tower with ice-crystal staff and frost nova ring,
blue-violet (#7080F3) frozen robes, pale ice shards orbiting the crystal orb,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Storm Mage (폭풍 마법사)
```
32x32 pixel art, top-down view, storm-wreathed mage tower crackling with thunder and wind,
mauve (#B494AA) arcane robes, golden lightning bolts and swirling gray clouds,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Pyromancer (화염 술사)
```
32x32 pixel art, top-down view, fire mage tower with blazing staff and molten spell circles,
dusky rose (#A7666E) scorched robes, orange-red flame orbs orbiting the tower,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Gravity Mage (중력 마법사)
```
32x32 pixel art, top-down view, gravity distortion tower with floating debris and warped space,
deep indigo (#6865AC) robes, dark purple gravitational pull lines bending inward,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Toxic Mage (독기 술사)
```
32x32 pixel art, top-down view, plague mage tower with toxic spell tome and poison cloud ring,
olive green (#8A9E75) tattered robes, bright green poison mist erupting from open book,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Vacuum Mage (진공 마법사)
```
32x32 pixel art, top-down view, void mage tower with swirling vacuum vortex pulling debris inward,
sky blue (#76A4EA) robes with white suction lines, central dark void sphere,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Radiant Mage (성광 마법사)
```
32x32 pixel art, top-down view, radiant mage tower glowing with holy light and burning aura,
lavender (#B5A3C7) luminous robes, bright golden halo and light rays from staff tip,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

#### 이종 합성 — 얼음 관련 (6종)

##### Thunder Frost (전격 빙결)
```
32x32 pixel art, top-down view, electrified ice pillar with frozen lightning bolts trapped inside,
pale green (#B8D2B7) frost-coated spire, yellow sparks arcing through ice surface,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Cryo Flame (냉열 교차)
```
32x32 pixel art, top-down view, half-frozen half-burning tower split between fire and ice,
sage green (#ABC4AA) base, left side icy blue crystals and right side orange flames,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Glacier (빙산)
```
32x32 pixel art, top-down view, massive glacier fortress launching enormous ice boulders,
deep teal (#6B9EB9) towering ice walls, pale blue giant frozen projectile on catapult,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Frost Venom (동상 독)
```
32x32 pixel art, top-down view, frozen cauldron spewing icy toxic mist with frost crystals,
mint green (#8ECFB1) frozen poison vapors, teal ice shards mixed with green droplets,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Blizzard (빙풍)
```
32x32 pixel art, top-down view, howling blizzard generator with spinning frost vortex,
bright sky blue (#7BD4F6) swirling snowstorm, white ice particles and wind streaks,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Holy Ice (성빙)
```
32x32 pixel art, top-down view, sacred ice prism emitting holy frost beam with divine glow,
pale teal (#B9D2D3) holy ice lens, golden-white beam cutting through frost mist,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

#### 이종 합성 — 번개 관련 (5종)

##### Thunder Fire (벼락불)
```
32x32 pixel art, top-down view, blazing tesla coil with fire-wreathed lightning chains,
warm orange (#F09E62) flaming conductor, yellow electric arcs igniting into fire trails,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Thunder Strike (천둥 강타)
```
32x32 pixel art, top-down view, armored lightning pylon with heavy thunder hammer on top,
bronze (#B09D70) reinforced plating, golden bolt striking down from hammer head,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Toxic Shock (독전기)
```
32x32 pixel art, top-down view, corroded electrical tower leaking toxic sparks and green fumes,
sickly yellow (#D3D069) oxidized coils, green poison dripping from sparking electrodes,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Storm Bolt (폭풍 전격)
```
32x32 pixel art, top-down view, wind-charged lightning rod with swirling storm and chain bolts,
pale green (#BFDBAD) wind-wrapped spire, yellow arcs spiraling outward with gusts,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Holy Thunder (신성 번개)
```
32x32 pixel art, top-down view, divine judgment pillar channeling five holy lightning bolts,
bright gold (#FDE08B) sacred runes glowing, white-gold chain lightning arcing between halos,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

#### 이종 합성 — 불꽃 관련 (4종)

##### Magma Shot (용암탄)
```
32x32 pixel art, top-down view, volcanic mortar tower launching molten magma projectiles,
burnt sienna (#A26F64) rocky barrel, orange-red lava pooling at base with smoke,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Venom Fire (맹독 화염)
```
32x32 pixel art, top-down view, toxic flame burner with green-tinted fire and poison drip nozzle,
dark gold (#C4A85C) corroded burner, green-orange hybrid flames with dripping venom,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Fire Storm (화염 폭풍)
```
32x32 pixel art, top-down view, whirling fire tornado generator with spinning flame ring,
magenta red (#B12E71) vortex core, orange fire spiral expanding outward with embers,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Solar Flame (태양광 화염)
```
32x32 pixel art, top-down view, solar-focused flame cannon with magnifying lens and fire beam,
warm gold (#F0C57E) lens housing, concentrated orange-white beam burning forward,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

#### 이종 합성 — 바위 관련 (3종)

##### Toxic Boulder (독암)
```
32x32 pixel art, top-down view, poison-soaked boulder catapult with toxic rock ammunition,
olive (#86A76B) moss-covered stone, green ooze dripping from loaded toxic boulder,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Stone Gale (바위 폭풍)
```
32x32 pixel art, top-down view, wind-propelled stone launcher with orbiting rock shards,
teal gray (#72ADAF) stone-and-wind hybrid, white gusts carrying gray rock fragments,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Holy Stone (성광 바위)
```
32x32 pixel art, top-down view, sacred stone monolith emitting piercing holy beam from cracks,
sandstone (#B1AC8D) blessed rock pillar, golden light beams erupting through ancient runes,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

#### 이종 합성 — 독 관련 (2종)

##### Toxic Gale (독풍)
```
32x32 pixel art, top-down view, poison wind generator spewing toxic cyclone with green particles,
bright mint (#94E6A6) spinning toxic vortex, dark green poison droplets in swirling gusts,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Purge Venom (정화의 독)
```
32x32 pixel art, top-down view, holy-purifying poison tower with golden light cleansing green toxin,
yellow-green (#D3E285) radiant venom lens, golden beam piercing through green toxic mist,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

#### 이종 합성 — 바람 관련 (1종)

##### Radiant Gale (성광 폭풍)
```
32x32 pixel art, top-down view, holy windmill tower with luminous spinning blades and light trails,
pale mint (#C0E7CA) divine wind vanes, golden-white light streaks from spinning holy blades,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

#### 이종 합성 — 드래곤 관련 (9종)

##### Dragon Rider (용기병)
```
32x32 pixel art, top-down view, dragon cavalry outpost with mounted lance and dragon banner,
forest green (#6B9463) scaled saddle platform, red dragon wing motifs on wooden lance rack,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Dragon Mage (용마법사)
```
32x32 pixel art, top-down view, dragon skull sorcery tower with arcane dragon-fire orb floating above,
dark magenta (#A1468C) enchanted dragon bones, purple-red magical flames swirling around skull,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Frost Dragon (빙룡)
```
32x32 pixel art, top-down view, ice dragon lair with frozen dragon head breathing frost nova,
faded rose (#A37498) icy scales, blue frost breath expanding from crystal dragon maw,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Thunder Dragon (뇌룡)
```
32x32 pixel art, top-down view, storm dragon perch crackling with chain lightning from horns,
fiery orange (#E57E50) electrified dragon scales, golden arcs branching from twin horn tips,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Inferno Dragon (업화룡)
```
32x32 pixel art, top-down view, hellfire dragon altar with twin fire pillars and molten dragon core,
blazing red (#DC5043) infernal scales, intense orange-white flames erupting from dragon maw,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Stone Dragon (석룡)
```
32x32 pixel art, top-down view, petrified dragon statue fortress with stone armor plating,
dark maroon (#9C4F52) stone dragon hide, gray rock segments forming armored dragon body,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Venom Dragon (독룡)
```
32x32 pixel art, top-down view, toxic dragon den dripping with corrosive venom from fangs,
amber (#BF894A) poisonous dragon scales, bright green venom pools beneath dragon jaw,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Storm Dragon (폭풍룡)
```
32x32 pixel art, top-down view, wind dragon roost with swirling tempest around dragon wings,
dusty rose (#AB798E) storm-scaled dragon, white cyclone winds circling the winged silhouette,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Holy Dragon (성룡)
```
32x32 pixel art, top-down view, divine dragon sanctuary with golden-winged dragon emitting holy beam,
warm peach (#EA956C) blessed dragon scales, bright golden beam projecting from dragon's open mouth,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

### T3 합성 타워 프롬프트 (30종)

#### T2+T2 조합 (12종)

##### Thunder Wyrm King (용뇌황제)
```
32x32 pixel art, top-down view, imperial dragon throne crackling with ten branching lightning chains,
royal gold (#FFC312) electrified dragon emperor crown, crimson scales with golden thunderbolts,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Plague Wyrm (역병용신)
```
32x32 pixel art, top-down view, decaying dragon god altar oozing plague fire and corrosive venom,
dark brown (#8B5E3C) rotting dragon bones, green toxic clouds mixing with orange fire wisps,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Cosmos Dragon (창세룡)
```
32x32 pixel art, top-down view, celestial dragon shrine with cosmic explosion of light fire and poison,
vivid pink (#FF6B81) stellar dragon scales, golden nova burst with green and red energy trails,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Tectonic Dragon (지각파괴룡)
```
32x32 pixel art, top-down view, earth-shattering dragon fortress with cracked ground and massive stone jaws,
deep brown (#6D4C41) armored tectonic plates, gray rock fragments erupting from dragon maw,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Adamantine Lightning (아다만 뇌격룡)
```
32x32 pixel art, top-down view, adamantine-plated dragon tower with seven thunder chains from iron horns,
rich gold (#C5A028) adamantine dragon armor, silver-blue lightning webs across metallic scales,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Venom Sovereign (독황)
```
32x32 pixel art, top-down view, sovereign poison throne with cascading toxic waterfalls and corroded crown,
dark forest green (#5B8C3E) venomous sovereign robes, bright green acid streams eroding the base,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Absolute Frost Domain (절대빙령역)
```
32x32 pixel art, top-down view, absolute zero ice citadel with expanding permafrost domain rings,
brilliant blue (#3D8BFD) frozen dragon core, white ice crystal wave expanding in concentric circles,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Celestial Judgment (천상심판)
```
32x32 pixel art, top-down view, heavenly dragon tribunal emitting devastating holy fire beam downward,
bright gold (#FFD32A) celestial dragon wings, white-gold judgment beam piercing through clouds,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Superconductor Mage (초전도뇌마)
```
32x32 pixel art, top-down view, supercharged storm mage tower with seven crackling dragon-lightning orbs,
deep gold (#D4A017) superconductive coils, purple-gold electric arcs orbiting the dragon crystal,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Grand Pyromancer (대화염마도사)
```
32x32 pixel art, top-down view, grand fire sorcery citadel with towering inferno pillars and spell circles,
intense red (#FF3838) blazing arcane runes, orange-white flame columns erupting from magic circles,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Lightning Tempest (번개대폭풍)
```
32x32 pixel art, top-down view, massive storm nexus tower with twelve branching chain lightning arcs,
electric gold (#E4C613) tempest core, white-blue lightning web spreading across dark storm clouds,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Hellquake (지옥균열)
```
32x32 pixel art, top-down view, hellfire fissure with molten magma erupting through cracked earth,
dark crimson (#C0392B) lava-filled cracks, orange fire geysers from fractured stone platform,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

#### T2+T1 조합 (18종)

##### Primal Dragon Lord (원시용왕)
```
32x32 pixel art, top-down view, primordial dragon overlord throne with ancient tribal fire and poison totems,
dark blood red (#8E1A1A) primal dragon skull, bone totems with green venom and orange fire tips,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Molten Hell (용화지옥)
```
32x32 pixel art, top-down view, molten hellfire dragon pit with overflowing lava and searing flame pillars,
volcanic orange (#FF4500) magma pools, white-hot fire eruptions from dragon-shaped lava vents,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Iron Dragon (철갑룡)
```
32x32 pixel art, top-down view, iron-plated dragon fortress with reinforced steel scales and siege cannons,
steel gray (#7F8C8D) armored dragon hull, dark metallic plates riveted onto dragon stone body,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Eternal Blizzard (영구동설)
```
32x32 pixel art, top-down view, eternal frozen dragon palace with perpetual blizzard and ice crystal barrier,
bright ice blue (#4FC3F7) glacial dragon wings, white snowstorm vortex surrounding frozen citadel,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Storm Deity (뇌신)
```
32x32 pixel art, top-down view, divine thunder dragon shrine with eight sacred lightning pillars,
bright gold (#F9CA24) divine dragon horns, white-gold thunder bolts arcing between holy pillars,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Great Poison King (독제왕)
```
32x32 pixel art, top-down view, massive poison dragon throne with cascading toxic acid and corroded fangs,
lime green (#6AB04C) venomous dragon crown, dark green acid rivers flowing from corroded dragon maw,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Wind Dragon King (풍신룡왕)
```
32x32 pixel art, top-down view, wind dragon king roost with hurricane-force gale and fiery wing tips,
sky teal (#7EC8E3) tempest dragon wings, white cyclone with orange flame embers at wing edges,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Divine Sun Ray (태양성룡포)
```
32x32 pixel art, top-down view, solar dragon cannon firing concentrated holy sun beam from dragon mouth,
warm gold (#FFE082) blessed dragon scales, brilliant white-gold beam with heat shimmer halo,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Arcane Dragon Sage (용마도사)
```
32x32 pixel art, top-down view, arcane dragon wizard tower with floating spell tomes and dragon fire orbs,
royal purple (#9B59B6) enchanted dragon robes, purple magic circles with red dragon flame accents,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Sky Lancer (천룡창기)
```
32x32 pixel art, top-down view, aerial dragon lancer outpost with dragon-mounted javelin and banner,
emerald green (#27AE60) dragon cavalry saddle, red dragon pennant on golden lance tip,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Death Miasma (사령역병)
```
32x32 pixel art, top-down view, death plague altar with skull-topped cauldron leaking necrotic fumes,
dark green (#4A752C) decaying miasma cloud, sickly yellow-green death fog spreading from skulls,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Thunderstorm King (천뢰지배자)
```
32x32 pixel art, top-down view, supreme lightning citadel with twelve divine thunder chains arcing outward,
imperial gold (#F1C40F) crowned thunder spire, white-blue chain lightning web dominating the sky,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Solar Cannon (태양포)
```
32x32 pixel art, top-down view, colossal solar artillery with massive focusing lens and sun-fire barrel,
amber gold (#FFAB00) polished brass cannon, white-orange concentrated solar beam from huge lens,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Great Typhoon (거대태풍신)
```
32x32 pixel art, top-down view, divine typhoon engine with massive spinning vortex ring and gale force winds,
ocean teal (#00BCD4) colossal cyclone core, white wind walls with debris orbiting the vortex,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Earth Shatterer (대지파괴자)
```
32x32 pixel art, top-down view, titanic stone war-hammer fortress with shattered earth and seismic cracks,
dark earth (#5D4037) massive granite hammer, gray fractured ground radiating from impact point,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Permafrost (만년설원)
```
32x32 pixel art, top-down view, ancient permafrost citadel with eternal ice dome and frozen aura field,
light ice blue (#81D4FA) glacial fortress walls, white frost crystals forming protective dome,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Sacred Judgement Beam (신성심판광)
```
32x32 pixel art, top-down view, divine judgment obelisk channeling eight sacred chain lightning beams,
pale gold (#FFF176) holy rune-carved pillar, white-gold chain beams radiating from angelic crown,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Arcane Cannon (마법대포)
```
32x32 pixel art, top-down view, massive arcane siege cannon with overcharged crystal barrel and rune circles,
deep purple (#7E57C2) enchanted iron barrel, violet magical energy swirling into enormous blast muzzle,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

### T4 합성 타워 프롬프트 (12종)

#### T3+T1 조합 (6종)

##### Void Sniper (허공 저격자)
```
32x32 pixel art, top-down view, void-touched sniper spire with dimensional rift scope and twelve spectral chain beams,
vibrant magenta (#E040FB) void-crystal barrel, purple dimensional tears with spectral chains arcing to targets,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Annihilation Gale (소멸 폭풍신)
```
32x32 pixel art, top-down view, apocalyptic storm deity engine with reality-tearing wind and fire annihilation field,
deep purple (#7C4DFF) void storm core, white-violet cyclone with burning embers erasing the ground,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Magma Core (마그마 핵)
```
32x32 pixel art, top-down view, exposed planetary magma core reactor with erupting lava geysers and searing heat dome,
intense red (#DD2C00) molten core sphere, white-orange magma jets erupting from cracked obsidian shell,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Glacial Epoch (빙하 시대)
```
32x32 pixel art, top-down view, ice age monolith fortress with absolute zero aura freezing everything in range,
royal blue (#2196F3) glacial epoch crystal, white permafrost wave expanding with frozen time distortion,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Apex Toxin (독점 지배자)
```
32x32 pixel art, top-down view, supreme toxin throne with five stacking poison cascades and armor-dissolving acid,
neon green (#76FF03) apex venom crown, dark green corrosive waterfalls melting the stone foundation,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Radiant Ruin (성광 붕괴)
```
32x32 pixel art, top-down view, collapsing holy citadel emitting devastating sacred beam through shattered walls,
bright amber (#FFD740) crumbling holy ruins, white-gold destruction beam piercing through broken divine pillars,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

#### T3+T2 조합 (3종)

##### Storm Dominion (폭풍 지배신)
```
32x32 pixel art, top-down view, supreme storm dominion citadel with sixteen chain lightning arcs and thunder crown,
imperial gold (#FBC02D) storm emperor throne, white-blue massive chain web with golden thunder crown above,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Maelstrom Herald (회오리 전령)
```
32x32 pixel art, top-down view, dimensional maelstrom herald tower with reality-warping cyclone pulling fourteen targets,
deep teal (#00BFA5) cosmic vortex lens, white spiral maelstrom with debris and energy trails,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Solar Cremation (태양 소각로)
```
32x32 pixel art, top-down view, solar cremation furnace with triple focusing lens array and white-hot incineration beam,
deep orange (#FF6D00) solar furnace core, blinding white-orange cremation field with heat distortion,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

#### T3+T3 조합 (3종)

##### World Breaker (세계 파괴자)
```
32x32 pixel art, top-down view, world-ending siege colossus with continent-cracking hammer and shattered reality,
obsidian brown (#4E342E) titanic war engine, gray cracked earth with orange magma lines from massive impact,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Genesis Verdict (창세 심판)
```
32x32 pixel art, top-down view, genesis tribunal spire emitting divine judgment beam with creation-fire and holy light,
sacred gold (#FFAB00) genesis crystal apex, white-gold beam splitting into rainbow-fire judgment rays,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Pandemic Sovereign (역병 군주)
```
32x32 pixel art, top-down view, pandemic sovereign throne with six-layer stacking plague and armor-annihilating miasma,
dark olive (#558B2F) plague emperor crown, layered green-black death clouds with orange fire wisps underneath,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

### T5 전설 타워 프롬프트 (5종)

##### Omega Herald (오메가 전령)
```
32x32 pixel art, top-down view, omega-class cosmic herald fortress with twenty branching dimensional chain arcs,
brilliant violet (#D500F9) omega crystal nexus, white-purple cosmic chains arcing through dimensional rifts,
golden rune halo crown, red fire and green venom trails spiraling around central omega sigil,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Extinction Engine (소멸 기관)
```
32x32 pixel art, top-down view, extinction-class bio-weapon engine with eight-layer cascading plague and molten core,
dark emerald (#1B5E20) extinction reactor core, bright green eight-ring poison cascade with orange fire veins,
corroded black iron shell cracking with neon green toxic light from within,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Absolute Dominion (절대 지배)
```
32x32 pixel art, top-down view, absolute dominion citadel with eighteen reality-binding chains and frozen storm field,
deep royal blue (#304FFE) absolute authority crystal, white-blue chain web binding space with frost cyclone,
golden imperial crown above crystalline throne radiating overwhelming power,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Star Forge (항성 용광로)
```
32x32 pixel art, top-down view, stellar forge reactor with miniature sun core and solar flare eruption ring,
intense vermillion (#FF3D00) stellar plasma core, white-hot solar corona with expanding flare waves,
golden containment ring struggling to hold the blinding star-fire within,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

##### Void Maelstrom (공허 소용돌이)
```
32x32 pixel art, top-down view, void maelstrom singularity with reality-consuming vortex and piercing annihilation beam,
deep cosmic purple (#6200EA) singularity core, dark void spiral consuming light with violet-white destruction beam,
green venom trails and orange embers spiraling into the all-consuming void center,
dark fantasy cartoon style, clean pixel art, limited palette (4-6 colors), black outline,
transparent background, game asset, no text, centered
```

---

## 배경 디자인 가이드

### 기본 방향

- **적용 단위**: 월드별 1장, 총 5장 (Forest / Desert / Tundra / Volcano / Shadow)
- **적용 영역**: 맵 영역 + 상단 HUD = 360×520px
- **하단 타워 패널(120px)**: 배경 미적용 (기존 UI 패널 유지)
- **오버레이**: 배경 위에 경로(CELL_PATH) 타일만 반투명으로 표시, 빈 타일은 배경 그대로 노출

### 파일 규격

| 항목 | 값 |
|---|---|
| 포맷 | PNG (불투명) |
| AI 생성 원본 | 1080×1560px (9:13 비율, 3x 업스케일) |
| 저장 크기 | 360×520px (HighQualityBicubic 다운샘플) |
| 게임 표시 크기 | 360×520px (1:1, 리사이즈 없음) |
| 네이밍 | `bg_{worldId}.png` (예: `bg_forest.png`) |
| 경로 | `fantasydefence/public/assets/bg/` |

### 렌더링 규칙

- **레이어 순서** (depth):
  - 배경 Sprite: depth `-1` (최하단)
  - 경로 오버레이: depth `0`
  - 타워/적/이펙트: depth `1~20` (기존 유지)
- **배경 위치**: `(0, 0)` 앵커 top-left, 맵 영역 + HUD를 정확히 덮음
- **경로 오버레이**: CELL_PATH 셀만 `fillRect()` + 월드 테마 `path` 색상, **alpha 0.35**
- **빈 타일(CELL_EMPTY)**: 렌더링 안 함 → 배경 이미지 그대로 노출
- **벽(CELL_WALL)**: `fillRect()` + 검정(0x000000), **alpha 0.4** → 배경 위에 자연스럽게 어둡게
- **기지(CELL_BASE)**: 기존 금색 테두리 유지, 배경 위에 오버레이
- **스폰(CELL_SPAWN)**: 기존 빨간 테두리 유지, 배경 위에 오버레이
- **프리로드**: `BootScene.preload()`에서 `bg_{worldId}` 키로 5장 로드

### 디자인 규칙

- **시점**: 탑다운 (타워 에셋과 동일, 위에서 내려다보는 지형)
- **밝기**: 전반적으로 **어두운 톤** — 타워/적/UI가 배경 위에서 명확히 구분되어야 함
- **디테일 밀도**: 중~저 — 40×40px 셀 위에 타워가 올라가므로 배경이 과도하게 복잡하면 가독성 저하
- **색상**: 각 월드 테마의 `bg`/`emptyTile` HEX 범위를 기본 톤으로 사용
- **연결성**: 어떤 맵 레이아웃(경로 형태)에도 자연스럽게 어울리는 범용 지형 패턴
- **금지**: 경로 표시, 건물/캐릭터, 텍스트, UI 요소 일체 포함 금지

### 월드별 배경 컨셉

#### 1. Forest (숲)

- **지형**: 어두운 마법의 숲 바닥 — 이끼 낀 땅, 고목 뿌리, 낙엽, 버섯
- **분위기**: 울창한 수관(canopy) 아래의 어두운 숲 속, 희미한 녹색 빛 필터링
- **색상 팔레트**: 짙은 초록(#0D1A0D), 이끼 녹색(#1A2E1A), 갈색 흙, 약간의 금빛 반딧불

#### 2. Desert (사막)

- **지형**: 황폐한 사막 — 갈라진 마른 땅, 모래 언덕 흔적, 흩어진 고대 유적 파편
- **분위기**: 해질녘/밤의 건조한 사막, 모래 먼지가 가라앉은 정적
- **색상 팔레트**: 짙은 황토(#1A150D), 모래색(#2E2A1A), 바래진 돌, 약간의 주황빛

#### 3. Tundra (설원)

- **지형**: 얼어붙은 동토 — 얼음 갈라진 틈, 눈 쌓인 지면, 서리 결정, 얼음 호수 경계
- **분위기**: 극지의 냉엄한 고요, 희미한 오로라 반사
- **색상 팔레트**: 짙은 남청(#0D151A), 얼음 회색(#1A2A2E), 서리 백색, 약간의 청록 하이라이트

#### 4. Volcano (화산)

- **지형**: 화산 지대 — 흑요석 바위, 용암 갈라진 틈, 재(ash) 덮인 지면, 굳은 마그마
- **분위기**: 붉은 지열 빛이 새어나오는 위험한 화산 지대
- **색상 팔레트**: 짙은 적갈(#1A0D0D), 흑요석 검정(#2E1A1A), 용암 주홍, 약간의 노란 불빛

#### 5. Shadow (그림자)

- **지형**: 어둠의 세계 — 부패한 대지, 보라빛 안개, 공허의 균열, 그림자 촉수 흔적
- **분위기**: 초자연적 어둠, 차원이 불안정한 왜곡된 세계
- **색상 팔레트**: 심연 보라(#120D1A), 그림자 남보라(#221A2E), 약간의 보라빛 발광, 검은 안개

### 배경 프롬프트

#### 기본 프롬프트 구조

```
pixel art, top-down view, [월드 지형 묘사],
[색상 팔레트 지정],
dark fantasy style, game background, muted dark tones, low detail density,
no characters, no buildings, no path markings, no UI, no text,
portrait orientation 9:13
```

#### Forest (숲)
```
pixel art, top-down view, dark enchanted forest floor seen from above,
mossy ground with ancient tree roots spreading across the terrain,
scattered fallen leaves and small glowing mushrooms,
faint green light filtering through dense canopy above,
dark green (#0D1A0D) base tone, moss green (#1A2E1A) mid-tone, brown earth patches,
tiny golden firefly dots as subtle accents,
dark fantasy style, game background, muted dark tones, low detail density,
no characters, no buildings, no path markings, no UI, no text,
portrait orientation 9:13
```

#### Desert (사막)
```
pixel art, top-down view, desolate cracked desert ground seen from above,
dry cracked earth with sand dune ripple patterns,
scattered ancient stone ruins fragments and weathered bones,
faint dust haze settling over the barren terrain,
dark ochre (#1A150D) base tone, sand brown (#2E2A1A) mid-tone, faded stone gray,
subtle orange glow from distant horizon,
dark fantasy style, game background, muted dark tones, low detail density,
no characters, no buildings, no path markings, no UI, no text,
portrait orientation 9:13
```

#### Tundra (설원)
```
pixel art, top-down view, frozen tundra permafrost ground seen from above,
cracked ice sheets with snow-covered terrain patches,
frost crystal formations and frozen puddle edges,
faint aurora borealis reflection on the icy surface,
dark navy (#0D151A) base tone, ice gray (#1A2A2E) mid-tone, frost white highlights,
subtle cyan-teal shimmer from aurora,
dark fantasy style, game background, muted dark tones, low detail density,
no characters, no buildings, no path markings, no UI, no text,
portrait orientation 9:13
```

#### Volcano (화산)
```
pixel art, top-down view, volcanic obsidian rock field seen from above,
hardened lava flows with glowing cracks between dark basalt stones,
ash-covered ground with scattered embers and cooled magma pools,
faint red geothermal glow seeping through fissures,
dark crimson (#1A0D0D) base tone, obsidian black (#2E1A1A) mid-tone, lava orange veins,
subtle yellow fire-light from deep cracks,
dark fantasy style, game background, muted dark tones, low detail density,
no characters, no buildings, no path markings, no UI, no text,
portrait orientation 9:13
```

#### Shadow (그림자)
```
pixel art, top-down view, corrupted shadow realm ground seen from above,
decaying dark earth with purple void cracks and shadow tendrils,
warped terrain with ethereal mist pools and reality distortion patterns,
faint violet bioluminescent glow from corruption veins,
deep abyss purple (#120D1A) base tone, shadow indigo (#221A2E) mid-tone, void black patches,
subtle purple luminescence from dimensional rifts,
dark fantasy style, game background, muted dark tones, low detail density,
no characters, no buildings, no path markings, no UI, no text,
portrait orientation 9:13
```

---

## 기술 사양

### 타워 파일 규격

- **포맷**: PNG (투명 배경)
- **소스 크기**: 500x500px (AI 생성 원본)
- **저장 크기**: 128x128px (HighQualityBicubic 리사이즈)
- **네이밍**: `{Type}.png` (PascalCase, 예: `Archer.png`, `Dragon.png`)
- **경로**: `fantasydefence/public/assets/tower/` (Vite 빌드 시 `dist/assets/tower/`로 자동 복사)

### 배경 파일 규격

- **포맷**: PNG (불투명)
- **소스 크기**: 1080×1560px (9:13 비율)
- **저장 크기**: 360×520px (HighQualityBicubic 리사이즈)
- **네이밍**: `bg_{worldId}.png` (예: `bg_forest.png`)
- **경로**: `fantasydefence/public/assets/bg/` (Vite 빌드 시 `dist/assets/bg/`로 자동 복사)

### 타워 렌더링 규칙

- **T1 기본 타워**: `Sprite` 기반 이미지 렌더링 (64x64 displaySize, depth 10)
- **T2~T5 합성 타워**: `Sprite` 기반 이미지 렌더링 (T1과 동일 규격)
- **합성 시**: 재료 T1 스프라이트를 `destroy()` 후 합성 결과 스프라이트 생성
- **UI 아이콘** (TowerPanel, CollectionScene 등): Graphics 도형 유지 (소형 아이콘에 적합)
- **프리로드**: `BootScene.preload()`에서 `tower_{type}` 키로 10종 로드

### 배경 렌더링 규칙

- **배경 Sprite**: depth `-1`, 앵커 top-left `(0, 0)`, 360×520px 영역
- **경로 오버레이**: CELL_PATH만 `fillRect()` + 테마 `path` 색상, alpha `0.35`
- **빈 타일(CELL_EMPTY)**: 렌더링 안 함 → 배경 노출
- **벽(CELL_WALL)**: `fillRect()` + 0x000000, alpha `0.4`
- **기지/스폰**: 기존 테두리 인디케이터 유지 (배경 위 오버레이)
- **프리로드**: `BootScene.preload()`에서 `bg_{worldId}` 키로 5장 로드

### 향후 확장 (애니메이션)

- 스프라이트시트: 가로 나열 (128x128 x N프레임)
- idle: 2~4프레임, 300~500ms 간격
- attack: 3~5프레임, 100~200ms 간격
- 네이밍: `{Type}_idle.png`, `{Type}_attack.png`
