import Dexie, { type EntityTable } from "dexie";
import type { ArticleSite } from "../../shared/api";
import type { TextRange } from "../features/import/aozora";

// どこから取り込んだか。同じものを二重に本棚へ入れないための見分けに使う
export type BookSource =
  | { kind: "aozora"; personId: string; workId: string }
  | { kind: "article"; site: ArticleSite; id: string }
  // 手元のファイル（.txt / .zip / .epub）
  | { kind: "file" };

// 本棚の一覧に出す分。本文は重いので bodies に分ける
export type ShelfBook = {
  id: number;
  // 同じものかを見分ける値（sourceKey で作る）
  key: string;
  title: string;
  author: string;
  source: BookSource;
  // 本文の文字数（UTF-16）
  length: number;
  // 読んだ位置。本文の何文字目か（文節の start）。文節の分け方を変えても同じ所から読めるように
  position: number;
  // 読んだ位置から最後までの表示時間の重み（timing.ts の remainingWeights）。残り時間を出すのに使う
  remainingWeight: number;
  // 最後に読んだ速さ（文字/分）
  speed: number;
  addedAt: number;
  openedAt: number;
};

export type BookBody = {
  id: number;
  body: string;
  codeBlocks: TextRange[];
};

export const db = new Dexie("hayayomi") as Dexie & {
  books: EntityTable<ShelfBook, "id">;
  bodies: EntityTable<BookBody, "id">;
};

// 索引を張る項目だけを書く。ほかの項目は書かなくても保存される
db.version(1).stores({
  books: "++id, &key, openedAt",
  bodies: "id",
});
