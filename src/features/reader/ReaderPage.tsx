import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArticleIcon from "@mui/icons-material/Article";
import SpeedIcon from "@mui/icons-material/Speed";
import { Box, Button, CircularProgress, Container } from "@mui/material";
import type { AozoraText } from "../import/aozora";
import { openBook, type ShelfBook } from "../../storage/books";
import { phraseIndexAt, splitPhrases } from "./phrases";
import { RsvpView } from "./RsvpView";
import { TextView } from "./TextView";
import { useRsvp } from "./useRsvp";
import { useSavePosition } from "./useSavePosition";

type Opened = { shelf: ShelfBook; book: AozoraText };

// 本棚の本を開いて読む画面。URL の :id は本棚の ID
export function ReaderPage() {
  const { id } = useParams();
  const [opened, setOpened] = useState<Opened | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    openBook(Number(id))
      .then((result) => {
        if (cancelled) return;
        if (result) setOpened(result);
        else setMissing(true);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 本棚から消した本などは、本棚に戻す
  if (missing) return <Navigate to="/shelf" replace />;
  if (!opened || opened.shelf.id !== Number(id)) {
    return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
  }
  return <Reader key={opened.shelf.id} {...opened} />;
}

// 本を開いた後の画面。速読と全文表示を切り替えられる
function Reader({ shelf, book }: Opened) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showFullText, setShowFullText] = useState(false);
  const phrases = useMemo(
    () => splitPhrases(book.body, book.codeBlocks),
    [book],
  );
  const rsvp = useRsvp(
    phrases,
    phraseIndexAt(phrases, shelf.position),
    shelf.speed,
  );
  useSavePosition(shelf.id, phrases, rsvp);

  function toggleFullText() {
    rsvp.pause();
    setShowFullText(!showFullText);
  }

  // 端末の戻る操作と同じ動きにする。URL を直接開いた時など、戻る先が無ければ本棚へ
  function handleBack() {
    if (location.key === "default") navigate("/shelf", { replace: true });
    else navigate(-1);
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      {/* 全文表示でスクロールしても押せるよう、上に固定する */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          mb: 1,
          py: 1,
          display: "flex",
          justifyContent: "space-between",
          bgcolor: "background.default",
        }}
      >
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          一覧に戻る
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={showFullText ? <SpeedIcon /> : <ArticleIcon />}
          onClick={toggleFullText}
        >
          {showFullText ? "速読に戻る" : "全文を見る"}
        </Button>
      </Box>
      {showFullText ? (
        <TextView book={book} current={phrases[rsvp.index]} />
      ) : (
        <RsvpView book={book} phrases={phrases} rsvp={rsvp} />
      )}
    </Container>
  );
}
