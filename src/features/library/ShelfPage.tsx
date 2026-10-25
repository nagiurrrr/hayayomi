import { useState } from "react";
import { Link as RouterLink } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import HomeIcon from "@mui/icons-material/Home";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import type { ArticleSite } from "../../../shared/api";
import { formatRemaining } from "../reader/timing";
import { listBooks, removeBook, type ShelfBook } from "../../storage/books";

const SITE_NAMES: Record<ArticleSite, string> = {
  zenn: "Zenn",
  qiita: "Qiita",
  note: "note",
};

// 著者の欄に出す文字。記事・Web ページならサイト名（ドメイン）も添える
function byline(book: ShelfBook): string {
  const { source } = book;
  if (source.kind !== "article" && source.kind !== "web") return book.author;
  const site =
    source.kind === "article"
      ? SITE_NAMES[source.site]
      : new URL(source.url).hostname;
  return book.author ? `${site}・${book.author}` : site;
}

// 本棚に入れた本を、最後に開いた順に並べる
export function ShelfPage() {
  // 本棚が書き換わったら、ひとりでに読み直す
  const books = useLiveQuery(listBooks);
  const [removing, setRemoving] = useState<ShelfBook | null>(null);

  if (!books) return <CircularProgress sx={{ display: "block", mx: "auto" }} />;

  async function handleRemove() {
    if (removing) await removeBook(removing.id);
    setRemoving(null);
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Typography variant="h6" component="h1">
        本棚
      </Typography>

      {books.length === 0 ? (
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            まだ本がありません。開いたものは自動でここに入ります
          </Typography>
          <Button
            component={RouterLink}
            to="/"
            startIcon={<HomeIcon />}
            sx={{ mt: 2 }}
          >
            ホームで読むものを選ぶ
          </Button>
        </Box>
      ) : (
        <List>
          {books.map((book) => {
            const percent =
              book.length === 0
                ? 0
                : Math.round((book.position / book.length) * 100);
            return (
              <ListItem
                key={book.id}
                divider
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label={`${book.title}を本棚から消す`}
                    onClick={() => setRemoving(book)}
                  >
                    <DeleteOutlinedIcon />
                  </IconButton>
                }
              >
                <ListItemButton
                  component={RouterLink}
                  to={`/read/${book.id}`}
                  sx={{ pl: 0 }}
                >
                  <ListItemText
                    primary={book.title || "（題名なし）"}
                    secondary={
                      <>
                        {byline(book)}
                        <LinearProgress
                          variant="determinate"
                          value={percent}
                          sx={{ my: 0.75, borderRadius: 1 }}
                        />
                        {percent}%・残り{" "}
                        {formatRemaining(book.remainingWeight, book.speed)}
                      </>
                    }
                    slotProps={{ secondary: { component: "div" } }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      )}

      <Dialog open={removing !== null} onClose={() => setRemoving(null)}>
        <DialogTitle>「{removing?.title}」を本棚から消しますか？</DialogTitle>
        <DialogActions>
          <Button onClick={() => setRemoving(null)}>やめる</Button>
          <Button color="error" onClick={handleRemove}>
            消す
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
