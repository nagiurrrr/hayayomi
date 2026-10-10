// 青空文庫の中継。青空文庫は CORS を許可していないため、ブラウザの代わりに取得して返す
import type { Ranking } from '../../shared/api'
import {
  RANKING_INDEX_URL,
  cardUrl,
  findLatestYear,
  findTextZipUrl,
  parseRanking,
  rankingUrl,
} from './aozora'

const RANKING_LIMIT = 100
const RANKING_KV_KEY = 'ranking'
const DAY = 60 * 60 * 24
// 青空文庫側から、どこからのアクセスか分かるようにする
const USER_AGENT = 'hayayomi (+https://github.com/nagiurrrr/hayayomi)'

const BOOK_TEXT = /^\/books\/(\d{1,8})\/(\d{1,8})\/text$/

export default {
  async fetch(request, env): Promise<Response> {
    const cors = corsHeaders(request, env)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }
    if (request.method !== 'GET') {
      return error(405, 'GET のみ受け付けます', cors)
    }

    try {
      const { pathname } = new URL(request.url)
      if (pathname === '/ranking') {
        return Response.json(await getRanking(env), {
          headers: { ...cors, 'Cache-Control': `public, max-age=${DAY}` },
        })
      }
      const book = BOOK_TEXT.exec(pathname)
      if (book) {
        return await getBookText(book[1], book[2], cors)
      }
      return error(404, '見つかりません', cors)
    } catch (e) {
      console.error(e)
      return error(502, '青空文庫から取得できませんでした', cors)
    }
  },
} satisfies ExportedHandler<Env>

// 許可した Origin（GitHub Pages と開発用サーバー）にだけ読み取りを許す
function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin')
  const allowed = env.ALLOWED_ORIGINS.split(',')
  if (!origin || !allowed.includes(origin)) return { Vary: 'Origin' }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    Vary: 'Origin',
  }
}

function error(status: number, message: string, cors: Record<string, string>) {
  return Response.json({ error: message }, { status, headers: cors })
}

async function fetchAozora(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`${url} の取得に失敗しました（${res.status}）`)
  return res
}

// ランキングは更新されないので、作った結果を KV に 1 日置いておく
async function getRanking(env: Env): Promise<Ranking> {
  const cached = await env.CACHE.get<Ranking>(RANKING_KV_KEY, 'json')
  if (cached) return cached

  const indexHtml = await (await fetchAozora(RANKING_INDEX_URL)).text()
  const year = findLatestYear(indexHtml)
  const sourceUrl = rankingUrl(year)
  const html = await (await fetchAozora(sourceUrl)).text()
  const books = parseRanking(html, RANKING_LIMIT)
  if (books.length === 0) throw new Error('ランキングを読み取れませんでした')

  const ranking: Ranking = { year, sourceUrl, books }
  await env.CACHE.put(RANKING_KV_KEY, JSON.stringify(ranking), {
    expirationTtl: DAY,
  })
  return ranking
}

// 図書カードから zip の場所を探し、中身は読まずにそのまま流す（CPU 時間をほぼ使わない）
async function getBookText(
  personId: string,
  workId: string,
  cors: Record<string, string>,
): Promise<Response> {
  const card = cardUrl(personId, workId)
  const cardRes = await fetch(card, { headers: { 'User-Agent': USER_AGENT } })
  if (cardRes.status === 404) return error(404, '作品が見つかりません', cors)
  if (!cardRes.ok) throw new Error(`${card} の取得に失敗しました（${cardRes.status}）`)
  const zipUrl = findTextZipUrl(await cardRes.text(), card)
  if (!zipUrl) return error(404, 'テキストファイルがありません', cors)

  const zip = await fetchAozora(zipUrl)
  return new Response(zip.body, {
    headers: {
      ...cors,
      'Content-Type': 'application/zip',
      // 公開済みの作品の zip はほとんど変わらないので、ブラウザに 1 週間置かせる
      'Cache-Control': `public, max-age=${DAY * 7}`,
    },
  })
}
