import { Box, Typography } from '@mui/material'
import type { AozoraText } from '../import/aozora'

type Props = {
  book: AozoraText
}

// 本文をそのまま全文表示する
export function TextView({ book }: Props) {
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
        {book.body}
      </Typography>
    </Box>
  )
}
