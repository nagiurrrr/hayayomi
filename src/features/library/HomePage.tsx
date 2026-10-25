import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Box, Container, Snackbar, Stack } from "@mui/material";
import type { RankingBook } from "../../../shared/api";
import { ArticleForm } from "../import/ArticleForm";
import { parseArticle, type ArticleRef } from "../import/article";
import type { AozoraText } from "../import/aozora";
import { ImportButton } from "../import/ImportButton";
import { importBytes } from "../import/importFile";
import { decodePage, pageKeyUrl, parsePage } from "../import/web";
import { DEFAULT_SPEED } from "../reader/timing";
import { addBook, type BookSource } from "../../storage/books";
import { fetchArticle, fetchBookText, fetchPage } from "./api";
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

  async function handleReadPage(url: string) {
    setError(null);
    setLoadingArticle(true);
    try {
      const { bytes, contentType } = await fetchPage(url);
      await open(parsePage(decodePage(bytes, contentType), url), {
        kind: "web",
        url: pageKeyUrl(url),
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
          onReadPage={handleReadPage}
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

      {/* 下のタブ（高さ 56px）の上に出す。上に出すと URL の欄に重なり、入れ直せなくなる */}
      <Snackbar
        open={error !== null}
        autoHideDuration={6000}
        onClose={(_, reason) => reason !== "clickaway" && setError(null)}
        sx={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Box sx={{ mt: 2 }}>
        <RecommendedList onRead={handleRead} reading={reading} />
      </Box>
    </Container>
  );
}
