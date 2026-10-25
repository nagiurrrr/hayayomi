import type { AozoraText } from "./aozora";
import { extractText, findAll, joinTexts } from "./html";
import { unzipLimited } from "./unzip";

// 本文に使わない画像・音声・動画・フォントは展開しない
const MEDIA_FILE =
  /\.(avif|gif|jpe?g|png|svg|webp|mp3|mp4|m4a|ogg|otf|ttf|woff2?)$/i;

// EPUB（zip に入った XHTML）から題名・著者・本文を取り出す
export function parseEpub(bytes: Uint8Array): AozoraText {
  const files = unzipLimited(bytes, (entry) => !MEDIA_FILE.test(entry.name));
  const read = (path: string): string => {
    const file = files[path];
    if (!file) throw new Error(`EPUB の中に ${path} が見つかりません`);
    return new TextDecoder("utf-8").decode(file);
  };

  const container = parseXml(read("META-INF/container.xml"));
  const opfPath = findAll(container, "rootfile")[0]?.getAttribute("full-path");
  if (!opfPath) throw new Error("EPUB の目録（OPF）が見つかりません");
  const opf = parseXml(read(opfPath));

  const title = findAll(opf, "title")[0]?.textContent?.trim() ?? "";
  const author = findAll(opf, "creator")[0]?.textContent?.trim() ?? "";

  // manifest の id から、zip の中のパスを引けるようにする
  const hrefs = new Map<string, string>();
  for (const item of findAll(opf, "item")) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) hrefs.set(id, resolvePath(opfPath, href));
  }

  // spine の順に並べる。目次などの付録（linear="no"）は飛ばす
  const pages = findAll(opf, "itemref")
    .filter((ref) => ref.getAttribute("linear") !== "no")
    .map((ref) => hrefs.get(ref.getAttribute("idref") ?? ""))
    .filter((path): path is string => path !== undefined);

  const encrypted = encryptedPaths(files);
  if (pages.some((path) => encrypted.has(path))) {
    throw new Error("DRM で保護されているため読み込めません");
  }

  const { body, codeBlocks } = joinTexts(
    pages.map((path) => extractText(parseXhtml(read(path)))),
  );
  if (body === "") throw new Error("EPUB から本文を取り出せませんでした");

  return { title, author, body, codeBlocks };
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}

// XHTML として読めなければ、HTML として読み直す
function parseXhtml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, "application/xhtml+xml");
  if (findAll(doc, "parsererror").length === 0) return doc;
  return new DOMParser().parseFromString(text, "text/html");
}

// OPF からの相対パスを、zip の中のパスにする
function resolvePath(base: string, href: string): string {
  const url = new URL(href, `http://epub/${base}`);
  return decodeURIComponent(url.pathname.slice(1));
}

// encryption.xml に載っている、暗号化されたファイルのパス
// フォントの難読化だけの EPUB もあるので、本文のページが含まれるかで判断する
function encryptedPaths(files: Record<string, Uint8Array>): Set<string> {
  const file = files["META-INF/encryption.xml"];
  if (!file) return new Set();
  const doc = parseXml(new TextDecoder("utf-8").decode(file));
  return new Set(
    findAll(doc, "cipherreference")
      .map((ref) => ref.getAttribute("URI"))
      .filter((uri): uri is string => uri !== null)
      .map((uri) => resolvePath("", uri)),
  );
}
