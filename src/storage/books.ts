import type { AozoraText } from "../features/import/aozora";
import { db, type BookSource, type ShelfBook } from "./db";

export type { BookSource, ShelfBook };

// 同じものかを見分ける値。手元のファイルには ID が無いので、題名・著者・本文の長さで見分ける
function sourceKey(book: AozoraText, source: BookSource): string {
  switch (source.kind) {
    case "aozora":
      return `aozora:${source.personId}/${source.workId}`;
    case "article":
      return `article:${source.site}:${source.id}`;
    case "file":
      return `file:${book.title}\n${book.author}\n${book.body.length}`;
  }
}

// 開いた本を本棚に入れ、その ID を返す。入っていれば本文を新しくし、読んだ位置は残す
// 新しい本の速さは、最後に読んだ本の速さ（本棚が空なら defaultSpeed）にする
export async function addBook(
  book: AozoraText,
  source: BookSource,
  defaultSpeed: number,
): Promise<number> {
  const key = sourceKey(book, source);
  const now = Date.now();
  const id = await db.transaction("rw", db.books, db.bodies, async () => {
    const found = await db.books.where("key").equals(key).first();
    const last = found ?? (await db.books.orderBy("openedAt").last());
    // 本文が変わっていたら（記事の更新など）、位置が本文の外に出ないようにする
    const position = Math.min(found?.position ?? 0, book.body.length);
    const fields = {
      key,
      title: book.title,
      author: book.author,
      source,
      length: book.body.length,
      position,
      remainingWeight: found?.remainingWeight ?? 0,
      speed: last?.speed ?? defaultSpeed,
      openedAt: now,
    };
    const id = found
      ? (await db.books.update(found.id, fields), found.id)
      : await db.books.add({ ...fields, addedAt: now });
    await db.bodies.put({
      id,
      body: book.body,
      codeBlocks: book.codeBlocks ?? [],
    });
    return id;
  });
  requestPersist();
  return id;
}

// 本棚から本を開く。最後に開いた日時を今にする
export async function openBook(
  id: number,
): Promise<{ shelf: ShelfBook; book: AozoraText } | undefined> {
  return db.transaction("rw", db.books, db.bodies, async () => {
    const shelf = await db.books.get(id);
    const body = await db.bodies.get(id);
    if (!shelf || !body) return undefined;
    const openedAt = Date.now();
    await db.books.update(id, { openedAt });
    return {
      shelf: { ...shelf, openedAt },
      book: {
        title: shelf.title,
        author: shelf.author,
        body: body.body,
        codeBlocks: body.codeBlocks,
      },
    };
  });
}

export async function savePosition(
  id: number,
  progress: Pick<ShelfBook, "position" | "remainingWeight" | "speed">,
): Promise<void> {
  await db.books.update(id, progress);
}

export async function removeBook(id: number): Promise<void> {
  await db.transaction("rw", db.books, db.bodies, async () => {
    await db.books.delete(id);
    await db.bodies.delete(id);
  });
}

// 最後に開いた順
export function listBooks(): Promise<ShelfBook[]> {
  return db.books.orderBy("openedAt").reverse().toArray();
}

// 端末の空きが少ない時などに、ブラウザが勝手に消さないよう頼む。断られても使える
function requestPersist() {
  navigator.storage?.persist?.().catch(() => {});
}
