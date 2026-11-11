import { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import type { AozoraText } from "../import/aozora";
import type { Phrase } from "./phrases";

type Props = {
  book: AozoraText;
  // 速読で見ていた文節。ハイライトして、そこまでスクロールする
  current?: Phrase;
  // 本文をダブルタップした所が本文の何文字目か
  onPick?: (position: number) => void;
};

const markSx = {
  bgcolor: "warning.main",
  color: "warning.contrastText",
  borderRadius: 0.5,
} as const;

// 本文を全文表示する。文節ごとに要素を分けると重いので、今の文節の前・今・後の 3 つに分けて描く
export function TextView({ book, current, onPick }: Props) {
  const markRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLElement>(null);

  function handleDoubleClick(e: React.MouseEvent) {
    const caret = caretAt(e.clientX, e.clientY);
    const body = bodyRef.current;
    if (!caret || !body?.contains(caret.node)) return;
    // ダブルクリックで選ばれた語を外す
    window.getSelection()?.removeAllRanges();
    const range = document.createRange();
    range.setStart(body, 0);
    range.setEnd(caret.node, caret.offset);
    onPick?.(range.toString().length);
  }

  useEffect(() => {
    markRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const start = current?.start ?? 0;
  const end = current?.end ?? 0;

  return (
    <Box component="article">
      <Typography variant="h5" component="h1">
        {book.title}
      </Typography>
      {book.author && (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {book.author}
        </Typography>
      )}
      <Typography
        ref={bodyRef}
        onDoubleClick={handleDoubleClick}
        sx={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}
      >
        {current ? (
          <>
            {book.body.slice(0, start)}
            <Box component="mark" ref={markRef} sx={markSx}>
              {book.body.slice(start, end)}
            </Box>
            {book.body.slice(end)}
          </>
        ) : (
          book.body
        )}
      </Typography>
    </Box>
  );
}

// 画面上の位置にある文字。caretPositionFromPoint の無いブラウザ（古い Safari など）は caretRangeFromPoint を使う
function caretAt(x: number, y: number) {
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    return pos && { node: pos.offsetNode, offset: pos.offset };
  }
  const range = document.caretRangeFromPoint?.(x, y);
  return range && { node: range.startContainer, offset: range.startOffset };
}
