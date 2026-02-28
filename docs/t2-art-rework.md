# T2 타워 이미지 재작업 목록

T1 타워와의 시각적 일관성 비교 결과, 아래 12개 T2 이미지가 재작업 대상.

## T1 기준 스타일

- 건축물/오브젝트 중심 (탑, 가마솥, 결정체 등)
- 정면 뷰 (살짝 위에서 내려다보는 각도, 아이소메트릭 대각선 아님)
- 투명 배경
- 이펙트가 본체 주변에 밀착
- 컴팩트한 실루엣 (~80-100px)

## 재작업 대상 (12개)

| # | 이름 | 파일명 | 주요 문제 |
|---|------|--------|----------|
| 1 | Holy Arrow (성스러운 화살) | `Holy Arrow.png` | 정면 시점 인물형 궁수. 아이소메트릭 뷰 불일치, 건축물 아닌 캐릭터 |
| 2 | Overload Mage (과부하 마법사) | `Overload Mage.png` | 크기/밀도 과잉. T2치고 T4~T5급 위엄. 스케일 축소 필요 |
| 3 | Frost Mage (서리 마법사) | `Frost Mage.png` | 로브 입은 인물형. 정면 시점. T1 Ice/Mage는 오브젝트 |
| 4 | Storm Mage (폭풍 마법사) | `Storm Mage.png` | 황금 로브 마법사 인물. 건축물 느낌 없음 |
| 5 | Toxic Mage (독 마법사) | `Toxic Mage.png` | 녹색 연기 두른 로브 인물. 오브젝트 느낌 없음 |
| 6 | Gravity Mage (중력 마법사) | `Gravity Mage.png` | 보라 로브 마법사+궤도 링. 캐릭터형 |
| 7 | Radiant Mage (성광 마법사) | `Radiant Mage.png` | 보라 로브+황금 광륜 인물. 캐릭터형 |
| 8 | Vacuum Mage (진공 마법사) | `Vacuum Mage.png` | 파란 로브+블랙홀 인물. 캐릭터형 |
| 9 | Pyromancer (화염술사) | `Pyromancer.png` | 검정 배경(투명 아님) + 로브 인물형. 이중 부적합 |
| 10 | Solar Burst (태양 작렬) | `Solar Burst.png` | 기반 구조물 없이 보석만 떠 있음. T1 Light 등대형과 불일치 |
| 11 | Ancient Dragon (고대 드래곤) | `Ancient Dragon.png` | 제단/생물형. T1 Dragon 대비 너무 유기적이고 크기 과함 |

## 재작업 가이드라인

1. **건축물/오브젝트 기반** — 로브 입은 캐릭터 금지
2. **아이소메트릭 3/4 뷰** 유지
3. **투명 배경** 필수
4. T1 원본 형태를 확장하는 방향 (Ice→얼음 건축물, Mage→마법 탑, Light→등대 확장)
5. 이펙트는 본체 주변에 밀착 — 거대 원형 링/궤도는 T4~T5용
6. T2 스케일은 T1보다 약간 크거나 비슷하게 유지

## 공통 프롬프트 프리픽스

> Pixel art, fantasy tower defense game asset, perfectly front-facing straight-on camera angle like a 2D sprite, the building's entrance/face points directly at the viewer, vertically symmetrical composition, very minimal top-down tilt, the base of the building sits flat at the bottom — do NOT use isometric projection, do NOT rotate the building diagonally, do NOT show the floor/ground as an ellipse or diamond shape, single building/structure centered on white/transparent background, compact silhouette, no characters or humanoid figures, clean pixel edges, 16-32px detail level

## 개별 아트 프롬프트

### 1. Holy Arrow (성스러운 화살) — archer + light

> Pixel art, fantasy tower defense, front-facing view with slight top-down angle, NOT isometric, NOT diagonal, transparent background. A wooden archer watchtower upgraded with holy light magic. The base is a sturdy dark-wood archer tower (similar to T1 Archer) with reinforced stone foundation. A golden crystal lens is mounted at the top, focusing a soft holy glow. Two ornate crossbows with golden-tipped bolts protrude from the sides. Small radiant runes carved into the wood emit faint golden light. Compact silhouette, no characters.

참고 T1: Archer(나무 망루) + Light(금색 등대)

### 2. Overload Mage (과부하 마법사) — mage + mage

> Pixel art, fantasy tower defense, front-facing view with slight top-down angle, NOT isometric, NOT diagonal, transparent background. A dark stone mage tower crackling with overloaded arcane energy. Similar structure to T1 Mage tower but slightly taller with dual purple crystal orbs — one on top, one embedded in the front. Purple sparks and small lightning arcs between the two orbs. Stone bricks show glowing purple cracks from energy overload. Compact size, NOT massive — only slightly larger than T1 Mage. No characters.

참고 T1: Mage(보라 수정구 석탑) × 2. 현재 이미지는 스케일만 줄이면 될 수도 있음.

### 3. Frost Mage (서리 마법사) — ice + mage

> Pixel art, fantasy tower defense, front-facing view with slight top-down angle, NOT isometric, NOT diagonal, transparent background. A stone mage tower encased in frost. The base structure resembles T1 Mage tower but with blue-gray stone. Ice crystals grow from the top and sides, merging the T1 Ice crystal shape with the tower form. A blue glowing orb sits at the peak, surrounded by small icicles. Light frost mist clings close to the base. Stone foundation with frozen puddles around it. Compact, no characters.

참고 T1: Mage(석탑) + Ice(얼음 결정체). 둘의 형태를 합친 "얼어붙은 마법탑".

### 4. Storm Mage (폭풍 마법사) — lightning + mage

> Pixel art, fantasy tower defense, front-facing view with slight top-down angle, NOT isometric, NOT diagonal, transparent background. A dark stone mage tower infused with storm lightning. The structure is a short mage tower with a metal lightning rod on top. A crackling electric orb floats just above the rod, with small yellow-white lightning bolts arcing to metal contacts on the tower walls. Dark storm clouds gather tightly around the top of the tower only. Stone and metal construction. Compact, no characters.

참고 T1: Mage(석탑) + Lightning(번개 탑). 피뢰침 달린 마법탑.

### 5. Toxic Mage (독 마법사) — poison + mage

> Pixel art, fantasy tower defense, front-facing view with slight top-down angle, NOT isometric, NOT diagonal, transparent background. A corrupted stone mage tower leaking toxic fumes. The base is a dark stone tower similar to T1 Mage, but the bricks are stained greenish-black. A cracked purple crystal orb on top oozes green toxic liquid that drips down the sides. Small glass vials and tubes are attached to the tower walls, bubbling with green poison. Thin green vapor rises from the top. Stone rubble base with small toxic puddles. Compact, no characters.

참고 T1: Mage(석탑) + Poison(독 가마솥). 독에 오염된 마법탑.

### 6. Gravity Mage (중력 마법사) — rock + mage

> Pixel art, fantasy tower defense, front-facing view with slight top-down angle, NOT isometric, NOT diagonal, transparent background. A heavy stone mage tower with gravity magic. A squat, reinforced stone tower combining T1 Rock fortress and T1 Mage tower aesthetics. A dark purple crystal orb on top pulls small rock fragments that float closely around it. The stone base is cracked from gravitational pressure, with pebbles slightly lifting off the ground near the foundation. Muted purple glow from the orb. Compact and grounded, no characters.

참고 T1: Mage(석탑) + Rock(석조 요새). 중력으로 돌이 떠오르는 마법 요새.

### 7. Radiant Mage (성광 마법사) — light + mage

> Pixel art, fantasy tower defense, front-facing view with slight top-down angle, NOT isometric, NOT diagonal, transparent background. A golden-white stone mage tower radiating holy light. The structure merges T1 Light lighthouse shape with T1 Mage tower — a stone tower topped with a brilliant golden crystal orb that emits soft sunrays. Ornate golden trim on the stonework. A warm golden glow surrounds the upper portion. Light-colored stone (cream/gold) contrasts with the darker T1 Mage. Small lens-like windows focus light outward. Compact, no characters.

