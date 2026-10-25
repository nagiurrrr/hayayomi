import { unzipSync, type UnzipFileInfo } from "fflate";

// 展開した後の大きさの上限。青空文庫の作品は大きくても数 MB、EPUB も画像を除けば収まる
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;

// 展開すると巨大になる zip（zip bomb）でタブが落ちないよう、展開前に大きさを確かめる。
// fflate は zip に書かれた大きさの分だけ場所を取るので、書かれた大きさを足していけば足りる
export function unzipLimited(
  bytes: Uint8Array,
  filter: (entry: UnzipFileInfo) => boolean = () => true,
): Record<string, Uint8Array> {
  let total = 0;
  return unzipSync(bytes, {
    filter: (entry) => {
      if (!filter(entry)) return false;
      total += entry.originalSize;
      if (total > MAX_TOTAL_SIZE) {
        throw new Error("zip の中身が大きすぎるため読み込めません");
      }
      return true;
    },
  });
}
