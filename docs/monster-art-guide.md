# 몬스터 아트 가이드

8종 적 × 5바이옴 = 40종 몬스터 스프라이트 AI 생성 프롬프트.

## 몬스터 컨셉 매핑

| 유형 | 능력 | 컨셉 | 선정 이유 | spriteBase |
|------|------|------|-----------|------------|
| normal | 기본 적 | 고블린 (Goblin) | 판타지 잡몹의 정석 | `goblin` |
| fast | 이동속도 2배 | 늑대 (Warg) | 네발 달리기 = 속도 | `warg` |
| tank | HP 4배, 느림 | 오우거 (Ogre) | 거대하고 둔한 육중함 | `ogre` |
| swarm | 대량 소환, 약함 | 미니 슬라임 (Mini Slime) | splitter와 시각적 연결 | `mini_slime` |
| splitter | 사망 시 3분열 | 슬라임 (Slime) | 분열 = 슬라임의 상징 | `slime` |
| armored | 피해 50% 감소 | 흑기사 (Dark Knight) | 갑옷 = 기사 | `dark_knight` |
| boss | 고HP, 넉백면역 | 마왕 (Demon Lord) | 보스급 위압감 | `demon_lord` |
| boss_armored | 고HP+장갑+넉백면역 | 골렘 (Golem) | 최강 방어 = 돌/금속 구조물 | `golem` |

## 실루엣 다양성

- **고블린**: 작은 인간형 (머리가 큰 비율)
- **늑대**: 수평 네발짐승
- **오우거**: 크고 둔한 인간형
- **슬라임/미니슬라임**: 둥근 젤리 방울
- **흑기사**: 중간 인간형 + 투구/방패
- **마왕**: 크고 위엄 있는 인간형 (뿔/날개)
- **골렘**: 거대 비인간형 블록체

## 파일명 규칙

`public/assets/enemy/{worldId}_{spriteBase}.png`

예: `forest_goblin.png`, `desert_warg.png`, `shadow_golem.png`

## 공통 프롬프트 프리픽스

> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose

## 작성 규칙

1. **방향**: 정면 뷰, 걷거나 움직이는 포즈
2. **크기 비율**: normal < fast ≈ swarm < splitter < armored < tank < boss ≈ boss_armored
3. **배경**: 투명 필수
4. **바이옴 표현**: 색상 팔레트 + 장식/소재 변경 (형태는 유지)
5. **보스 구분**: 보스 유형은 더 정교하고 디테일이 많게

---

## Forest (숲) — 8종

### forest_goblin.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, small forest goblin, green skin, pointed ears, wearing leaf and bark armor, holding a crude wooden club, mischievous expression, mossy details, earthy green-brown palette

### forest_warg.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, grey wolf running forward, lean muscular body, bared fangs, forest wolf with mossy fur patches, piercing yellow eyes, grey and dark green palette

### forest_ogre.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, massive forest ogre, green-brown skin covered in moss and vines, carrying a tree trunk as weapon, hulking intimidating build, small eyes, large jaw, earthy green palette

### forest_mini_slime.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, tiny green slime blob, translucent jelly body, simple cute face with two dot eyes, bouncing pose, vibrant forest green color, very small size

### forest_slime.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, medium green slime, translucent jelly body with visible core, slightly menacing face, leaves and twigs floating inside, forest green color, visible split line down the middle suggesting division

### forest_dark_knight.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, dark knight in green-tinted forest armor, vine-wrapped plate mail, closed helmet with green glowing visor, carrying shield and sword, medium humanoid build, dark green and black palette

### forest_demon_lord.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, forest demon lord with wooden horns resembling tree branches, green-brown skin, imposing tall figure, dark leaf cloak, glowing green eyes, aura of nature corruption, intricate details, boss-tier quality

### forest_golem.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, massive treant-like wood golem, body made of interlocking logs and roots, glowing green rune core in chest, moss and mushrooms growing on shoulders, very bulky blocky silhouette, boss-tier intricate details

---

## Desert (사막) — 8종

### desert_goblin.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, small desert goblin, tan-brown skin, wearing a dirty turban and tattered desert robes, holding a curved dagger, squinting eyes from sandstorm, sandy yellow-brown palette

### desert_warg.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, desert jackal running forward, lean sandy-colored fur, large pointed ears, bared teeth, adapted to arid environment, sand and golden-brown palette

### desert_ogre.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, massive desert giant, sun-baked brown skin, wrapped in tattered cloth and rope, carrying a sandstone pillar as weapon, intimidating hulking build, dusty brown-orange palette

