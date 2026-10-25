import { decodeText, parseAozora, type AozoraText } from "./aozora";
import { parseEpub } from "./epub";
import { unzipLimited } from "./unzip";

export async function importFile(file: File): Promise<AozoraText> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".epub")) return parseEpub(bytes);
  return importBytes(bytes, name.endsWith(".zip"));
}

// ファイル選択とダウンロードのどちらで得たバイト列も、ここで本文にする
export function importBytes(bytes: Uint8Array, isZip: boolean): AozoraText {
  return parseAozora(decodeText(isZip ? extractTextFromZip(bytes) : bytes));
}

function extractTextFromZip(bytes: Uint8Array): Uint8Array {
  const entries = unzipLimited(bytes, (entry) =>
    entry.name.toLowerCase().endsWith(".txt"),
  );
  const first = Object.values(entries)[0];
  if (!first) {
    throw new Error("zip の中にテキストファイルが見つかりません");
  }
  return first;
}
