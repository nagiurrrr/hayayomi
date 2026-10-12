import { useState } from 'react'
import { Alert, Box, Container } from '@mui/material'
import type { RankingBook } from '../../../shared/api'
import type { AozoraText } from '../import/aozora'
import { ImportButton } from '../import/ImportButton'
import { importBytes } from '../import/importFile'
import { fetchBookText } from './api'
import { RecommendedList } from './RecommendedList'

type Props = {
  onOpen: (book: AozoraText) => void
}

// ファイル選択とおすすめ一覧から、読む本を選ぶ画面
export function HomePage({ onOpen }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState<RankingBook | null>(null)

  async function handleRead(target: RankingBook) {
    setError(null)
    setReading(target)
    try {
      onOpen(importBytes(await fetchBookText(target), true))
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みに失敗しました')
    } finally {
      setReading(null)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          py: 1,
          bgcolor: 'background.default',
        }}
      >
        <ImportButton onImport={onOpen} onError={setError} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 2 }}>
        <RecommendedList onRead={handleRead} reading={reading} />
      </Box>
    </Container>
  )
}
