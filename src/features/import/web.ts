import { decodeText, type AozoraText } from "./aozora";
import { extractText } from "./html";

// 任意の Web ページを読めないときに出す文言
export const WEB_ERRORS = {
  invalidUrl: "URL の形ではありません。https:// で始まる URL を入れてください",
  blockedUrl: "この URL は読めません（https のページだけ読めます）",
  notFound: "ページが見つかりませんでした",
  notHtml: "Web ページではないため読めません（PDF や画像などは読めません）",
  tooLarge: "ページが大きすぎて読めません",
  tooMany: "読み込みが続いたので、少し待ってからもう一度試してください",
  fetchFailed:
    "ページを取得できませんでした。時間をおいてもう一度試してください",
  noBody:
    "本文が見つかりませんでした（JS で中身を作るページや、ログインが要るページは読めません）",
} as const;

// これより短ければ本文が取れなかったとみなす。JS で中身を作るページは「読み込み中」などしか残らないため
const MIN_BODY_CHARS = 100;

// 本文ではない部分。サイトのメニュー・横の欄・フッター・入力欄など
const NOISE = "nav, aside, footer, form, dialog, [role=navigation]";

// 本棚で同じページか見分ける URL。ページ内の位置（# 以降）は除く
export function pageKeyUrl(input: string): string {
  const url = new URL(input);
  url.hash = "";
  return url.href;
}

// Content-Type か meta の charset に従って読む。どちらも無ければ UTF-8 か Shift_JIS とみなす
export function decodePage(bytes: Uint8Array, contentType: string): string {
  const head = new TextDecoder().decode(bytes.subarray(0, 4096));
  const charset =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ??
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  if (charset) {
    try {
      return new TextDecoder(charset).decode(bytes);
    } catch {
      // TextDecoder が知らない charset なら、下で読み直す
    }
  }
  return decodeText(bytes);
}

// ページの HTML から題名・著者・本文を取り出す。本文は article・main を優先する
// shortcut: 決め打ちの要素で本文を探すだけ。外れるサイトが多ければ Mozilla の Readability に替える
export function parsePage(html: string, url: string): AozoraText {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title =
    meta(doc, "og:title") || doc.title.trim() || new URL(url).hostname;
  const author = meta(doc, "author");

  doc.querySelectorAll(NOISE).forEach((el) => el.remove());
  const main = doc.querySelector("article, main, [role=main]");
  if (main) doc.body.replaceChildren(main);
  else doc.querySelectorAll("header").forEach((el) => el.remove());

  const { body, codeBlocks } = extractText(doc);
  if (body.length < MIN_BODY_CHARS) throw new Error(WEB_ERRORS.noBody);
  return { title, author, body, codeBlocks };
}

function meta(doc: Document, name: string): string {
  const el = doc.querySelector(
    `meta[property="${name}"], meta[name="${name}"]`,
  );
  return el?.getAttribute("content")?.trim() ?? "";
}