참고 T1: Mage(석탑) + Light(금색 등대). 황금빛 마법 등대탑.

### 8. Vacuum Mage (진공 마법사) — wind + mage

> Pixel art, fantasy tower defense, front-facing view with slight top-down angle, NOT isometric, NOT diagonal, transparent background. A stone mage tower with vacuum wind magic. A dark blue-gray stone tower with the T1 Mage structure. At the top, a swirling dark-blue vortex crystal pulls air inward. The tower has wind-carved smooth stone edges. Small debris particles are drawn toward the vortex near the top. Teal-blue wind streaks wrap tightly around the upper tower. Stone base with swept-clean ground around it. Compact, no characters.

참고 T1: Mage(석탑) + Wind(풍차탑). 바람을 빨아들이는 마법탑.

### 9. Pyromancer (화염술사) — flame + mage

> Pixel art, fantasy tower defense, front-facing view with slight top-down angle, NOT isometric, NOT diagonal, transparent background. A stone mage tower engulfed in controlled flame. The base structure is T1 Mage tower with darker, heat-scorched stone bricks. The crystal orb on top is replaced by a blazing fire crystal with orange-red glow. Two small braziers mounted on the tower sides burn steadily. Lava-like cracks glow between some stones. Heat shimmer and small embers rise from the top. Dark stone foundation with ash and embers on the ground. Compact, no characters.

참고 T1: Mage(석탑) + Flame(화로). 불타는 마법탑. **반드시 투명 배경**.

### 10. Solar Burst (태양 작렬) — light + light

> Pixel art, fantasy tower defense, front-facing view with slight top-down angle, NOT isometric, NOT diagonal, transparent background. An upgraded golden lighthouse tower radiating intense sunlight. A taller version of T1 Light tower — ornate golden-bronze tower structure with a massive sun crystal at the top, emitting bright golden rays in multiple directions. The tower has layered circular stone platforms as its base, with golden metallic supports. Lens-like protrusions on the sides focus and redirect light. Must have a clear tower/pillar structure as the base — not a floating gem. Warm golden color palette. Compact, no characters.

참고 T1: Light(금색 등대) × 2. 더 크고 강렬한 등대. **반드시 탑/기둥 구조물 위에 태양 수정**.

### 11. Ancient Dragon (고대 드래곤) — dragon + dragon

> Pixel art, fantasy tower defense, front-facing view with slight top-down angle, NOT isometric, NOT diagonal, transparent background. A massive dragon-head stone fortress, evolved from T1 Dragon tower. A larger, more imposing version of the T1 Dragon face-shaped building — dark red and black stone construction with a bigger dragon skull facade, larger horns, and sharper fangs. Two flame braziers burn on either side of the dragon mouth entrance. The eyes glow with intense orange-red fire. Cracked volcanic stone base with small lava veins. Ancient worn stone texture. The structure is clearly a BUILDING shaped like a dragon head, not a living creature. Compact, no characters.

참고 T1: Dragon(드래곤 얼굴 건축물) × 2. 더 크고 오래된 드래곤 두상 요새. **생물이 아닌 건축물**.

---

## 이종합성: 얼음 조합 (6종)

ice + (lightning / flame / rock / poison / wind / light)

### 12. Thunder Frost (전격 빙결) — ice + lightning

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A frozen lightning tower. The base is a dark metallic tesla-coil tower (like T1 Lightning) but encased in cracked blue ice from the bottom half up. The metal sphere on top crackles with electric arcs that freeze into jagged ice-lightning bolts mid-air. Cyan-blue frost particles mix with yellow electric sparks around the upper portion. The foundation shows frozen stone with small ice shards. Cool blue-and-yellow color palette. Compact, no characters.

참고 T1: Ice(얼음 결정) + Lightning(번개 탑). 얼어붙은 테슬라 코일. chain 공격 + 슬로우.

### 13. Cryo Flame (냉열 교차) — flame + ice

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A stone brazier split between fire and ice. The structure is a wide stone bowl like T1 Flame's fire pit, but divided down the middle — the left half burns with orange-red flames, the right half overflows with blue ice crystals and frost mist. Where fire and ice meet at the center, steam and white vapor rises. The stone base shows heat cracks on one side and frost patterns on the other. Warm-and-cool dual color palette. Compact, no characters.

참고 T1: Flame(화로) + Ice(얼음 결정). 반은 불, 반은 얼음인 가마. dot 공격 + 슬로우.

### 14. Glacier (빙산) — ice + rock

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A massive frozen stone fortress. The structure is a squat stone turret like T1 Rock but completely frozen over — thick glacial ice covers the gray stone walls, giant ice crystals jut upward from the top like jagged peaks. The stone dome is replaced by a cluster of opaque blue-white ice formations. Frozen rubble and frost at the base. Heavy, solid, immovable appearance. Blue-gray color palette. Compact, no characters.

참고 T1: Ice(얼음 결정) + Rock(석조 요새). 빙하에 뒤덮인 요새. splash + 강력 슬로우.

### 15. Frost Venom (동상 독) — ice + poison

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A frozen poison cauldron. The base is a dark iron cauldron like T1 Poison but the bubbling green liquid inside is partially frozen, with ice crystals growing from the surface of the toxic brew. Icicles hang from the cauldron rim. The green toxic vapor rising from the pot mixes with blue frost mist, creating a sickly cyan haze. Frozen green puddles on the ground around the base. Green-and-ice-blue color palette. Compact, no characters.

참고 T1: Ice(얼음 결정) + Poison(독 가마솥). 독이 얼어붙은 가마솥. AoE 슬로우 + 독.

### 16. Blizzard (빙풍) — ice + wind

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A frozen windmill tower caught in a blizzard. The structure is based on T1 Wind's windmill tower but the blades are frozen solid with thick ice, and the tower stone is coated in white frost. A swirl of snow and ice particles whips tightly around the upper portion of the tower. Small icicles hang from the frozen fan blades. The stone base is buried in snowdrift. White-and-ice-blue color palette. Compact, no characters.

참고 T1: Ice(얼음 결정) + Wind(풍차탑). 얼어붙은 풍차. AoE 슬로우 + 넉백.

### 17. Holy Ice (성빙) — ice + light

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A radiant ice crystal lighthouse. The structure merges T1 Light's golden lighthouse with T1 Ice's crystal — a tall crystalline ice pillar with a warm golden light glowing from within. The ice refracts the holy light into soft rainbow-tinted sparkles. A golden metal frame or crown sits at the top, housing the light source inside the translucent ice. The base is a small stone pedestal with frost. Gold-and-ice-blue color palette. Compact, no characters.

참고 T1: Ice(얼음 결정) + Light(금색 등대). 성스러운 빛이 깃든 얼음 등대. 관통빔 + 슬로우.

---

## 이종합성: 번개 조합 (5종)

lightning + (flame / rock / poison / wind / light)

### 18. Thunder Fire (벼락불) — flame + lightning

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A burning tesla-coil tower. The base is T1 Lightning's dark metallic tower structure but the metal sphere on top is replaced by a blazing fire orb crackling with electric arcs. Orange-red flames lick up the metal coil body, and yellow-white lightning bolts jump between the flames. The dark metal body shows heat-blackened sections with glowing orange cracks between rivets. Small embers and electric sparks mix and scatter around the top. Dark metal and fire-orange color palette. Compact, no characters.

참고 T1: Lightning(번개 탑) + Flame(화로). 불타는 테슬라 코일. chain 공격 + dot.

