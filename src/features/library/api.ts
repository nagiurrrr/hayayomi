import { bookTextPath, type Ranking, type RankingBook } from '../../../shared/api'

// 青空文庫の中継（worker/）の URL。.env.development / .env.production で切り替える
const API_URL = import.meta.env.VITE_API_URL

async function get(path: string): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`取得に失敗しました（${res.status}）`)
  return res
}

export async function fetchRanking(): Promise<Ranking> {
  return (await get('/ranking')).json()
}

// 「テキストファイル(ルビあり)」の zip
export async function fetchBookText(book: RankingBook): Promise<Uint8Array> {
  return new Uint8Array(await (await get(bookTextPath(book))).arrayBuffer())
}
