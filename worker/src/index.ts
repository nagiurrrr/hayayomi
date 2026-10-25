// 青空文庫・記事のサイト・任意の Web ページの中継。CORS を許可していないことがあるため、ブラウザの代わりに取得して返す
import {
  ARTICLE_SITES,
  type ArticleSite,
  type Ranking,
} from "../../shared/api";
import { ARTICLE_API_URL } from "./articles";
import {
  RANKING_INDEX_URL,
  cardUrl,
  findLatestYear,
  findTextZipUrl,
  parseRanking,
  rankingUrl,
} from "./aozora";
import { isAllowedPageUrl, limitSize } from "./page";

const RANKING_LIMIT = 100;
const RANKING_KV_KEY = "ranking";
const DAY = 60 * 60 * 24;
// 取りに行く先から、どこからのアクセスか分かるようにする
const USER_AGENT = "hayayomi (+https://github.com/nagiurrrr/hayayomi)";

// 任意の Web ページの大きさの上限と、転送をたどる回数の上限
const PAGE_MAX_BYTES = 5 * 1024 * 1024;
const PAGE_MAX_REDIRECTS = 5;

const BOOK_TEXT = /^\/books\/(\d{1,8})\/(\d{1,8})\/text$/;
const ARTICLE = new RegExp(
  `^/articles/(${ARTICLE_SITES.join("|")})/([\\w-]{1,64})$`,
);

export default {
  async fetch(request, env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "GET") {
      return error(405, "GET のみ受け付けます", cors);
    }
    // 画面以外（curl など）からの呼び出しを断る。Origin は偽れるので、回数の制限と合わせて使う
    if (!("Access-Control-Allow-Origin" in cors)) {
      return error(403, "許可していないサイトからは使えません", cors);
    }
    // 同じ IP から立て続けに呼ばれて、無料枠や取りに行く先の上限を使い切らないようにする
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (!(await env.RATE_LIMITER.limit({ key: ip })).success) {
      return error(429, "しばらく待ってから試してください", cors);
    }

    try {
      const { pathname, searchParams } = new URL(request.url);
      if (pathname === "/ranking") {
        return Response.json(await getRanking(env), {
          headers: { ...cors, "Cache-Control": `public, max-age=${DAY}` },
        });
      }
      const book = BOOK_TEXT.exec(pathname);
      if (book) {
        return await getBookText(book[1], book[2], cors);
      }
      const article = ARTICLE.exec(pathname);
      if (article) {
        return await getArticle(
          article[1] as ArticleSite,
          article[2],
          env,
          cors,
        );
      }
      if (pathname === "/page") {
        return await getPage(searchParams.get("url"), cors);
      }
      return error(404, "見つかりません", cors);
    } catch (e) {
      console.error(e);
      return error(502, "元のサイトから取得できませんでした", cors);
    }
  },
} satisfies ExportedHandler<Env>;

// 許可した Origin（GitHub Pages と開発用サーバー）にだけ読み取りを許す
function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowed: readonly string[] = env.ALLOWED_ORIGINS;
  if (!origin || !allowed.includes(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    Vary: "Origin",
  };
}

function error(status: number, message: string, cors: Record<string, string>) {
  return Response.json({ error: message }, { status, headers: cors });
}

