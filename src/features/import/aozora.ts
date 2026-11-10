// 本文の中の範囲（UTF-16 の位置。end の文字は含まない）
export type TextRange = { start: number; end: number };

export type AozoraText = {
  title: string;
  author: string;
  body: string;
  // コードブロックの範囲。速読では飛ばし、全文表示でだけ出す
  codeBlocks?: TextRange[];
};

const SEPARATOR = /^-{10,}$/;
const FOOTER_START = /^底本[：:]/;
// 作品名・副題・著者・訳者などが並ぶ見出しの、行数の上限
const MAX_HEADER_LINES = 10;

// UTF-8 として正しく読めなければ Shift_JIS とみなす
export function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("shift_jis").decode(bytes);
  }
}

export function parseAozora(raw: string): AozoraText {
  // 末尾の改行を残すと、最後の空の行を見出しの終わりと取り違える
  const lines = raw.replace(/\r\n?/g, "\n").trimEnd().split("\n");

  // 冒頭の作品名・著者名（最初の空行まで）。空行が冒頭に無ければ見出しは無いとみなす
  const found = lines.findIndex((line) => line.trim() === "");
  const firstBlank = found > MAX_HEADER_LINES ? -1 : found;
  const header = firstBlank === -1 ? [] : lines.slice(0, firstBlank);
  const title = header[0]?.trim() ?? "";
  const author = header.length >= 2 ? header[header.length - 1].trim() : "";

  // 記号の説明（----- で囲まれた部分）の後ろから本文が始まる
  const separators = lines
    .map((line, i) => (SEPARATOR.test(line.trim()) ? i : -1))
    .filter((i) => i !== -1);
  let start = 0;
  if (separators.length >= 2) {
    start = separators[1] + 1;
  } else if (firstBlank !== -1) {
    start = firstBlank + 1;
  }

  // 末尾の底本情報を除く
  let end = lines.length;
  for (let i = lines.length - 1; i >= start; i--) {
    if (FOOTER_START.test(lines[i])) {
      end = i;
      break;
    }
  }

  const body = lines
    .slice(start, end)
    .map(cleanLine)
    .join("\n")
    .replace(/^\n+|\s+$/g, "");

  return { title, author, body };
}

function cleanLine(line: string): string {
  return (
    line
      // 外字注記は代替文字（〓）に置き換える
      .replace(/※［＃[^］]*］/g, "〓")
      .replace(/［＃[^］]*］/g, "")
      .replace(/《[^》]*》/g, "")
      .replace(/｜/g, "")
  );
}
