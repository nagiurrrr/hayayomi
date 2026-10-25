// 任意の Web ページの中継で、取りに行ってよい URL か。踏み台にされないよう絞る
export function isAllowedPageUrl(url: URL): boolean {
  if (url.protocol !== "https:" || url.port !== "") return false;
  const host = url.hostname;
  // IPv6 は [..] で、IPv4 は数字とドットだけになる
  if (host.startsWith("[") || /^[\d.]+$/.test(host)) return false;
  return (
    host !== "localhost" && !host.endsWith(".localhost") && host.includes(".")
  );
}

// 決めた大きさを超えたら、そこで流すのをやめる（Content-Length が無いページもあるため）
export function limitSize(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): ReadableStream<Uint8Array> {
  let size = 0;
  return body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        size += chunk.byteLength;
        if (size > maxBytes)
          controller.error(new Error("ページが大きすぎます"));
        else controller.enqueue(chunk);
      },
    }),
  );
}
