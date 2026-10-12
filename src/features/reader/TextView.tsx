import { useEffect, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import type { AozoraText } from '../import/aozora'
import type { Phrase } from './phrases'

type Props = {
  book: AozoraText
  // 速読で見ていた文節。ハイライトして、そこまでスクロールする
  current?: Phrase
}

const markSx = {
  bgcolor: 'warning.main',
  color: 'warning.contrastText',
  borderRadius: 0.5,
} as const

// 本文を全文表示する。文節ごとに要素を分けると重いので、今の文節の前・今・後の 3 つに分けて描く
export function TextView({ book, current }: Props) {
  const markRef = useRef<HTMLElement>(null)

  useEffect(() => {
    markRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  const start = current?.start ?? 0
  const end = current ? start + current.text.length : 0

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
      <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.9 }}>
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
  )
}