### desert_mini_slime.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, tiny sand slime blob, opaque sandy-yellow body with grain texture, two dot eyes, bouncing pose, warm sand color, very small size

### desert_slime.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, medium sand slime, opaque tan-yellow body with sand particles inside, slightly menacing face, small bones and desert debris floating inside, visible split line, warm sandy palette

### desert_dark_knight.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, desert knight in sandstone-colored plate armor, cloth draped over shoulders against sun, closed helmet with orange glowing visor, carrying scimitar and round shield, medium humanoid build, sand and bronze palette

### desert_demon_lord.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, desert djinn demon lord, floating slightly, golden-brown skin, ornate turban with jewel, flowing sandy robes, four arms, glowing amber eyes, sand swirling around feet, imposing tall figure, boss-tier quality with intricate details

### desert_golem.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, massive sandstone golem, body made of carved desert rock blocks, ancient hieroglyph runes glowing orange on chest, sand pouring from joints, very bulky blocky silhouette, boss-tier intricate details

---

## Tundra (툰드라) — 8종

### tundra_goblin.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, small tundra goblin, pale blue-white skin, wearing thick fur coat and fur hood, holding an icicle spear, shivering expression, frosty breath visible, icy blue-white palette

### tundra_warg.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, white ice wolf running forward, thick white fur, frost crystals on mane, glowing pale blue eyes, bared icy fangs, breath mist visible, white and ice-blue palette

### tundra_ogre.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, massive yeti, white shaggy fur covering entire body, blue-grey skin visible underneath, carrying a frozen boulder, intimidating hulking build with long arms, icy blue-white palette

### tundra_mini_slime.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, tiny ice slime blob, translucent crystalline blue body, two dot eyes, bouncing pose, frost particles around it, very small size, pale ice-blue color

### tundra_slime.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, medium ice slime, translucent crystalline blue body with frozen core visible, small ice shards floating inside, slightly menacing face, visible split line with frost crack pattern, pale blue palette

### tundra_dark_knight.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, frost knight in ice-crystal plate armor, icicles hanging from pauldrons, closed helmet with pale blue glowing visor, carrying frost-covered sword and ice shield, medium humanoid build, white and ice-blue palette

### tundra_demon_lord.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, ice demon king with crystalline ice horns and ice crown, pale blue skin, imposing tall figure, frost cloak with snowflake patterns, glowing white-blue eyes, blizzard aura swirling around, boss-tier quality with intricate details

### tundra_golem.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, massive ice golem, body made of stacked glacial ice blocks, glowing blue rune core in chest, icicle spikes on shoulders and arms, frost mist emanating from joints, very bulky blocky silhouette, boss-tier intricate details

---

## Volcano (화산) — 8종

### volcano_goblin.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, small volcanic goblin, ash-grey skin with glowing red cracks, wearing charred leather scraps, holding a smoldering stick, singed pointed ears, ember particles around it, dark grey and red-orange palette

### volcano_warg.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, hellhound running forward, black charred fur with glowing red-orange veins underneath, burning red eyes, embers trailing behind, fangs with fire dripping, dark black and fiery red palette

### volcano_ogre.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, massive lava troll, dark red rocky skin with glowing orange magma cracks, carrying a volcanic rock hammer, steam rising from body, intimidating hulking build, dark red-black and molten orange palette

### volcano_mini_slime.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, tiny fire slime blob, glowing orange-red molten body, two bright yellow dot eyes, bouncing pose, small flame wisps around it, very small size, red-orange lava color

### volcano_slime.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, medium lava slime, glowing red-orange molten body with dark cooled crust on top, volcanic rocks floating inside, slightly menacing face with bright eyes, visible split line with magma glow, red-orange and dark grey palette

### volcano_dark_knight.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, flame knight in molten dark-red plate armor with glowing orange lava seams, smoke rising from joints, closed helmet with fiery orange glowing visor, carrying flaming sword and obsidian shield, medium humanoid build, dark red-black and molten orange palette

### volcano_demon_lord.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, fire demon lord with large curved lava horns, red-black skin with molten cracks, imposing tall figure, volcanic ash and ember cloak, bat-like wings with fire membrane, glowing yellow-red eyes, flames swirling around feet, boss-tier quality with intricate details

### volcano_golem.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, massive lava golem, body made of cooled volcanic rock with glowing magma visible in cracks, bright orange rune core in chest, molten lava dripping from joints, smoke rising from shoulders, very bulky blocky silhouette, boss-tier intricate details

---

## Shadow (그림자) — 8종

### shadow_goblin.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, small shadow goblin, dark purple-black skin, glowing violet eyes, wisps of shadow trailing from body, wearing tattered dark cloth, holding a shadow dagger, ethereal semi-transparent edges, dark purple and black palette

