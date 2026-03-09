# Fantasy Tower Defense - 글로우 벡터 아트 콘셉트

## 1. 스타일 정의

### 글로우 벡터 스타일

전체 아트 방향은 **네온 발광(Neon Glow) + 벡터 실루엣** 스타일이다.
어두운 배경(#1a1a2e) 위에 밝은 네온 글로우가 돋보이는 디자인으로,
각 타워의 속성(원소)이 색상만으로 직관적으로 구분된다.

- **배경색**: #1a1a2e (진한 남색)
- **글로우 구조**: 외부 발광층(opacity 0.6) + 코어층(opacity 1.0) 이중 구조
- **에셋 크기**: 128x128 RGBA PNG (투명 배경)
- **게임 내 표시**: 64x64 (`setDisplaySize(64, 64)`)
- **렌더링 설정**: `pixelArt: false`, `antialias: true`

### 디자인 원칙

1. **색상 우선**: 형태보다 색상으로 타워를 구분한다.
2. **단순 실루엣**: 복잡한 디테일보다 명확한 실루엣을 우선한다.
3. **글로우 일관성**: 모든 타워에 동일한 필터 표준(외부+코어)을 적용한다.
4. **투명 배경**: PNG 배경은 항상 투명이며, 글로우가 자연스럽게 퍼진다.

---

## 2. T1 타워 색상 팔레트

| 타워 타입 | 한국어명 | coreColor | glowColor | accentColor |
|---|---|---|---|---|
| archer | 영웅 궁수대 | #7fff7f | #00ff00 | #ffffff |
| mage | 마법사 | #bf7fff | #9900ff | #ffffff |
| ice | 얼음 마술사 | #7fffff | #00ffff | #ffffff |
| lightning | 번개마술사 | #ffff7f | #ffff00 | #ffffff |
| flame | 화염 마술사 | #ff9f3f | #ff6600 | #ffff00 |
| rock | 암석 수호자 | #bf9f7f | #996633 | #ffffff |
| poison | 독액 마술사 | #7fff3f | #33cc00 | #ffff00 |
| wind | 실바람 궁수 | #7fffff | #00ccff | #ffffff |
| light | 세인트 첨탑 | #ffff7f | #ffcc00 | #ffffff |
| dragon | 드래곤 | #ff7f7f | #ff0000 | #ffff00 |

### 색상 역할

- **coreColor**: 타워 본체의 주 색상. 밝고 채도가 높다.
- **glowColor**: 외부 글로우(발광) 색상. coreColor보다 진하고 순색에 가깝다.
- **accentColor**: 내부 디테일, 하이라이트 색상. 대부분 #ffffff(흰색) 또는 #ffff00(노란색).

---

## 3. SVG 필터 표준

모든 타워 SVG에 공통 적용되는 글로우 필터 사양:

### 외부 글로우 필터 (id="glow")

```xml
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
  <feMerge>
    <feMergeNode in="blur"/>
    <feMergeNode in="blur"/>
    <feMergeNode in="blur"/>
  </feMerge>
</filter>
```

- **stdDeviation**: 4 (넓은 발광 반경)
- **feMerge**: 3겹 누적으로 밝기 증가
- **적용 레이어 opacity**: 0.6

### 내부 코어 필터 (id="core")

```xml
<filter id="core" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
  <feMerge>
    <feMergeNode in="blur"/>
    <feMergeNode in="blur"/>
  </feMerge>
</filter>
```

- **stdDeviation**: 2 (타이트한 코어 발광)
- **feMerge**: 2겹 누적
- **적용 레이어 opacity**: 1.0

### 필터 좌표

`x="-50%" y="-50%" width="200%" height="200%"` 설정으로
글로우가 SVG viewBox 밖으로 잘리지 않도록 한다.

---

## 4. SVG 예시: Archer 타워

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
      </feMerge>
    </filter>
    <filter id="core" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="128" height="128" fill="none"/>
  <!-- 외부 글로우 레이어 -->
  <g filter="url(#glow)" opacity="0.6">
    <polygon points="64,16 16,112 112,112" fill="#00ff00" />
  </g>
  <!-- 코어 레이어 -->
  <g filter="url(#core)" opacity="1.0">
    <polygon points="64,16 16,112 112,112" fill="#7fff7f" />
    <line x1="32" y1="60" x2="96" y2="60" stroke="#ffffff" stroke-width="1.5" opacity="0.7"/>
    <line x1="28" y1="75" x2="100" y2="75" stroke="#ffffff" stroke-width="1.5" opacity="0.5"/>
    <line x1="24" y1="90" x2="104" y2="90" stroke="#ffffff" stroke-width="1.5" opacity="0.4"/>
  </g>
</svg>
```

---

## 5. 타워 티어 확장 지침

### T2/T3 확장 원칙

T2, T3 이상의 합성 타워는 T1과 동일한 글로우 벡터 스타일을 따르되,
티어가 올라갈수록 다음을 적용한다:

| 항목 | T1 | T2 | T3 | T4/T5 |
|---|---|---|---|---|
| 형태 복잡도 | 단순 실루엣 | 디테일 추가 | 복합 형태 | 정교한 합성 형태 |
| 글로우 강도 | stdDeviation=4 | stdDeviation=5 | stdDeviation=6 | stdDeviation=7 |
| 코어 강도 | stdDeviation=2 | stdDeviation=2.5 | stdDeviation=3 | stdDeviation=3.5 |
| 액센트 레이어 | 1개 | 2개 | 3개 | 4개 이상 |
| 추가 효과 | 없음 | 링/오라 추가 | 파티클 형태 추가 | 복합 파티클 + 오라 |

### 색상 규칙

- 합성 타워는 부모 타워 2종의 glowColor를 **그라데이션** 또는 **이중 레이어**로 표현한다.
- coreColor는 부모 중 주속성 타워의 색상을 따른다.

### 생성 스크립트 확장

T2/T3 타워 에셋 생성 시 `generate-vector-towers.cjs`를 확장하거나
별도 스크립트(`generate-vector-towers-t2.cjs` 등)를 생성한다.
동일한 SVG 필터 표준과 sharp PNG 변환 파이프라인을 재사용한다.
