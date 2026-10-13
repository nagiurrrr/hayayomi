import type { TextRange } from "./aozora";

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
  "section",
  "table",
  "tr",
  "ul",
]);

// 文字を取り出さない要素。rt / rp はルビの読み。埋め込み・数式・記事の目次も飛ばす
const SKIP_TAGS = new Set([
  "button",
  "embed-katex",
  "head",
  "iframe",
  "math",
  "noscript",
  "rp",
  "rt",
  "script",
  "style",
  "svg",
  "table-of-contents",
  "template",
  "title",
]);

// 数式（KaTeX など）を入れる要素の class
const MATH_CLASS = /(^|\s)(math|katex)(\s|$)/;

// Node.TEXT_NODE などと同じ値。DOM の型に頼らず比べる
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

export type ExtractedText = {
  body: string;
  codeBlocks: TextRange[];
};

// 文字の断片か、コードブロックの中身
type Part = string | { code: string };

// 名前空間の接頭辞（dc:title など）の有無によらず、要素名で探す
export function findAll(doc: Document, name: string): Element[] {
  return Array.from(doc.querySelectorAll("*")).filter(
    (el) => localName(el) === name,
  );
}

function localName(el: Element): string {
  return (el.localName ?? el.tagName).toLowerCase().replace(/^.*:/, "");
}

// HTML から本文を段落ごとの行にして取り出す。pre はコードブロックとして、改行や字下げを残す
export function extractText(doc: Document): ExtractedText {
  const parts: Part[] = [];
  const root = findAll(doc, "body")[0] ?? doc.documentElement;
  if (root) walk(root, parts);

  const paragraphs: { text: string; code: boolean }[] = [];
  let buffer = "";
  const flush = () => {
    for (const line of buffer.split("\n")) {
      const text = line.trim();
      if (text !== "") paragraphs.push({ text, code: false });
    }
    buffer = "";
  };
  for (const part of parts) {
    if (typeof part === "string") {
      buffer += part;
      continue;
    }
    flush();
    const code = part.code.replace(/^\n+/, "").trimEnd();
    if (code !== "") paragraphs.push({ text: code, code: true });
  }
  flush();

  return joinTexts(
    paragraphs.map(({ text, code }) => ({
      body: text,
      codeBlocks: code ? [{ start: 0, end: text.length }] : [],
    })),
  );
}

// 取り出した本文を改行でつなぐ。コードブロックの位置もつないだ後の位置にずらす
export function joinTexts(texts: ExtractedText[]): ExtractedText {
  let body = "";
  const codeBlocks: TextRange[] = [];
  for (const text of texts) {
    if (text.body === "") continue;
    if (body !== "") body += "\n";
    const offset = body.length;
    for (const { start, end } of text.codeBlocks) {
      codeBlocks.push({ start: start + offset, end: end + offset });
    }
    body += text.body;
  }
  return { body, codeBlocks };
}

function walk(node: Node, parts: Part[]) {
  if (node.nodeType === TEXT_NODE) {
    // ソース上の改行と字下げは本文ではないので詰める
    parts.push(
      (node.nodeValue ?? "").replace(/\s*\n\s*/g, "").replace(/\t/g, " "),
    );
    return;
  }
  if (node.nodeType !== ELEMENT_NODE) return;
  const el = node as Element;
  const name = localName(el);
  if (SKIP_TAGS.has(name) || isHidden(el)) return;
  if (name === "br") {
    parts.push("\n");
    return;
  }
  if (name === "pre") {
    parts.push({ code: el.textContent ?? "" });
    return;
  }
  const block = BLOCK_TAGS.has(name);
  if (block) parts.push("\n");
  el.childNodes.forEach((child) => walk(child, parts));
  if (block) parts.push("\n");
}

// 画面に出ない要素（埋め込みの代わりのリンクなど）と数式
function isHidden(el: Element): boolean {
  if (el.hasAttribute("hidden")) return true;
  if (el.getAttribute("aria-hidden") === "true") return true;
  const style = (el.getAttribute("style") ?? "").replace(/\s/g, "");
  if (style.includes("display:none")) return true;
  return MATH_CLASS.test(el.getAttribute("class") ?? "");
}
