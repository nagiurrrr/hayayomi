import { useState, type FormEvent } from "react";
import LinkIcon from "@mui/icons-material/Link";
import { Box, Button, TextField } from "@mui/material";
import { parseArticleUrl, type ArticleRef } from "./article";

type Props = {
  onRead: (ref: ArticleRef) => void;
  onError: (message: string) => void;
  // 記事を取りに行っている間は true
  loading: boolean;
};

// 記事の URL を入れて読む
export function ArticleForm({ onRead, onError, loading }: Props) {
  const [url, setUrl] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ref = parseArticleUrl(url);
    if (!ref) {
      onError(
        "この URL にはまだ対応していません（Zenn・Qiita・note の記事に対応）",
      );
      return;
    }
    onRead(ref);
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
        placeholder="Zenn・Qiita・note の記事の URL"
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