async function fetchAozora(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${url} の取得に失敗しました（${res.status}）`);
  return res;
}

// ランキングは更新されないので、作った結果を KV に 1 日置いておく
async function getRanking(env: Env): Promise<Ranking> {
  const cached = await env.CACHE.get<Ranking>(RANKING_KV_KEY, "json");
  if (cached) return cached;

  const indexHtml = await (await fetchAozora(RANKING_INDEX_URL)).text();
  const year = findLatestYear(indexHtml);
  const sourceUrl = rankingUrl(year);
  const html = await (await fetchAozora(sourceUrl)).text();
  const books = parseRanking(html, RANKING_LIMIT);
  if (books.length === 0) throw new Error("ランキングを読み取れませんでした");

  const ranking: Ranking = { year, sourceUrl, books };
  await env.CACHE.put(RANKING_KV_KEY, JSON.stringify(ranking), {
    expirationTtl: DAY,
  });
  return ranking;
}

// 図書カードから zip の場所を探し、中身は読まずにそのまま流す（CPU 時間をほぼ使わない）
async function getBookText(
  personId: string,
  workId: string,
  cors: Record<string, string>,
): Promise<Response> {
  const card = cardUrl(personId, workId);
  const cardRes = await fetch(card, { headers: { "User-Agent": USER_AGENT } });
  if (cardRes.status === 404) return error(404, "作品が見つかりません", cors);
  if (!cardRes.ok)
    throw new Error(`${card} の取得に失敗しました（${cardRes.status}）`);
  const zipUrl = findTextZipUrl(await cardRes.text(), card);
  if (!zipUrl) return error(404, "テキストファイルがありません", cors);

  const zip = await fetchAozora(zipUrl);
  return new Response(zip.body, {
    headers: {
      ...cors,
      "Content-Type": "application/zip",
      // 公開済みの作品の zip はほとんど変わらないので、ブラウザに 1 週間置かせる
      "Cache-Control": `public, max-age=${DAY * 7}`,
    },
  });
}

// 記事の JSON を KV に 1 日置く。Qiita の認証なしの API は、同じ IP から 1 時間に 60 回までしか呼べないため
async function getArticle(
  site: ArticleSite,
  id: string,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const key = `article:${site}:${id}`;
  let json = await env.CACHE.get(key, "arrayBuffer");
  if (!json) {
    const url = ARTICLE_API_URL[site](id);
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.status === 404) return error(404, "記事が見つかりません", cors);
    if (!res.ok)
      throw new Error(`${url} の取得に失敗しました（${res.status}）`);
    json = await res.arrayBuffer();
    await env.CACHE.put(key, json, { expirationTtl: DAY });
  }
  return new Response(json, {
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${DAY}`,
    },
  });
}

// 任意の Web ページの HTML を、中身を読まずにそのまま流す。踏み台にされないよう、行き先・種類・大きさを絞る（回数は fetch の入口で絞る）
async function getPage(
  target: string | null,
  cors: Record<string, string>,
): Promise<Response> {
  let url: URL;
  try {
    url = new URL(target ?? "");
  } catch {
    return error(400, "URL の形ではありません", cors);
  }
  if (!isAllowedPageUrl(url)) return error(400, "通せない URL です", cors);

  // 転送された先も同じく調べるため、自分でたどる
  let res: Response | undefined;
  for (let i = 0; i <= PAGE_MAX_REDIRECTS; i++) {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "manual",
    });
    const location = res.headers.get("Location");
    if (res.status < 300 || res.status >= 400 || !location) break;
    url = new URL(location, url);
    if (!isAllowedPageUrl(url)) return error(400, "通せない URL です", cors);
    res = undefined;
  }
  if (!res) return error(502, "転送が多すぎます", cors);
  if (res.status === 404 || res.status === 410)
    return error(404, "ページが見つかりません", cors);
  if (!res.ok || !res.body)
    throw new Error(`${url} の取得に失敗しました（${res.status}）`);

  const type = res.headers.get("Content-Type") ?? "";
  if (!/^text\/html|^application\/xhtml\+xml/i.test(type))
    return error(415, "HTML ではありません", cors);
  if (Number(res.headers.get("Content-Length") ?? 0) > PAGE_MAX_BYTES)
    return error(413, "ページが大きすぎます", cors);

  return new Response(limitSize(res.body, PAGE_MAX_BYTES), {
    headers: {
      ...cors,
      // 文字コードは画面で読み分けるので、元の charset をそのまま渡す
      "Content-Type": type,
      // ページは書き換わることがあるので、ブラウザに置かせるのは 1 時間だけ
      "Cache-Control": "public, max-age=3600",
    },
  });
}
