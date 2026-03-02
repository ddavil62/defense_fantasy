/**
 * @fileoverview GPT Image API(gpt-image-1)를 사용하여 마법진(룬) 에셋 6장을 생성하는 스크립트.
 * 1024x1024 원본을 생성한 뒤 sharp로 64x64 PNG로 리사이즈하여
 * public/assets/ui/ 디렉토리에 저장한다.
 *
 * 사용법: node fantasydefence/tools/generate-rune-assets.mjs
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../public/assets/ui');

/** OpenAI API 키 (.env에서 로드) */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('[ERROR] OPENAI_API_KEY가 .env 파일에 설정되어 있지 않습니다.');
  process.exit(1);
}

/**
 * 생성할 마법진 에셋 목록.
 * 각 항목은 파일명(확장자 제외)과 GPT Image API에 전달할 프롬프트로 구성된다.
 * @type {{ name: string, prompt: string }[]}
 */
const RUNES = [
  {
    name: 'rune_t1',
    prompt: 'A simple magic circle / rune glyph for a Tier 1 basic tower pedestal in a fantasy tower defense game. Gray and cyan colors, simple circular pattern with minimal rune markings. Pixel art style, 16-bit retro. Transparent background, centered in frame, top-down view.',
  },
  {
    name: 'rune_t2',
    prompt: 'A silver magic circle / rune glyph for a Tier 2 tower pedestal in a fantasy tower defense game. Silver metallic color with rune symbols along the circle edge. Pixel art style, 16-bit retro. Transparent background, centered in frame, top-down view.',
  },
  {
    name: 'rune_t3',
    prompt: 'A golden magic circle / rune glyph for a Tier 3 tower pedestal in a fantasy tower defense game. Gold color with complex interlocking geometric rune patterns. Pixel art style, 16-bit retro. Transparent background, centered in frame, top-down view.',
  },
  {
    name: 'rune_t4',
    prompt: 'A purple magic circle / rune glyph for a Tier 4 tower pedestal in a fantasy tower defense game. Deep purple and violet colors with arcane magical symbols and glowing accents. Pixel art style, 16-bit retro. Transparent background, centered in frame, top-down view.',
  },
  {
    name: 'rune_t5',
    prompt: 'A legendary magic circle / rune glyph for a Tier 5 ultimate tower pedestal in a fantasy tower defense game. Gold and purple combined with elaborate ornate patterns, radiating energy lines. Pixel art style, 16-bit retro. Transparent background, centered in frame, top-down view.',
  },
  {
    name: 'merge_rune',
    prompt: 'A glowing golden magic circle / rune glyph used as a merge/fusion indicator in a fantasy tower defense game. Bright gold color with rotating spiral patterns suggesting fusion/combination energy. Pixel art style, 16-bit retro. Transparent background, centered in frame, top-down view.',
  },
];

/**
 * GPT Image API를 호출하여 이미지를 생성하고 64x64로 리사이즈한 PNG를 저장한다.
 * @param {string} name - 파일명 (확장자 제외)
 * @param {string} prompt - 이미지 생성 프롬프트
 * @returns {Promise<void>}
 */
async function generateRune(name, prompt) {
  console.log(`[${name}] 생성 중...`);

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'low',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API 오류 (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const b64 = json.data[0].b64_json;
  const buffer = Buffer.from(b64, 'base64');

  // sharp로 64x64 리사이즈
  let finalBuffer;
  try {
    const sharp = (await import('sharp')).default;
    finalBuffer = await sharp(buffer)
      .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    console.log(`[${name}] 64x64 리사이즈 완료`);
  } catch (e) {
    console.warn(`[${name}] sharp 리사이즈 실패, 원본(1024x1024) 저장: ${e.message}`);
    finalBuffer = buffer;
  }

  const outPath = path.join(OUTPUT_DIR, `${name}.png`);
  fs.writeFileSync(outPath, finalBuffer);
  console.log(`[${name}] 저장 완료 -> ${outPath}`);
}

/**
 * 메인 실행 함수. 출력 디렉토리를 생성하고 6종 마법진을 순차 생성한다.
 */
async function main() {
  // 출력 디렉토리 확인/생성
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`마법진 ${RUNES.length}종 생성 시작...`);
  console.log(`출력 경로: ${OUTPUT_DIR}\n`);

  for (const rune of RUNES) {
    try {
      await generateRune(rune.name, rune.prompt);
    } catch (err) {
      console.error(`[${rune.name}] 생성 실패:`, err.message);
    }
    console.log('');
  }

  console.log('완료!');
}

main();
