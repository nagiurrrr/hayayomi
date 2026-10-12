import { jaModel, Parser } from 'budoux'

export type Phrase = {
  text: string
  // 本文の何文字目（UTF-16 の位置）から始まるか
  start: number
  // 文がここで終わる（。！？ などで閉じる）
  sentenceEnd: boolean
  // 段落がここで終わる
  paragraphEnd: boolean
}

// 日本語モデルだけを使う（loadDefaultJapaneseParser だと他言語のモデルまで同梱される）
const parser = new Parser(jaModel)

const SENTENCE_END = /[。！？!?][」』）)]*$/

// 1 回に出す文字数の上限。RsvpView の枠（高さ 55vh・文字 5vh）に収まる数
export const MAX_PHRASE_CHARS = 10

// 行の頭に来てはいけない文字（句読点・閉じ括弧など）
const NO_LINE_START = /[、。，．,.！？!?」』）)〕］】〉》ー…‥・]/

// 本文を段落ごとに BudouX で文節に分ける
export function splitPhrases(body: string): Phrase[] {
  const phrases: Phrase[] = []
  // 本文の中で、次の文節を探し始める位置
  let cursor = 0
  for (const line of body.split('\n')) {
    const paragraph = line.trim()
    if (paragraph === '') continue
    const chunks = parser
      .parse(paragraph)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk !== '')
    chunks.forEach((chunk, i) => {
      const pieces = splitLong(chunk)
      pieces.forEach((text, j) => {
        // 文や段落の終わりの印は、最後の切れ端だけに付ける
        const isLast = j === pieces.length - 1
        const start = body.indexOf(text, cursor)
        cursor = start + text.length
        phrases.push({
          text,
          start,
          sentenceEnd: isLast && SENTENCE_END.test(text),
          paragraphEnd: isLast && i === chunks.length - 1,
        })
      })
    })
  }
  return phrases
}

// 長すぎる文節を、なるべく均等な長さに分ける
export function splitLong(text: string): string[] {
  const pieces: string[] = []
  let rest = [...text]
  while (rest.length > MAX_PHRASE_CHARS) {
    const count = Math.ceil(rest.length / MAX_PHRASE_CHARS)
    let cut = Math.ceil(rest.length / count)
    // 句読点や閉じ括弧で始まらないよう、切れ目を前にずらす
    while (cut > 1 && NO_LINE_START.test(rest[cut])) cut--
    pieces.push(rest.slice(0, cut).join(''))
    rest = rest.slice(cut)
  }
  pieces.push(rest.join(''))
  return pieces
}

// index を含む文の先頭の位置
export function sentenceStart(phrases: Phrase[], index: number): number {
  let i = index
  while (i > 0 && !isBoundary(phrases[i - 1])) i--
  return i
}

function isBoundary(phrase: Phrase): boolean {
  return phrase.sentenceEnd || phrase.paragraphEnd
}

// 1 文戻る: 文の途中なら文の先頭へ、先頭にいるなら前の文の先頭へ
export function prevSentence(phrases: Phrase[], index: number): number {
  const start = sentenceStart(phrases, index)
  if (start < index) return start
  return start === 0 ? 0 : sentenceStart(phrases, start - 1)
}

// 1 文進む: 次の文の先頭へ
export function nextSentence(phrases: Phrase[], index: number): number {
  let i = index
  while (i < phrases.length - 1 && !isBoundary(phrases[i])) i++
  return Math.min(i + 1, phrases.length - 1)
}
