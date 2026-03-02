/**
 * @fileoverview GPT Image API(gpt-image-1)를 사용하여 UI 아이콘 7종을 생성하는 스크립트.
 * 1024x1024 원본을 생성한 뒤 sharp로 64x64 PNG로 리사이즈하여
 * public/assets/ui/icons/ 디렉토리에 저장한다.
 *
 * 사용법: node fantasydefence/tools/generate-ui-icons.mjs
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../public/assets/ui/icons');

/** OpenAI API 키 (.env에서 로드) */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('[ERROR] OPENAI_API_KEY가 .env 파일에 설정되어 있지 않습니다.');
  process.exit(1);
}

/**
 * 생성할 아이콘 목록.
 * 각 항목은 파일명(확장자 제외)과 GPT Image API에 전달할 프롬프트로 구성된다.
 * @type {{ name: string, prompt: string }[]}
 */
const ICONS = [
  {
    name: 'icon_sell',
    prompt: 'A pixel art trash can icon for a "sell/delete" button in a fantasy tower defense game. Red accent color, simple and clean design, 16-bit retro style. Transparent background, centered in frame, 64x64 pixel art style.',
  },
  {
    name: 'icon_speed_x1',
    prompt: 'A pixel art single right-pointing arrow (play/1x speed) icon for a tower defense game speed button. White color, simple and clean design, 16-bit retro style. Transparent background, centered in frame, 64x64 pixel art style.',
  },
  {
    name: 'icon_speed_x2',
    prompt: 'A pixel art double right-pointing arrow (fast forward/2x speed) icon for a tower defense game speed button. Yellow/golden color (#fdcb6e), simple and clean design, 16-bit retro style. Transparent background, centered in frame, 64x64 pixel art style.',
  },
  {
    name: 'icon_speed_x3',
    prompt: 'A pixel art triple right-pointing arrow (turbo/3x speed) icon for a tower defense game speed button. Red color (#e94560), simple and clean design, 16-bit retro style. Transparent background, centered in frame, 64x64 pixel art style.',
  },
  {
    name: 'icon_pause',
    prompt: 'A pixel art pause button icon (two vertical bars) for a tower defense game. White color, simple and clean design, 16-bit retro style. Transparent background, centered in frame, 64x64 pixel art style.',
  },
  {
    name: 'icon_sound_on',
    prompt: 'A pixel art speaker with sound waves icon (sound on/unmuted) for a tower defense game. Mint/green color (#55efc4), simple and clean design, 16-bit retro style. Transparent background, centered in frame, 64x64 pixel art style.',
  },
  {
    name: 'icon_sound_off',
    prompt: 'A pixel art speaker with X mark icon (muted/sound off) for a tower defense game. Gray color (#b2bec3), simple and clean design, 16-bit retro style. Transparent background, centered in frame, 64x64 pixel art style.',
  },
];

/**
 * GPT Image API를 호출하여 이미지를 생성하고 64x64로 리사이즈한 PNG를 저장한다.
 * @param {string} name - 파일명 (확장자 제외)
 * @param {string} prompt - 이미지 생성 프롬프트
 * @returns {Promise<void>}
 */
async function generateIcon(name, prompt) {
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
 * 메인 실행 함수. 출력 디렉토리를 생성하고 7종 아이콘을 순차 생성한다.
 */
async function main() {
  // 출력 디렉토리 확인/생성
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`아이콘 ${ICONS.length}종 생성 시작...`);
  console.log(`출력 경로: ${OUTPUT_DIR}\n`);

  for (const icon of ICONS) {
    try {
      await generateIcon(icon.name, icon.prompt);
    } catch (err) {
      console.error(`[${icon.name}] 생성 실패:`, err.message);
    }
    console.log('');
  }

  console.log('완료!');
}

main();
