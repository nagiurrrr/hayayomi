import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Box, Container, Stack } from "@mui/material";
import type { RankingBook } from "../../../shared/api";
import { ArticleForm } from "../import/ArticleForm";
import { parseArticle, type ArticleRef } from "../import/article";
import type { AozoraText } from "../import/aozora";
import { ImportButton } from "../import/ImportButton";
import { importBytes } from "../import/importFile";
import { DEFAULT_SPEED } from "../reader/timing";
import { addBook, type BookSource } from "../../storage/books";
import { fetchArticle, fetchBookText } from "./api";
import { RecommendedList } from "./RecommendedList";

// ファイル選択・記事の URL・おすすめ一覧から、読むものを選ぶ画面
export function HomePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<RankingBook | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);

  // 開いたものは本棚に入れてから読む画面へ移る
  async function open(book: AozoraText, source: BookSource) {
    const id = await addBook(book, source, DEFAULT_SPEED);
    navigate(`/read/${id}`);
  }

  async function handleRead(target: RankingBook) {
    setError(null);
    setReading(target);
    try {
      await open(importBytes(await fetchBookText(target), true), {
        kind: "aozora",
        personId: target.personId,
        workId: target.workId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setReading(null);
    }
  }

  async function handleReadArticle(ref: ArticleRef) {
    setError(null);
    setLoadingArticle(true);
    try {
      await open(parseArticle(ref.site, await fetchArticle(ref)), {
        kind: "article",
        ...ref,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoadingArticle(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Stack
        spacing={2}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          py: 1,
          bgcolor: "background.default",
        }}
      >
        <ArticleForm
          onRead={handleReadArticle}
          onError={setError}
          loading={loadingArticle}
        />
        {/* Stack の中では横いっぱいに伸びるので、Box で包んでボタンの幅のままにする */}
        <Box>
          <ImportButton
            onImport={(book) => open(book, { kind: "file" })}
            onError={setError}
          />
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 2 }}>
        <RecommendedList onRead={handleRead} reading={reading} />
      </Box>
    </Container>
  );
}
