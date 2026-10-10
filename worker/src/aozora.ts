import type { RankingBook } from '../../shared/api'

export const AOZORA_ORIGIN = 'https://www.aozora.gr.jp'
export const RANKING_INDEX_URL = `${AOZORA_ORIGIN}/access_ranking/`

// 目次のリンク（2022_txt.html など）から、テキスト版の年間ランキングで一番新しい年を選ぶ。
// 2022_12_txt.html のような月ごとのものは含めない
export function findLatestYear(indexHtml: string): number {
  const years = [...indexHtml.matchAll(/href="(\d{4})_txt\.html"/g)].map((m) =>
    Number(m[1]),
  )
  if (years.length === 0) throw new Error('年間ランキングが見つかりません')
  return Math.max(...years)
}

export function rankingUrl(year: number): string {
  return `${RANKING_INDEX_URL}${year}_txt.html`
}

// 1 行の形: 順位 / <a href=".../cards/人物ID/card作品ID.html">書名</a><br>副題 / 作家 / アクセス数
export function parseRanking(html: string, limit: number): RankingBook[] {
  const row =
    /<td class=normal>(\d+)<\/td>\s*<td class=normal><a href="[^"]*\/cards\/(\d+)\/card(\d+)\.html"[^>]*>([\s\S]*?)<\/a><br>([\s\S]*?)<\/td>\s*<td class=normal>([\s\S]*?)<\/td>/g
  const books: RankingBook[] = []
  for (const m of html.matchAll(row)) {
    books.push({
      rank: Number(m[1]),
      personId: m[2],
      workId: m[3],
      title: cleanCell(m[4]),
      subtitle: cleanCell(m[5]),
      author: cleanCell(m[6]),
    })
    if (books.length >= limit) break
  }
  return books
}

export function cardUrl(personId: string, workId: string): string {
  return `${AOZORA_ORIGIN}/cards/${personId}/card${workId}.html`
}

// 図書カードのページから「テキストファイル(ルビあり)」の zip を探す。
// ルビありが無い作品は、ほかのテキストの zip で代用する
export function findTextZipUrl(cardHtml: string, cardPageUrl: string): string | null {
  const zips = [...cardHtml.matchAll(/href="(\.\/files\/[^"]+\.zip)"/g)].map(
    (m) => m[1],
  )
  const zip = zips.find((path) => path.includes('_ruby_')) ?? zips[0]
  return zip ? new URL(zip, cardPageUrl).toString() : null
}

function cleanCell(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