### 19. Thunder Strike (천둥 강타) — lightning + rock

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A fortified stone turret with a built-in lightning rod. The base is T1 Rock's squat stone fortress with a reinforced dome, but a tall metal lightning rod protrudes from the top. Metal conductor strips run down the stone walls connecting to ground plates. Small yellow-white electric arcs jump between the metal strips. The heavy gray stone shows electric scorch marks and blackened streaks. Stone rubble base with small sparks on the ground. Gray stone and yellow-electric color palette. Compact, no characters.

참고 T1: Lightning(번개 탑) + Rock(석조 요새). 피뢰침 달린 요새. splash + chain.

### 20. Toxic Shock (독전기) — lightning + poison

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. An electrified poison cauldron. The base is T1 Poison's dark iron cauldron but wrapped in metal coils and wiring from T1 Lightning. The bubbling green toxic liquid inside crackles with yellow electric sparks jumping across its surface. Toxic green vapor rising from the cauldron carries tiny forking lightning bolts. Copper coil attachments wrap around the iron body. Small electrified green puddles on the ground. Green-and-yellow electric color palette. Compact, no characters.

참고 T1: Lightning(번개 탑) + Poison(독 가마솥). 전기 흐르는 독 가마솥. chain + 독 dot.

### 21. Storm Bolt (폭풍 전격) — lightning + wind

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A windmill tower enhanced with lightning. The structure is T1 Wind's stone windmill tower but the wooden fan blades are replaced with dark metal conductor blades. A crackling lightning sphere from T1 Lightning sits at the center hub of the blades, with electric arcs jumping to each blade tip. Wind swirls carry electric sparks tightly around the tower top. Metal-reinforced stone base with small ground sparks. Teal-wind and yellow-electric dual color palette. Compact, no characters.

참고 T1: Lightning(번개 탑) + Wind(풍차탑). 번개 풍차. chain + 넉백.

### 22. Holy Thunder (신성 번개) — light + lightning

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A golden lightning tower radiating holy power. The structure merges T1 Light's golden lighthouse with T1 Lightning's tesla coil — an ornate golden metal tower with a radiant crystal sphere on top that emits both soft golden light rays and white-gold sacred lightning bolts. The golden metal body has intricate filigree patterns. Faint golden runes glow along the tower surface. A warm golden aura surrounds the upper portion. Gold-and-white-electric color palette. Compact, no characters.

참고 T1: Light(금색 등대) + Lightning(번개 탑). 신성한 황금 번개탑. 관통빔 + chain.

---

## 이종합성: 불꽃 조합 (4종)

flame + (rock / poison / wind / light)

### 23. Magma Shot (용암탄) — flame + rock

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A stone fortress with a volcanic core. The base is T1 Rock's squat stone turret but the gray stone bricks are cracked with glowing orange lava veins. A small volcanic vent on the dome top releases thin ash and embers. T1 Flame's fire pit is integrated into the fortress front, glowing orange-red through a stone archway. Small molten lava pools seep at the base. Dark stone and lava-orange color palette. Compact, no characters.

참고 T1: Flame(화로) + Rock(석조 요새). 용암이 흐르는 요새. splash + dot.

### 24. Venom Fire (맹독 화염) — flame + poison

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A burning poison cauldron. The base is T1 Poison's dark iron cauldron but orange-red flames burn fiercely underneath, heating the bubbling green liquid to a violent boil. Toxic green fire — a sickly mix of green poison vapor and orange flame — rises from the top. The iron body shows heat damage and greenish corrosion stains. Small flaming toxic puddles on the ground around the base. Green-and-orange color palette. Compact, no characters.

참고 T1: Flame(화로) + Poison(독 가마솥). 불타는 독 가마솥. dot + 독.

### 25. Fire Storm (화염 폭풍) — flame + wind

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A windmill tower engulfed in fire. The structure is T1 Wind's stone windmill tower but the fan blades trail orange-red flames as if spinning through fire. The stone body shows heat-scorched black marks with ember glow between bricks. A fire brazier from T1 Flame sits at the base of the windmill mechanism, feeding flames upward. Hot ember particles swirl tightly around the upper portion. Orange-red and warm charcoal-gray color palette. Compact, no characters.

참고 T1: Flame(화로) + Wind(풍차탑). 불타는 풍차. dot + 넉백.

### 26. Solar Flame (태양광 화염) — flame + light

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A golden fire brazier lighthouse. The structure merges T1 Light's golden lighthouse tower with T1 Flame's fire pit — an ornate golden metal tower with a sacred flame burning brilliantly at the top instead of a light crystal. The golden-white flame emits warm sunlight rays outward. Small ornate brazier mounts on the tower sides hold flickering golden fire. Warm golden stone base with faint ember glow. Gold-and-fire-orange color palette. Compact, no characters.

참고 T1: Flame(화로) + Light(금색 등대). 태양불 등대. 관통빔 + dot.

---

## 이종합성: 바위 조합 (3종)

rock + (poison / wind / light)

### 27. Toxic Boulder (독암) — poison + rock

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A poisoned stone fortress. The base is T1 Rock's squat stone turret but the gray stone is heavily corroded by toxic green liquid. A small iron cauldron from T1 Poison is embedded in the fortress dome top, dripping green ooze that runs down the stone walls in sickly streaks. Green toxic cracks spider through the gray stone bricks. Toxic puddles pool at the rubble base. Gray-stone and toxic-green color palette. Compact, no characters.

참고 T1: Rock(석조 요새) + Poison(독 가마솥). 독에 부식된 요새. splash + 독.

### 28. Stone Gale (바위 폭풍) — rock + wind

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A stone fortress with wind power. The base is T1 Rock's squat stone turret but with compact windmill blades mounted on the reinforced dome from T1 Wind. Wind channels are carved into the thick stone walls, creating focused air currents that blow outward. Small pebbles and dust particles swirl in the wind tightly around the upper portion. The heavy stone base is wind-polished smooth on the sides. Gray stone and teal-wind color palette. Compact, no characters.

참고 T1: Rock(석조 요새) + Wind(풍차탑). 바람 내뿜는 요새. splash + 넉백.

### 29. Holy Stone (성광 바위) — light + rock

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A holy-blessed stone fortress. The base is T1 Rock's squat stone turret but the gray stone glows with warm golden light from within. A golden crystal from T1 Light is mounted on the stone dome, radiating soft holy rays upward and outward. Ornate golden runes are carved into the stone walls, emitting faint golden glow. The gray stone has golden luminous veins running through the bricks. Stone rubble base with golden light reflections. Gold-and-gray stone color palette. Compact, no characters.

참고 T1: Rock(석조 요새) + Light(금색 등대). 성스러운 빛의 요새. splash + 관통빔.

---

## 이종합성: 독 조합 (2종)

poison + (wind / light)

### 30. Toxic Gale (독풍) — poison + wind

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A windmill tower spreading toxic fumes. The structure is T1 Wind's stone windmill tower but the fan blades are corroded green and trail toxic green vapor as they spin. A small iron poison cauldron from T1 Poison is mounted at the base of the windmill mechanism, feeding green fumes upward. Toxic green mist swirls tightly around the tower carried by wind currents. The stone base shows green corrosion creeping up the walls. Toxic-green and teal-wind color palette. Compact, no characters.

참고 T1: Poison(독 가마솥) + Wind(풍차탑). 독을 퍼뜨리는 풍차. 독 + 넉백.

### 31. Purge Venom (정화의 독) — light + poison

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A purified poison cauldron radiating holy light. The base is T1 Poison's dark iron cauldron but the toxic liquid inside shimmers with golden-green luminescence, purified by holy power from T1 Light. A small golden light crystal floats just above the cauldron rim, casting warm golden rays into the glowing brew. The iron body has ornate golden engravings and holy symbols. The vapor rising from the liquid is golden-tinted rather than sickly green. Small radiant droplets on the ground. Gold-and-green color palette. Compact, no characters.

