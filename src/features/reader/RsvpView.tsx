import { useEffect, useMemo } from "react";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import { Box, Button, Slider, Stack, Typography } from "@mui/material";
import type { AozoraText } from "../import/aozora";
import { nextSentence, prevSentence, type Phrase } from "./phrases";
import {
  formatRemaining,
  MAX_SPEED,
  MIN_SPEED,
  remainingWeights,
} from "./timing";
import type { Rsvp } from "./useRsvp";

const SPEED_STEP = 100;

type Props = {
  book: AozoraText;
  phrases: Phrase[];
  // 全文表示と行き来しても位置が残るよう、再生の状態は呼び出し側が持つ
  rsvp: Rsvp;
};

// タップで再生/停止する領域。押しやすいよう幅いっぱいに取る
const tapAreaSx = {
  userSelect: "none",
  cursor: "pointer",
} as const;

// 文節の表示枠。値を固定して、切り替えのたびにスタイルを計算し直さない
// 縦書きなので、文字の大きさは画面の高さに合わせ、枠の幅は文字 1 列分に余白を足したものにする
const phraseSx = {
  width: "2.5em",
  height: "55vh",
  minHeight: 240,
  mx: "auto",
  display: "flex",
  justifyContent: "center",
  // 書き出しの位置をそろえて、目を動かさずに読めるよう上寄せにする
  alignItems: "flex-start",
  pt: 2,
  overflow: "hidden",
  fontSize: "clamp(1.75rem, 5vh, 3.5rem)",
  borderRadius: 2,
  bgcolor: "action.hover",
} as const;

// 縦書きの要素は幅が中身まで縮むので、枠とは分けて文字だけを縦書きにする
const phraseTextSx = {
  writingMode: "vertical-rl",
  fontWeight: 500,
  whiteSpace: "nowrap",
} as const;

// 文節を一つずつ流して表示する
export function RsvpView({ book, phrases, rsvp }: Props) {
  const { index, playing, speed, setSpeed, toggle, seek } = rsvp;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      e.preventDefault();
      toggle();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggle]);

  const remaining = useMemo(() => remainingWeights(phrases), [phrases]);

  const last = Math.max(phrases.length - 1, 0);
  const percent = last === 0 ? 0 : Math.round((index / last) * 100);

  return (
    <Box>
      <Typography variant="h6" component="h1">
        {book.title}
      </Typography>
      {book.author && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {book.author}
        </Typography>
      )}

      <Box sx={tapAreaSx} onClick={toggle}>
        <Box sx={phraseSx}>
          <Box sx={phraseTextSx}>{phrases[index]?.text ?? ""}</Box>
        </Box>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 2, justifyContent: "center" }}
      >
        <Button
          variant="outlined"
          startIcon={<SkipPreviousIcon />}
          onClick={() => seek(prevSentence(phrases, index))}
        >
          1文戻る
        </Button>
        <Button
          variant="contained"
          startIcon={playing ? <PauseIcon /> : <PlayArrowIcon />}
          onClick={toggle}
          sx={{ minWidth: 96 }}
        >
          {playing ? "停止" : "再生"}
        </Button>
        <Button
          variant="outlined"
          endIcon={<SkipNextIcon />}
          onClick={() => seek(nextSentence(phrases, index))}
        >
          1文進む
        </Button>
      </Stack>

      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="body2" color="text.secondary">
            位置 {percent}%（{index + 1} / {phrases.length}）
          </Typography>
          <Typography variant="body2" color="text.secondary">
            残り {formatRemaining(remaining[index] ?? 0, speed)}
          </Typography>
        </Box>
        <Slider
          value={index}
          min={0}
          max={last}
          onChange={(_, value) => seek(value as number)}
          aria-label="位置"
        />
      </Box>

      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          速さ {speed} 文字/分
        </Typography>
        <Slider
          value={speed}
          min={MIN_SPEED}
          max={MAX_SPEED}
          step={SPEED_STEP}
          marks
          valueLabelDisplay="auto"
          onChange={(_, value) => setSpeed(value as number)}
          aria-label="速さ"
        />
      </Box>
    </Box>
  );
}
