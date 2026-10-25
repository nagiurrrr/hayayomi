import { useState, type FormEvent } from "react";
import LinkIcon from "@mui/icons-material/Link";
import { Box, Button, TextField } from "@mui/material";
import { parseArticleUrl, type ArticleRef } from "./article";
import { WEB_ERRORS } from "./web";

type Props = {
  onRead: (ref: ArticleRef) => void;
  // Zenn・Qiita・note 以外の Web ページ
  onReadPage: (url: string) => void;
  onError: (message: string) => void;
  // 記事を取りに行っている間は true
  loading: boolean;
};

// 記事の URL を入れて読む
export function ArticleForm({ onRead, onReadPage, onError, loading }: Props) {
  const [url, setUrl] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ref = parseArticleUrl(url);
    if (ref) {
      onRead(ref);
      return;
    }
    if (!URL.canParse(url.trim())) {
      onError(WEB_ERRORS.invalidUrl);
      return;
    }
    onReadPage(url.trim());
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: "flex", gap: 1 }}
    >
      <TextField
        size="small"
        fullWidth
        placeholder="記事・Web ページの URL"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        slotProps={{ htmlInput: { inputMode: "url" } }}
      />
      <Button
        type="submit"
        variant="contained"
        disabled={loading || url.trim() === ""}
        startIcon={<LinkIcon />}
        sx={{ flexShrink: 0 }}
      >
        {loading ? "読み込み中" : "読む"}
      </Button>
    </Box>
  );
}
