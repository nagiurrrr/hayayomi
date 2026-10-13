import type { ArticleSite } from "../../../shared/api";
import type { AozoraText } from "./aozora";
import { extractText } from "./html";

export type ArticleRef = { site: ArticleSite; id: string };

// 記事のページの URL の形
const ARTICLE_URLS: { site: ArticleSite; host: string; path: RegExp }[] = [
  // https://zenn.dev/{ユーザー}/articles/{slug}
  { site: "zenn", host: "zenn.dev", path: /^\/[\w-]+\/articles\/([\w-]+)\/?$/ },
  // https://qiita.com/{ユーザー}/items/{記事ID}
  {
    site: "qiita",
    host: "qiita.com",
    path: /^\/[\w-]+\/items\/([0-9a-f]+)\/?$/,
  },
  // https://note.com/{ユーザー}/n/{記事のキー}
  { site: "note", host: "note.com", path: /^\/[\w-]+\/n\/(n[0-9a-f]+)\/?$/ },
];

// 記事の URL から、サイトと記事の ID を取り出す。対応していない URL なら null
export function parseArticleUrl(input: string): ArticleRef | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  for (const { site, host, path } of ARTICLE_URLS) {
    if (url.hostname !== host) continue;
    const match = path.exec(url.pathname);
    if (match) return { site, id: match[1] };
  }
  return null;
}

// 各サイトの API が返す JSON のうち、使うところだけ
type ZennArticle = {
  article: { title: string; body_html: string; user: { name: string } };
};
type QiitaItem = {
  title: string;
  rendered_body: string;
  user: { id: string; name: string };
};
// 有料記事は無料の部分だけが入る。全部が有料なら body は null
type NoteNote = {
  data: { name: string; body: string | null; user: { nickname: string } };
};

// 記事の JSON から題名・著者・本文を取り出す
export function parseArticle(site: ArticleSite, json: unknown): AozoraText {
  switch (site) {
    case "zenn": {
      const { article } = json as ZennArticle;
      return fromHtml(article.title, article.user.name, article.body_html);
    }
    case "qiita": {
      const item = json as QiitaItem;
      return fromHtml(
        item.title,
        item.user.name || item.user.id,
        item.rendered_body,
      );
    }
    case "note": {
      const { data } = json as NoteNote;
      return fromHtml(data.name, data.user.nickname, data.body ?? "");
    }
  }
}

function fromHtml(title: string, author: string, html: string): AozoraText {
  // 本文は body の中身だけの HTML なので、DOM の実装によらず body に入るよう包む
  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><body>${html}</body></html>`,
    "text/html",
  );
  const { body, codeBlocks } = extractText(doc);
  if (body === "") throw new Error("記事から本文を取り出せませんでした");
  return { title, author, body, codeBlocks };
}
