import type { Phrase } from "./phrases";

export const MIN_SPEED = 300;
export const MAX_SPEED = 1200;
export const DEFAULT_SPEED = 700;

// 短い文節でも目で追えるよう、最低限これだけの文字数ぶんは表示する
const MIN_CHARS = 2;
const SENTENCE_PAUSE = 1.5;
const PARAGRAPH_PAUSE = 2.5;

// 文節の表示時間を「何文字ぶんか」で表したもの。止まる時間も文字数に換算して足す
function phraseWeight(phrase: Phrase): number {
  let weight = Math.max([...phrase.text].length, MIN_CHARS);
  if (phrase.paragraphEnd) {
    weight += PARAGRAPH_PAUSE * MIN_CHARS;
  } else if (phrase.sentenceEnd) {
    weight += SENTENCE_PAUSE * MIN_CHARS;
  }
  return weight;
}

function msPerChar(speed: number): number {
  return 60000 / speed;
}

// 文節を表示する時間（ミリ秒）。speed は 文字/分
export function phraseDuration(phrase: Phrase, speed: number): number {
  return phraseWeight(phrase) * msPerChar(speed);
}

// 各位置から最後までの重みの合計。速さによらないので、本を開いた時に一度だけ求める
export function remainingWeights(phrases: Phrase[]): number[] {
  const sums = new Array<number>(phrases.length + 1).fill(0);
  for (let i = phrases.length - 1; i >= 0; i--) {
    sums[i] = sums[i + 1] + phraseWeight(phrases[i]);
  }
  return sums;
}

// 残りの時間を「約 N 分」「約 H 時間 M 分」の形にする
export function formatRemaining(weight: number, speed: number): string {
  const minutes = Math.ceil((weight * msPerChar(speed)) / 60000);
  if (minutes < 60) return `約 ${minutes} 分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `約 ${hours} 時間` : `約 ${hours} 時間 ${rest} 分`;
}
