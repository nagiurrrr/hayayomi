import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Link,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'
import type { Ranking, RankingBook } from '../../../shared/api'
import { fetchRanking } from './api'

type Props = {
  onRead: (book: RankingBook) => void
  // 取り込み中の作品。その間はボタンを押せなくする
  reading: RankingBook | null
}

// 青空文庫のアクセスランキング上位の作品を並べる
export function RecommendedList({ onRead, reading }: Props) {
  const [ranking, setRanking] = useState<Ranking | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRanking()
      .then(setRanking)
      .catch(() => setError('おすすめを取得できませんでした'))
  }, [])

  if (error) return <Alert severity="warning">{error}</Alert>
  if (!ranking) return <CircularProgress sx={{ display: 'block', mx: 'auto' }} />

  return (
    <section>
      <Typography variant="h6" component="h2">
        おすすめ
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <Link href={ranking.sourceUrl} target="_blank" rel="noopener">
          青空文庫 {ranking.year}年 アクセスランキング
        </Link>
        より
      </Typography>
      <List>
        {ranking.books.map((book) => (
          <ListItem
            key={`${book.personId}/${book.workId}`}
            divider
            disableGutters
            secondaryAction={
              <Button
                size="small"
                disabled={reading !== null}
                onClick={() => onRead(book)}
              >
                {reading === book ? '読み込み中' : '読む'}
              </Button>
            }
          >
            <Typography color="text.secondary" sx={{ minWidth: '2.5em' }}>
              {book.rank}
            </Typography>
            <ListItemText
              primary={
                book.subtitle ? `${book.title}　${book.subtitle}` : book.title
              }
              secondary={book.author}
              sx={{ pr: 12 }}
            />
          </ListItem>
        ))}
      </List>
    </section>
  )
}
