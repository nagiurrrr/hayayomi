import type { ArticleSite } from "../../shared/api";

// 各サイトで記事の JSON を返す API。何でも中継すると踏み台になるので、取りに行く先はここに書いたものに限る
// Qiita は公式 API。Zenn・note は非公式で、黙って変わることがある
export const ARTICLE_API_URL: Record<ArticleSite, (id: string) => string> = {
  zenn: (id) => `https://zenn.dev/api/articles/${id}`,
  qiita: (id) => `https://qiita.com/api/v2/items/${id}`,
  note: (id) => `https://note.com/api/v3/notes/${id}`,
};