참고 T1: Poison(독 가마솥) + Light(금색 등대). 성스러운 빛으로 정화된 독. 관통빔 + 독.

---

## 이종합성: 바람 조합 (1종)

wind + light

### 32. Radiant Gale (성광 폭풍) — light + wind

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A golden windmill tower blessed with holy light. The structure is T1 Wind's stone windmill tower but with golden-trimmed fan blades that trail soft golden light trails as they spin. A golden crystal from T1 Light is mounted at the center hub of the blades, emitting warm golden rays through the spinning motion. The stone tower body has ornate golden decorations and trim. Radiant golden wind particles swirl around the top. Cream stone and warm-gold color palette. Compact, no characters.

참고 T1: Wind(풍차탑) + Light(금색 등대). 성스러운 빛의 풍차. 관통빔 + 넉백.

---

## 이종합성: 드래곤 조합 (9종)

dragon + (archer / mage / ice / lightning / flame / rock / poison / wind / light)

### 33. Dragon Rider (용기병) — archer + dragon

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A dragon-bone reinforced archer watchtower. The base is T1 Archer's dark-wood watchtower but reinforced with dragon bones and scales from T1 Dragon. A small dragon skull is mounted above the entrance as a trophy. Dragon rib bones frame the archer window slots, and dragon scale plates are nailed to the wood as armor. Two crossbows protrude from bone-reinforced slots. The foundation shows dark stone with dragon claw scratch marks. Wood-brown and dark-red bone color palette. Compact, no characters.

참고 T1: Archer(나무 망루) + Dragon(드래곤 건축물). 용뼈로 강화된 궁수탑.

### 34. Dragon Mage (용마법사) — dragon + mage

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A dragon-headed stone mage tower. The structure merges T1 Dragon's dragon-face facade with T1 Mage's stone tower — a dark stone tower with carved dragon horns protruding from the upper sides and a dragon skull relief on the front wall. A glowing purple crystal orb sits inside the dragon's open mouth, pulsing with arcane energy. The stone bricks have dragon-scale texture patterns. Dark red stone and purple-arcane color palette. Compact, no characters.

참고 T1: Dragon(드래곤 건축물) + Mage(석탑). 드래곤 얼굴 마법탑.

### 35. Frost Dragon (빙룡) — dragon + ice

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A frozen dragon-head fortress. The base is T1 Dragon's dragon-face building but encased in frost and ice from T1 Ice. Blue ice crystals grow from the dragon horns like frozen antlers. The dragon eyes glow with cold pale-blue light instead of fire-red. Thick icicles hang from the dragon's fangs and jawline. Frost and thin ice coat the dark stone, giving it a blue-gray frozen appearance. The foundation shows frozen stone with ice shards. Ice-blue and dark stone color palette. Compact, no characters.

참고 T1: Dragon(드래곤 건축물) + Ice(얼음 결정). 얼어붙은 드래곤 요새. 슬로우 + 드래곤 공격.

### 36. Thunder Dragon (뇌룡) — dragon + lightning

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A lightning-charged dragon fortress. The base is T1 Dragon's dragon-face building but with metal lightning rods from T1 Lightning protruding from both dragon horns. Yellow-white electric arcs jump between the horn tips. The dragon eyes crackle with bright electric-yellow energy. Metal conductor strips run down the stone snout to ground plates at the base. Small tesla coil elements are mounted on the sides. Dark red stone and electric-yellow color palette. Compact, no characters.

참고 T1: Dragon(드래곤 건축물) + Lightning(번개 탑). 번개 드래곤 요새. chain + 드래곤 공격.

### 37. Inferno Dragon (업화룡) — dragon + flame

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A blazing dragon-head fortress. The base is T1 Dragon's dragon-face building but with intense orange-red flames pouring from the dragon's open mouth. Fire braziers from T1 Flame burn steadily on both sides of the entrance. The dark stone shows lava cracks and orange heat-glow between bricks. The dragon eyes burn with fierce molten-orange fire. Embers and thin ash rise from the horns. Scorched volcanic stone foundation. Dark red and fire-orange color palette. Compact, no characters.

참고 T1: Dragon(드래곤 건축물) + Flame(화로). 불타는 드래곤 요새. dot + 드래곤 공격.

### 38. Stone Dragon (석룡) — dragon + rock

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A heavily fortified dragon fortress. The structure merges T1 Dragon's dragon-face building with T1 Rock's squat stone fortress — a wider, heavier dragon-head building with extra-thick reinforced stone walls and a dome-like armored top. The dragon features are carved from solid gray stone with heavy angular horns and thick blunt stone fangs. The stone texture is rough-hewn and battle-worn. Rock rubble and stone debris surround the reinforced base. Gray stone and dark red color palette. Compact, no characters.

참고 T1: Dragon(드래곤 건축물) + Rock(석조 요새). 중장갑 드래곤 요새. splash + 드래곤 공격.

### 39. Venom Dragon (독룡) — dragon + poison

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A toxic dragon-head fortress. The base is T1 Dragon's dragon-face building but corroded and stained by poison from T1 Poison. Green toxic liquid drips from the dragon's stone fangs. A small iron cauldron of bubbling green poison sits inside the dragon's open mouth. The dark stone shows green corrosion streaks and toxic stains spreading down the walls. Thin green vapor seeps from cracks in the stone. Small toxic puddles at the base. Dark red and toxic-green color palette. Compact, no characters.

참고 T1: Dragon(드래곤 건축물) + Poison(독 가마솥). 독에 오염된 드래곤 요새. 독 + 드래곤 공격.

### 40. Storm Dragon (폭풍룡) — dragon + wind

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A wind-powered dragon fortress. The base is T1 Dragon's dragon-face building but with compact windmill blades from T1 Wind mounted between the dragon horns on top. Strong wind rushes through the dragon's open mouth, creating a visible vortex. The stone surfaces show wind-carved smooth erosion patterns. Small debris particles circle tightly around the horns. Teal-colored wind streaks wrap around the dragon head. Dark red stone and teal-wind color palette. Compact, no characters.

참고 T1: Dragon(드래곤 건축물) + Wind(풍차탑). 바람의 드래곤 요새. 넉백 + 드래곤 공격.

### 41. Holy Dragon (성룡) — dragon + light

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A radiant holy dragon-head fortress. The base is T1 Dragon's dragon-face building but the dark stone is replaced with golden-white blessed stone from T1 Light. The dragon eyes glow with warm golden holy light instead of fire-red. A golden crystal is embedded in the dragon's forehead, emitting soft sunrays outward. Ornate golden trim decorates the dragon horns, fangs, and stone edges. The foundation shows light-colored blessed stone. Gold-and-cream white color palette. Compact, no characters.

참고 T1: Dragon(드래곤 건축물) + Light(금색 등대). 성스러운 황금 드래곤 요새. 관통빔 + 드래곤 공격.

---
---

# T3 타워 아트 프롬프트

T2+T2 또는 T2+T1 합성. T2보다 확실히 크고 정교하며, 두 부모 타워의 시각적 특징이 뚜렷하게 융합된 건축물.

## T3: T2+T2 합성 (12종)

### 42. Thunder Wyrm King (용뇌황제) — ancient_dragon + thunder_lord

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A massive dragon-head fortress crackling with supreme lightning. The structure is a larger, more imposing version of the ancient dragon building but with enormous metal lightning rods replacing the dragon horns. Constant white-hot electric arcs discharge between the horn tips. The dragon mouth crackles with concentrated electrical energy. Multiple tesla coils from the thunder lord tower are mounted on the fortress sides. Ancient runes glow electric-yellow across the weathered dark stone. Heavy volcanic stone base with radial scorch marks on the ground. Dark red stone and electric-yellow color palette. No characters.

참고 T2: Ancient Dragon(고대 드래곤 요새) + Thunder Lord(최강 번개탑). 번개를 지배하는 용 요새.

