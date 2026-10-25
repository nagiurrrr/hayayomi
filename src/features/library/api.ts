import {
  articlePath,
  bookTextPath,
  pagePath,
  type Ranking,
  type RankingBook,
} from "../../../shared/api";
import type { ArticleRef } from "../import/article";
import { WEB_ERRORS } from "../import/web";

// 青空文庫と記事のサイトの中継（worker/）の URL。.env.development / .env.production で切り替える
const API_URL = import.meta.env.VITE_API_URL;

async function get(path: string): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`取得に失敗しました（${res.status}）`);
  return res;
}

export async function fetchRanking(): Promise<Ranking> {
  return (await get("/ranking")).json();
}

// 「テキストファイル(ルビあり)」の zip
export async function fetchBookText(book: RankingBook): Promise<Uint8Array> {
  return new Uint8Array(await (await get(bookTextPath(book))).arrayBuffer());
}

// 記事の JSON（各サイトの API が返したもの）
export async function fetchArticle(ref: ArticleRef): Promise<unknown> {
  return (await get(articlePath(ref.site, ref.id))).json();
}

// Worker が返す status ごとの、読めない理由
const PAGE_ERRORS: Record<number, string> = {
  400: WEB_ERRORS.blockedUrl,
  404: WEB_ERRORS.notFound,
  413: WEB_ERRORS.tooLarge,
  415: WEB_ERRORS.notHtml,
  429: WEB_ERRORS.tooMany,
};

// 任意の Web ページの HTML。文字コードを読み分けるため、Content-Type と一緒に返す
export async function fetchPage(
  url: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  try {
    const res = await fetch(`${API_URL}${pagePath(url)}`);
    if (!res.ok)
      throw new Error(PAGE_ERRORS[res.status] ?? WEB_ERRORS.fetchFailed);
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      contentType: res.headers.get("Content-Type") ?? "",
    };
  } catch (e) {
    // 通信の途切れ（大きすぎて Worker が途中でやめた時も含む）は TypeError になる
    if (e instanceof TypeError) throw new Error(WEB_ERRORS.fetchFailed);
    throw e;
  }
}