### shadow_warg.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, shadow wolf running forward, dark purple-black smoky fur, body partially dissolving into purple mist, glowing violet eyes, ethereal fangs, shadow trails behind, dark purple and black palette

### shadow_ogre.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, massive shadow giant, dark purple-black skin with void cracks showing deeper darkness, carrying a club made of condensed shadow, glowing violet runes on body, intimidating hulking build, dark purple-black palette

### shadow_mini_slime.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, tiny shadow slime blob, dark purple-black translucent body with swirling void inside, two glowing violet dot eyes, bouncing pose, shadow wisps around it, very small size, dark purple color

### shadow_slime.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, medium shadow slime, dark purple-black body with swirling void core visible, shadow particles floating inside, glowing violet menacing face, visible split line with purple energy glow, dark purple and black palette

### shadow_dark_knight.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, death knight in pure black plate armor with purple void runes, shadow wisps emanating from armor gaps, closed helmet with deep violet glowing visor, carrying shadow-wreathed sword and void shield, medium humanoid build, black and deep violet palette

### shadow_demon_lord.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, pure darkness demon lord with ethereal void horns, pitch-black body with purple energy veins, imposing tall figure, tattered shadow cloak dissolving into void, spectral wings of pure darkness, glowing deep violet eyes, dark energy vortex swirling around, boss-tier quality with intricate details

### shadow_golem.png
> Pixel art, fantasy tower defense game enemy sprite, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, very minimal top-down tilt, transparent background, compact silhouette, clean pixel edges, 16-32px detail level, walking/moving pose, massive obsidian golem, body made of polished black obsidian blocks with purple void energy in cracks, deep violet rune core in chest, shadow tendrils extending from joints, dark void particles floating around, very bulky blocky silhouette, boss-tier intricate details

---

## 전체 파일 목록 (40종)

| # | 파일명 | 유형 | 바이옴 |
|---|--------|------|--------|
| 1 | `forest_goblin.png` | normal | Forest |
| 2 | `forest_warg.png` | fast | Forest |
| 3 | `forest_ogre.png` | tank | Forest |
| 4 | `forest_mini_slime.png` | swarm | Forest |
| 5 | `forest_slime.png` | splitter | Forest |
| 6 | `forest_dark_knight.png` | armored | Forest |
| 7 | `forest_demon_lord.png` | boss | Forest |
| 8 | `forest_golem.png` | boss_armored | Forest |
| 9 | `desert_goblin.png` | normal | Desert |
| 10 | `desert_warg.png` | fast | Desert |
| 11 | `desert_ogre.png` | tank | Desert |
| 12 | `desert_mini_slime.png` | swarm | Desert |
| 13 | `desert_slime.png` | splitter | Desert |
| 14 | `desert_dark_knight.png` | armored | Desert |
| 15 | `desert_demon_lord.png` | boss | Desert |
| 16 | `desert_golem.png` | boss_armored | Desert |
| 17 | `tundra_goblin.png` | normal | Tundra |
| 18 | `tundra_warg.png` | fast | Tundra |
| 19 | `tundra_ogre.png` | tank | Tundra |
| 20 | `tundra_mini_slime.png` | swarm | Tundra |
| 21 | `tundra_slime.png` | splitter | Tundra |
| 22 | `tundra_dark_knight.png` | armored | Tundra |
| 23 | `tundra_demon_lord.png` | boss | Tundra |
| 24 | `tundra_golem.png` | boss_armored | Tundra |
| 25 | `volcano_goblin.png` | normal | Volcano |
| 26 | `volcano_warg.png` | fast | Volcano |
| 27 | `volcano_ogre.png` | tank | Volcano |
| 28 | `volcano_mini_slime.png` | swarm | Volcano |
| 29 | `volcano_slime.png` | splitter | Volcano |
| 30 | `volcano_dark_knight.png` | armored | Volcano |
| 31 | `volcano_demon_lord.png` | boss | Volcano |
| 32 | `volcano_golem.png` | boss_armored | Volcano |
| 33 | `shadow_goblin.png` | normal | Shadow |
| 34 | `shadow_warg.png` | fast | Shadow |
| 35 | `shadow_ogre.png` | tank | Shadow |
| 36 | `shadow_mini_slime.png` | swarm | Shadow |
| 37 | `shadow_slime.png` | splitter | Shadow |
| 38 | `shadow_dark_knight.png` | armored | Shadow |
| 39 | `shadow_demon_lord.png` | boss | Shadow |
| 40 | `shadow_golem.png` | boss_armored | Shadow |