### 43. Plague Wyrm (역병용신) — ancient_dragon + plague

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A corrupted dragon-head fortress oozing with plague. The massive dragon-head building has its mouth transformed into a giant cauldron spewing thick green-black miasma. Both eye sockets leak viscous green fluid that runs down the stone walls. The ancient stone is deeply corroded and stained with plague — exposed green-tinted structural cracks spread across the surface. Toxic mushroom growths and skull fragments litter the base. A dense dark cloud of plague vapor hovers above the horns. Dark green-black and necrotic brown color palette. No characters.

참고 T2: Ancient Dragon(고대 드래곤 요새) + Plague(역병 가마솥). 역병을 토하는 용 요새.

### 44. Cosmos Dragon (창세룡) — ancient_dragon + solar_burst

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A majestic dragon-head fortress of white-gold stone radiating cosmic light. A massive sun crystal is embedded in the dragon's forehead, emitting multi-directional golden light beams. The dragon eyes blaze with stellar golden fire. The horns are decorated with golden cosmic symbols and celestial patterns. The stone construction shifts from dark ancient stone at the base to luminous golden-white at the top. Warm cosmic radiance surrounds the entire structure. White-gold and cosmic amber color palette. No characters.

참고 T2: Ancient Dragon(고대 드래곤 요새) + Solar Burst(태양 등대). 별빛 용 요새.

### 45. Tectonic Dragon (지각파괴룡) — quake + stone_dragon

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. An impossibly heavy dragon-head fortress made of layered geological stone. The structure combines the stone dragon's armored dragon facade with the quake fortress's seismic mass. Giant rock formations jut upward from the dragon's back like tectonic plates. The ground around the base is cracked and broken with deep fissures. The fortress is partially sunken into the earth from its own enormous weight. Faint seismic pulse lines radiate from the foundation. Dark earth-brown and gray stone color palette. No characters.

참고 T2: Quake(지진 요새) + Stone Dragon(석룡). 대지를 부수는 중장갑 용 요새.

### 46. Adamantine Lightning (아다만 뇌격룡) — stone_dragon + thunder_strike

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. An indestructible metal-armored dragon fortress. The stone dragon building is clad in dark adamantine-like metal plating over the stone walls. Heavy lightning rods protrude from reinforced metal horns. Electric arcs jump across the metal armor plates connecting bolts and rivets. The structure looks absolutely impenetrable — layered armor segments, thick metal bands, and heavy bolt rivets cover every surface. The foundation shows scorched metal ground plates. Dark gunmetal and electric-yellow color palette. No characters.

참고 T2: Stone Dragon(석룡) + Thunder Strike(천둥 강타 요새). 철벽 번개 드래곤.

### 47. Venom Sovereign (독황) — plague + venom_dragon

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. The supreme poison structure — a dragon-head fortress that is itself a giant overflowing venom vat. The dragon mouth continuously pours concentrated bright-green poison. Multiple smaller cauldrons embedded in the fortress walls are connected by dripping tubes and pipes. The stone is so corroded it appears more toxic sludge than solid building. Dense green toxic fog envelops the upper portion. The ground is a dead zone of toxic puddles and corroded rubble. Intense toxic green and black color palette. No characters.

참고 T2: Plague(역병 가마솥) + Venom Dragon(독룡). 독의 지배자.

### 48. Absolute Frost Domain (절대빙령역) — frost_dragon + zero_field

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A dragon-head fortress completely encased in layers of ancient glacial ice. The dragon features are barely visible through thick translucent deep-blue ice. Massive ice crystal formations grow from every surface — horns, fangs, walls. Absolute-zero cold radiates outward, and the air itself appears crystallized as frozen mist particles. The foundation is a solid block of deep-blue permafrost with concentric frost rings. Pure white and deep ice-blue color palette. No characters.

참고 T2: Frost Dragon(빙룡) + Zero Field(절대영도). 절대 빙결 드래곤 요새.

### 49. Celestial Judgment (천상심판) — holy_dragon + solar_burst

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A radiant white-gold dragon-head fortress serving as a divine judgment beacon. A brilliant sun crystal is mounted between the dragon horns, emitting concentrated beams of holy golden light in multiple directions. The dragon eyes radiate pure divine golden light. Wing-shaped golden light projections extend from the sides. Sacred geometric patterns and angelic motifs are carved into the luminous golden stone walls. The entire structure glows from within. Blinding gold and divine white color palette. No characters.

참고 T2: Holy Dragon(성룡) + Solar Burst(태양 등대). 천상의 심판 용 요새.

### 50. Superconductor Mage (초전도뇌마) — storm_mage + thunder_dragon

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A tall dark mage tower built into a dragon-head facade with superconducting metal coils wrapping the entire structure. Constant white-hot electrical discharge arcs between a purple crystal orb at the tower peak and the dragon horns on the sides. The purple arcane energy from the mage tower mixes with yellow-white lightning, creating violet electric plasma that streams down the coils. Metal and stone construction with purple-electric glow in the cracks. Dark stone, violet plasma, and electric yellow color palette. No characters.

참고 T2: Storm Mage(폭풍 마법탑) + Thunder Dragon(뇌룡). 초전도 용마법탑.

### 51. Grand Pyromancer (대화염마도사) — inferno + pyromancer

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A grand mage tower that is itself a massive furnace. The tall stone tower has multiple fire brazier rings at different heights, all burning intensely with layered flames. The top crystal orb blazes with white-hot fire instead of arcane purple. Lava streams flow down carved channels in the tower walls. The entire stone structure glows orange-red from internal heat, with molten cracks between bricks. A column of fire and heat shimmer rises from the top. Molten orange-red and dark scorched stone color palette. No characters.

참고 T2: Inferno(대화로) + Pyromancer(화염 마법탑). 최강 불꽃 마법탑.

### 52. Lightning Tempest (번개대폭풍) — storm_mage + thunder_lord

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A tall mage tower surrounded by a perpetual lightning storm. The stone tower has multiple lightning rods extending at different angles from the top and sides. A massive electric orb at the peak generates constant chain lightning that arcs outward in all directions. Dark storm clouds wrap tightly around the upper half of the tower. Superconducting metal strips run vertically down the stone walls, glowing with transferred electrical energy. Purple-tinged yellow lightning and dark storm-gray stone color palette. No characters.

참고 T2: Storm Mage(폭풍 마법탑) + Thunder Lord(최강 번개탑). 영구 번개폭풍 마법탑.

### 53. Hellquake (지옥균열) — inferno_dragon + quake

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A burning dragon-head fortress half-sunken into cracked, lava-filled earth. The inferno dragon's mouth vomits molten lava that flows into deep seismic fissures around the base. The heavy quake-fortress elements cause the ground to crack and buckle under weight and heat. Volcanic black stone construction with glowing orange-red lava cracks throughout the entire structure. The surrounding area looks like a hellish volcanic rift. Red-hot lava and black volcanic stone color palette. No characters.

참고 T2: Inferno Dragon(업화룡) + Quake(지진 요새). 지옥 같은 용암 균열 요새.

---

## T3: T2+T1 합성 (18종)

### 54. Primal Dragon Lord (원시용왕) — ancient_dragon + dragon

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. The most ancient and primal dragon-head fortress. A massive weathered dragon skull building with primitive tribal runes and ancient carvings etched deep into the stone. The construction is extremely old and worn — the dark stone is cracked and weathered, with cracks filled with faint red dragonfire glow. Primal dragon bone trophies and oversized fangs decorate the exterior. The eyes glow with deep ancient crimson fire. The stone base is crude and massive with ancient rubble. Darkest red-brown and weathered black stone color palette. No characters.

참고 T2+T1: Ancient Dragon(고대 드래곤) + Dragon(T1 드래곤). 가장 원시적인 용왕 요새.

