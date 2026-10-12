import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArticleIcon from '@mui/icons-material/Article'
import SpeedIcon from '@mui/icons-material/Speed'
import { Box, Button, Container } from '@mui/material'
import type { AozoraText } from '../import/aozora'
import { splitPhrases } from './phrases'
import { RsvpView } from './RsvpView'
import { TextView } from './TextView'
import { useRsvp } from './useRsvp'

type Props = {
  book: AozoraText | null
}

// 本を読む画面。速読と全文表示を切り替えられる
export function ReaderPage({ book }: Props) {
  const navigate = useNavigate()
  const [showFullText, setShowFullText] = useState(false)
  const phrases = useMemo(() => (book ? splitPhrases(book.body) : []), [book])
  const rsvp = useRsvp(phrases)

  function toggleFullText() {
    rsvp.pause()
    setShowFullText(!showFullText)
  }

  // 本はまだ保存していないので、再読み込みなどで失ったら一覧に戻す
  if (!book) return <Navigate to="/" replace />

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      {/* 全文表示でスクロールしても押せるよう、上に固定する */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          mb: 1,
          py: 1,
          display: 'flex',
          justifyContent: 'space-between',
          bgcolor: 'background.default',
        }}
      >
        {/* 端末の戻る操作と同じ動きにする */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          一覧に戻る
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={showFullText ? <SpeedIcon /> : <ArticleIcon />}
          onClick={toggleFullText}
        >
          {showFullText ? '速読に戻る' : '全文を見る'}
        </Button>
      </Box>
      {showFullText ? (
        <TextView book={book} current={phrases[rsvp.index]} />
      ) : (
        <RsvpView book={book} phrases={phrases} rsvp={rsvp} />
      )}
    </Container>
  )
}
