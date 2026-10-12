import { unzipSync } from "fflate";
import type { AozoraText } from "./aozora";

// 段落として前後で行を分ける要素
const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tr",
  "ul",
]);

// Node.TEXT_NODE などと同じ値。DOM の型に頼らず比べる
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

// 文字を取り出さない要素。rt / rp はルビの読み
const SKIP_TAGS = new Set(["head", "rp", "rt", "script", "style", "title"]);

// EPUB（zip に入った XHTML）から題名・著者・本文を取り出す
export function parseEpub(bytes: Uint8Array): AozoraText {
  const files = unzipSync(bytes);
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

  const body = pages
    .map((path) => extractText(parseXhtml(read(path))))
    .filter((text) => text !== "")
    .join("\n");
  if (body === "") throw new Error("EPUB から本文を取り出せませんでした");

  return { title, author, body };
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

// 名前空間の接頭辞（dc:title など）の有無によらず、要素名で探す
function findAll(doc: Document, name: string): Element[] {
  return Array.from(doc.querySelectorAll("*")).filter(
    (el) => localName(el) === name,
  );
}

function localName(el: Element): string {
  return (el.localName ?? el.tagName).toLowerCase().replace(/^.*:/, "");
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

function extractText(doc: Document): string {
  const parts: string[] = [];
  const root = findAll(doc, "body")[0] ?? doc.documentElement;
  if (root) walk(root, parts);
  return parts
    .join("")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join("\n");
}

function walk(node: Node, parts: string[]) {
  if (node.nodeType === TEXT_NODE) {
    // ソース上の改行と字下げは本文ではないので詰める
    parts.push(
      (node.nodeValue ?? "").replace(/\s*\n\s*/g, "").replace(/\t/g, " "),
    );
    return;
  }
  if (node.nodeType !== ELEMENT_NODE) return;
  const name = localName(node as Element);
  if (SKIP_TAGS.has(name)) return;
  if (name === "br") {
    parts.push("\n");
    return;
  }
  const block = BLOCK_TAGS.has(name);
  if (block) parts.push("\n");
  node.childNodes.forEach((child) => walk(child, parts));
  if (block) parts.push("\n");
}