### 55. Molten Hell (용화지옥) — flame + inferno_dragon

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A dragon-head fortress completely consumed by hellfire. The structure is visibly melting — stone drips as liquid lava from every edge. The dragon mouth is a wide opening of white-hot molten flame. Fire braziers have fused into the walls, creating rivers of fire flowing down the sides. The air around the structure visibly distorts with extreme heat shimmer. The foundation sits in a shallow pool of glowing molten lava. White-hot center fading to orange-red edges color palette. No characters.

참고 T2+T1: Inferno Dragon(업화룡) + Flame(T1 화로). 완전히 녹아내리는 용화 요새.

### 56. Iron Dragon (철갑룡) — rock + stone_dragon

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. An iron-clad dragon fortress with extreme armor plating. The stone dragon building is reinforced with thick iron and steel plates bolted onto every surface. The dragon horns are solid metal spikes. The walls are impossibly thick — layered stone and metal creating a vault-like structure shaped like a dragon head. Massive rivets, bolts, and metal reinforcement bands cover the exterior. The construction looks impenetrable and immovable. Gunmetal gray, dark iron, and stone color palette. No characters.

참고 T2+T1: Stone Dragon(석룡) + Rock(T1 석조 요새). 철갑으로 무장한 용 요새.

### 57. Eternal Blizzard (영구동설) — frost_dragon + ice

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A frost dragon fortress trapped in an eternal blizzard. The dragon-head building is buried under layers of never-melting snow and ice. A perpetual swirl of snow particles whips tightly around the structure. The dragon features are ghostly shapes beneath thick ice — only the faint blue glow of the eyes is visible. Massive icicle stalactites hang from every edge and fang. The ground around the base is deep snowdrift. Pure white, pale blue, and translucent ice color palette. No characters.

참고 T2+T1: Frost Dragon(빙룡) + Ice(T1 얼음 결정). 영원한 눈보라 속 용 요새.

### 58. Storm Deity (뇌신) — lightning + thunder_dragon

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A dragon fortress channeling divine thunderstorms. Both dragon horns serve as massive lightning rods, constantly discharging enormous bolts into dark storm clouds gathered directly above. The dragon eyes are pure white-hot lightning. The entire structure hums with visible electrical energy — crackling arcs race across all surfaces. Floating electric orbs orbit between the horns. The ground around the base is scorched black with radial lightning-strike patterns. Blinding white-yellow electric and dark metal color palette. No characters.

참고 T2+T1: Thunder Dragon(뇌룡) + Lightning(T1 번개 탑). 뇌신의 용 요새.

### 59. Great Poison King (독제왕) — poison + venom_dragon

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. The supreme toxic dragon fortress. The dragon-head building is so deeply poisoned that the stone itself has turned sickly green-black. Multiple bubbling poison vats are embedded in the structure at different levels. Toxic waterfalls cascade from the dragon's eye sockets and open mouth. The ground around it is dead and corroded bare earth with deep toxic pools. Dense green miasma cloud hangs close to the upper portion. Deepest toxic green and decayed black color palette. No characters.

참고 T2+T1: Venom Dragon(독룡) + Poison(T1 독 가마솥). 독의 제왕 용 요새.

### 60. Wind Dragon King (풍신룡왕) — storm_dragon + wind

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A dragon fortress commanding hurricane-force winds. Compact windmill blades rotate between the dragon horns like a crown. Powerful wind vortexes spiral through the dragon's open mouth and outward. The stone surfaces show extreme wind erosion — smooth flowing curves worn into the hard stone. Cloud wisps and debris particles orbit the structure at high speed. The base appears slightly elevated on a cushion of compressed wind. Teal-wind and silver-gray stone color palette. No characters.

참고 T2+T1: Storm Dragon(폭풍룡) + Wind(T1 풍차탑). 풍신의 용 요새.

### 61. Divine Sun Ray (태양성룡포) — holy_dragon + light

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A blazing solar dragon fortress that serves as a divine light cannon. The golden dragon-head building has a massive golden lens structure mounted inside its open jaws, focusing concentrated sunlight into a beam. Golden light radiates from every surface of the luminous white-gold stone. The dragon horns are topped with secondary golden light crystals. Sacred sun symbols and holy geometric patterns decorate the walls. The entire structure is almost blindingly bright. Brilliant golden-white and divine amber color palette. No characters.

참고 T2+T1: Holy Dragon(성룡) + Light(T1 등대). 태양 광선포 용 요새.

### 62. Arcane Dragon Sage (용마도사) — dragon_mage + mage

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A grand arcane tower with an elaborate dragon-head facade. The stone mage tower is taller and wider, with the dragon-head relief dominating the front. Three purple crystal orbs glow at different positions — one in the dragon's mouth, two flanking the tower sides. Arcane runes and dragon-scale patterns cover the entire stone surface. Purple magical energy flows visibly through carved channels connecting the orbs. The stone has a deep purple-tinged darkness. Deep purple and dark dragon-stone color palette. No characters.

참고 T2+T1: Dragon Mage(용마법사 탑) + Mage(T1 마법탑). 용의 지혜를 담은 마법탑.

### 63. Sky Lancer (천룡창기) — archer + dragon_rider

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A tall elevated dragon-bone sniper tower. The wooden watchtower is built on dragon rib-bone stilts for maximum height. A massive dragon-bone crossbow — ballista-scale — is mounted at the top, aimed forward. Dragon skull and fang decorations mark it as an elite archer position. The structure is taller and narrower than T2, optimized for long-range precision. Reinforced with both wood and dragon bone. Dragon bone white, dark wood brown color palette. No characters.

참고 T2+T1: Dragon Rider(용기병 탑) + Archer(T1 궁수 망루). 용뼈 발리스타 저격탑.

### 64. Death Miasma (사령역병) — plague + poison

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A massive plague-spreading cauldron of death. Two iron cauldrons stacked — a large plague cauldron on top with a smaller poison vat feeding into it from below through corroded pipes. The combined brew produces thick dark death miasma that rises in a heavy opaque cloud. Skull motifs and death symbols are carved into the dark iron. The liquid inside glows sickly yellow-green. Dead vegetation fragments and bone shards litter the base. Dark necrotic green-black color palette. No characters.

참고 T2+T1: Plague(역병 가마솥) + Poison(T1 독 가마솥). 사령의 역병 가마.

### 65. Thunderstorm King (천뢰지배자) — lightning + thunder_lord

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. The supreme lightning structure. A triple-stacked tesla tower with three progressively larger electric spheres at different heights. Constant chain lightning arcs between all three levels simultaneously. The dark metal structure is reinforced with heavy copper coils at each tier. A permanent electrical storm cloud sits directly above the top sphere, flashing with internal lightning. The ground around the base is permanently scorched black. Brightest electric yellow and dark metal color palette. No characters.

참고 T2+T1: Thunder Lord(최강 번개탑) + Lightning(T1 번개 탑). 천둥의 지배자.

### 66. Solar Cannon (태양포) — light + solar_burst

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A massive solar artillery lighthouse. A much taller golden tower with a huge focusing lens at the top that concentrates sunlight into a weaponized beam. Multiple reflector mirrors are mounted on the tower sides at different angles, all redirecting light upward to the main lens. The entire tower gleams with polished golden metal construction. A concentrated beam of brilliant light fires straight upward from the apex lens. Ornate golden stone base with lens-window openings. Brilliant gold and white color palette. No characters.

참고 T2+T1: Solar Burst(태양 등대) + Light(T1 등대). 태양 포격 등대.

### 67. Great Typhoon (거대태풍신) — typhoon + wind

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. The ultimate wind structure. A massive stone windmill with enormous blades spinning inside a self-generated typhoon. The swirling wind around the structure is so powerful that clouds, debris, and vapor orbit at visible high speed. The stone tower core is partially obscured by the dense storm. Multiple layers of concentric wind vortex surround the tower. The heavy stone base is the only stable element, anchoring the structure. Stormy gray, teal-wind, and white color palette. No characters.

참고 T2+T1: Typhoon(태풍 풍차) + Wind(T1 풍차탑). 거대 태풍 풍차.

### 68. Earth Shatterer (대지파괴자) — quake + rock

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. The heaviest fortress in existence. A massive, low-profile stone fortress with impossibly thick walls that causes seismic destruction by sheer mass alone. Deep cracks radiate outward in all directions from the base into the ground. The structure is partially sunken into the broken earth from its own weight. Giant displaced stone blocks and boulders are scattered around the foundation. A faint seismic pulse ring emanates from the base. The fortress walls are layered stone many blocks thick. Dark earth-brown and heavy gray stone color palette. No characters.

참고 T2+T1: Quake(지진 요새) + Rock(T1 석조 요새). 대지를 부수는 초중량 요새.

### 69. Permafrost (만년설원) — ice + zero_field

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. The deepest permanent freeze structure. A massive multi-layered ice crystal formation atop a frozen stone pedestal, emitting absolute-zero cold in all directions. Everything within range appears frozen solid — the ground is deep permafrost, the air itself seems crystallized. Multiple concentric layers of ice crystal lattice structures surround the central towering crystal. Frost particles hang motionless in the frozen air around the structure. Deep blue, white, and translucent crystalline color palette. No characters.

참고 T2+T1: Zero Field(절대영도) + Ice(T1 얼음 결정). 만년 동토의 빙결 구조물.

### 70. Sacred Judgement Beam (신성심판광) — holy_thunder + light

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A divine judgment beacon tower. A tall golden tower that emits both sacred golden light rays and white-gold holy lightning bolts simultaneously from a massive radiant crystal at the top. The crystal serves as both lightning attractor and light emitter, creating a spectacular fusion of thunder and light. Holy symbols, sacred geometry patterns, and angelic motifs decorate the polished golden surface. The foundation is luminous golden stone. Pure gold and divine white color palette. No characters.

참고 T2+T1: Holy Thunder(신성 번개탑) + Light(T1 등대). 신성 심판의 빛 탑.

### 71. Arcane Cannon (마법대포) — mage + overload_mage

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A massive arcane energy cannon tower. The stone mage tower is redesigned as heavy magical artillery — a wide barrel-like cannon opening at the top focuses overloaded purple arcane energy into concentrated blasts. Multiple crystal orbs are embedded in the tower walls at different levels, all feeding energy through glowing purple channels to the main cannon crystal at the apex. Purple energy cracks glow throughout the stressed, vibrating stone. The tower hums with barely contained overloaded power. Deep purple and dark cracked stone color palette. No characters.

참고 T2+T1: Overload Mage(과부하 마법탑) + Mage(T1 마법탑). 마법 에너지 대포탑.

---
---

# T4 타워 아트 프롬프트 (12종)

T3+T1, T3+T2, 또는 T3+T3 합성. 위엄 있고 장대한 전설급 건축물. T3보다 확실히 거대하고 복잡한 구조.

### 72. Glacial Epoch (빙하 시대) — absolute_frost_domain + ice

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. An apocalyptic ice-age citadel. A massive frozen dragon-head fortress surrounded by towering glacial formations — the absolute frost domain dragon is completely frozen in deep-blue ice, with enormous ice crystal spires growing from its back and horns like mountain peaks. Concentric rings of ice crystal walls surround the central structure. The cold is so intense the air is visible as suspended frozen particles. The ground for a wide radius is thick blue permafrost. The entire scene conveys geological-scale frozen desolation. Ice-age deep blue and glacial white color palette. No characters.

참고 T3+T1: Absolute Frost Domain(절대빙령역) + Ice(T1 얼음). 빙하기를 불러오는 궁극의 빙결 요새.

### 73. Void Sniper (허공 저격자) — archer + cosmos_dragon

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A cosmic archer station built upon a star-powered dragon platform. The cosmos dragon's golden dragon-head fortress serves as the base, with a massive precision crossbow-ballista mounted on top. The dragon's forehead sun crystal acts as a targeting scope, focusing stellar light along the ballista bolt's trajectory. The golden structure has cosmic star-map engravings and void-purple energy channels. Small orbiting star particles circle the targeting crystal. Deep space purple and cosmic gold color palette. No characters.

참고 T3+T1: Cosmos Dragon(창세룡) + Archer(T1 궁수). 별의 힘으로 저격하는 용 요새.

### 74. Genesis Verdict (창세 심판) — celestial_judgment + cosmos_dragon

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A creation-level divine judgment citadel. Two radiant golden dragon-head structures face outward from a shared base, connected by a magnificent golden arch. At the apex of the arch sits a massive cosmic sun crystal emitting divine judgment beams in all directions. The twin dragons' eyes blaze with stellar golden light. Sacred celestial patterns and creation runes cover every golden stone surface. The structure embodies the power of cosmic creation. Blinding stellar gold and cosmic white color palette. No characters.

참고 T3+T3: Celestial Judgment(천상심판) + Cosmos Dragon(창세룡). 창세급 심판 요새.

### 75. Radiant Ruin (성광 붕괴) — celestial_judgment + light

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A divine dragon fortress that collapses holy light into devastating ruin beams. The golden celestial dragon-head citadel is surrounded by multiple smaller golden lighthouse towers, all focusing their beams inward toward the dragon's open mouth. The dragon then releases a single ultra-concentrated beam of ruinous holy light forward. The convergence point where beams merge glows with blinding white intensity. Sacred golden architecture — beautiful yet devastatingly destructive. Radiant gold, blinding white, and prism-light color palette. No characters.

참고 T3+T1: Celestial Judgment(천상심판) + Light(T1 등대). 성광으로 파괴하는 심판 요새.

### 76. World Breaker (세계 파괴자) — earth_shatterer + tectonic_dragon

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A world-ending geological super-fortress. A colossal dragon-head fortress made of continental-plate stone, half-emerged from the shattered earth like a tectonic cataclysm. The ground around it is utterly destroyed — deep chasms, upthrust rock formations, and seismic devastation radiate outward. The dragon head is so impossibly massive and heavy it deforms the terrain around it. Glowing orange magma is visible in the deepest cracks beneath the structure. The stone is ancient and geological in scale. Primal earth brown, basalt black, and deep lava orange color palette. No characters.

참고 T3+T3: Earth Shatterer(대지파괴자) + Tectonic Dragon(지각파괴룡). 세계를 부수는 궁극 요새.

### 77. Magma Core (마그마 핵) — flame + hellquake

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A volcanic reactor fortress. A massive reinforced stone-and-metal furnace structure built over a hellish lava rift. At its center, a swirling ball of white-hot molten magma — the core — is visible through reinforced viewing ports and armored slits in the housing. Fire erupts from pressure vents at multiple levels. The foundation straddles a glowing lava-filled chasm. Heavy containment rings of dark metal and volcanic stone surround the core. The entire structure pulses with volcanic energy. White-hot core, orange lava, and black basalt color palette. No characters.

참고 T3+T1: Hellquake(지옥균열) + Flame(T1 화로). 마그마 핵을 품은 용암 노심 요새.

### 78. Solar Cremation (태양 소각로) — grand_pyromancer + solar_burst

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A solar-powered incineration tower. A massive golden fire-mage tower with a brilliant sun crystal at the top that focuses concentrated solar energy downward into the furnace tower below. Multiple burning fire rings orbit the sun crystal like solar flares. The tower combines grand fire magic architecture with golden lighthouse construction. The stone walls glow white-gold from the internal solar heat. Solar flare-like projections extend from the top. Polished golden metal and white-hot fire color palette. No characters.

참고 T3+T2: Grand Pyromancer(대화염마도사) + Solar Burst(태양 등대). 태양열 소각로.

### 79. Maelstrom Herald (회오리 전령) — lightning_tempest + typhoon

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A herald of electric storms. A massive tower structure at the eye of a perpetual electrified maelstrom. Lightning-charged typhoon winds spiral violently around the dark tower, with chain lightning arcing through the storm clouds. Multiple lightning rods pierce through the swirling dark wall of wind and cloud. The tower itself is barely visible through the dense maelstrom — dark stone and metal construction with electric-blue discharge. The ground is swept clean by the fierce winds. Electric blue-white lightning and dark storm gray-black color palette. No characters.

참고 T3+T2: Lightning Tempest(번개대폭풍) + Typhoon(태풍 풍차). 전기 폭풍의 전령.

### 80. Pandemic Sovereign (역병 군주) — plague_wyrm + venom_sovereign

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. The lord of all plague and disease. A massive dragon-head citadel that is a living factory of plague and venom. The dragon mouth continuously pours a waterfall of concentrated toxic plague. Multiple cauldron structures embedded in the walls produce different colored poisons — green, yellow-green, dark green — connected by a network of corroded pipes. The entire structure is covered in toxic growth: corrosion, fungal blooms, and biohazard pustules. The surrounding area is an utter dead zone. Darkest toxic green, plague black, and necrotic brown color palette. No characters.

참고 T3+T3: Plague Wyrm(역병용신) + Venom Sovereign(독황). 역병의 군주 요새.

### 81. Apex Toxin (독점 지배자) — poison + venom_sovereign

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. The apex predator of all toxins. A massive ornate dragon-head-shaped cauldron structure producing the most lethal venom in existence. The concentrated toxin inside glows with unnaturally bright neon green through glass viewing ports. Elaborate poison-distillation apparatus surrounds the main cauldron — glass tubes, copper coils, collection vials, and drip columns, each processing a different toxin. The iron-and-glass construction is both alchemical laboratory and weapon. Neon green, dark iron, and bubbling glass color palette. No characters.

참고 T3+T1: Venom Sovereign(독황) + Poison(T1 독 가마솥). 최강 독 정제 요새.

### 82. Annihilation Gale (소멸 폭풍신) — primal_dragon_lord + wind

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A primal dragon god of destruction wind. A massive ancient dragon-head citadel generating annihilation-force gales. The dragon's open mouth produces a visible destructive wind blast — debris, rocks, and dust blast outward. Dragon-bone windmill structures mounted on the horns generate perpetual hurricane-force rotation. The ancient stone is weathered to its most primal state by eons of wind. The entire structure radiates an aura of ancient, elemental destruction. Primal dark red bone, ancient stone, and teal-silver storm color palette. No characters.

참고 T3+T1: Primal Dragon Lord(원시용왕) + Wind(T1 풍차탑). 소멸의 폭풍을 일으키는 원시 용 요새.

### 83. Storm Dominion (폭풍 지배신) — thunder_lord + thunder_wyrm_king

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. The supreme deity of storms. A massive dragon-lightning citadel where the thunder lord's supreme tesla tower is merged into the thunder wyrm king's dragon crown. Triple-layered lightning arrays extend from the dragon horns, with each tier generating progressively more intense electrical discharge. Constant chain lightning arcs across the entire monumental structure. The permanent thunderstorm above expands outward, filling the sky with divine electric energy. The dragon eyes are pure white-hot lightning. Electric divine gold, dark storm, and blinding yellow color palette. No characters.

참고 T3+T2: Thunder Wyrm King(용뇌황제) + Thunder Lord(최강 번개탑). 폭풍을 지배하는 최강 뇌신 요새.

---
---

# T5 타워 아트 프롬프트 (5종)

T4+T4 합성. 게임 내 최종 단계 — 궁극의 존재감을 지닌 건축물. 두 T4 경로의 시각 정체성이 완벽하게 합쳐진 상징적 구조물.

### 84. Void Maelstrom (공허 소용돌이) — annihilation_gale + maelstrom_herald

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. The ultimate storm — a reality-warping citadel at the center of a void-infused maelstrom. An ancient primal dragon fortress merges with an electric storm tower at the core, but both are almost consumed by a spiraling vortex of void energy, wind, and lightning discharge. The space around the structure visibly bends and warps — stars and void-purple darkness peek through tears in reality within the storm. The dragon's ancient stone and the tower's dark metal are fragments within the swirling chaos. A single glowing void-purple eye at the center. Deep void purple, electric blue, and storm gray color palette. No characters.

참고 T4+T4: Annihilation Gale(소멸 폭풍신) + Maelstrom Herald(회오리 전령). 현실을 뒤틀어버리는 공허의 소용돌이.

### 85. Omega Herald (오메가 전령) — genesis_verdict + void_sniper

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. The herald of the end. A magnificent cosmic twin-dragon citadel crowned with a massive void-crystal sniper scope. The genesis verdict's golden twin-dragon arch forms the grand base, while the void sniper's precision ballista is mounted at the apex, aiming through the cosmic sun crystal as its targeting lens. Stars and galaxies orbit the structure in miniature. The golden architecture bears cosmic rune inscriptions that pulse with stellar light. A single focused beam of stellar energy fires forward from the central scope. Cosmic gold, void purple, and stellar white color palette. No characters.

참고 T4+T4: Genesis Verdict(창세 심판) + Void Sniper(허공 저격자). 종말을 고하는 우주적 전령.

### 86. Absolute Dominion (절대 지배) — glacial_epoch + storm_dominion

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. Total elemental dominion over ice and lightning. A colossal citadel split dramatically down the center — the left half is the glacial epoch's frozen dragon fortress encased in deep-blue glacial ice with towering crystal spires, the right half is the storm dominion's lightning dragon fortress crackling with perpetual golden electrical storms. Where ice and lightning meet at the center seam, crystallized lightning bolts freeze in mid-arc, creating a spectacular fusion line. The frozen half emits deep cold mist while the storm half discharges chain lightning. Ice deep-blue and electric gold stark-contrast color palette. No characters.

참고 T4+T4: Glacial Epoch(빙하 시대) + Storm Dominion(폭풍 지배신). 얼음과 번개를 절대 지배하는 최종 요새.

### 87. Star Forge (항성 용광로) — magma_core + solar_cremation

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. A stellar foundry that simulates a star's core. A massive reinforced structure housing a contained stellar fusion reaction — the inner core glows with blinding white stellar intensity, visible through narrow armored viewport slits in the volcanic-stone and golden-metal housing. Solar flare-like eruptions burst from pressure vents at the top. Multiple heavy containment and cooling rings of dark metal surround the white-hot core at different heights. The stone and metal housing shows extreme heat stress with glowing orange-white seams. The ground beneath is fused glass from the radiant heat. White stellar core, gold-orange, and volcanic black color palette. No characters.

참고 T4+T4: Magma Core(마그마 핵) + Solar Cremation(태양 소각로). 항성의 핵을 재현하는 궁극의 용광로.

### 88. Extinction Engine (소멸 기관) — pandemic_sovereign + world_breaker

> Pixel art, fantasy tower defense, perfectly front-facing straight-on camera angle like a 2D sprite, vertically symmetrical composition, transparent background. The engine of extinction — the most ominous structure in existence. A cataclysmic dragon geo-engine half-buried in utterly shattered earth, pumping toxic extinction-level plague from deep geological fissures. The massive dragon-head citadel combines world-breaking tectonic stone with pandemic plague machinery — cracked continental stone dripping with concentrated toxic sludge. The dragon mouth is a vent releasing dense clouds of extinction plague powered by geological pressure from below. Toxic rivers flow into tectonic chasms around the base. The structure represents the absolute end of all life. Dark earth brown, plague green, volcanic black, and necrotic yellow color palette. No characters.

참고 T4+T4: Pandemic Sovereign(역병 군주) + World Breaker(세계 파괴자). 모든 생명을 소멸시키는 종말의 기관.
