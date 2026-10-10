import { useState } from 'react'
import { Alert, Box, Container } from '@mui/material'
import type { RankingBook } from '../shared/api'
import type { AozoraText } from './features/import/aozora'
import { ImportButton } from './features/import/ImportButton'
import { importBytes } from './features/import/importFile'
import { fetchBookText } from './features/library/api'
import { RecommendedList } from './features/library/RecommendedList'
import { TextView } from './features/reader/TextView'

function App() {
  const [book, setBook] = useState<AozoraText | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState<RankingBook | null>(null)

  function handleImport(imported: AozoraText) {
    setError(null)
    setBook(imported)
  }

  function handleError(message: string) {
    setBook(null)
    setError(message)
  }

  async function handleRead(target: RankingBook) {
    setReading(target)
    try {
      handleImport(importBytes(await fetchBookText(target), true))
    } catch (e) {
      handleError(e instanceof Error ? e.message : '読み込みに失敗しました')
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
          py: 1,
          bgcolor: 'background.default',
        }}
      >
        <ImportButton onImport={handleImport} onError={handleError} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 2 }}>
        {book ? (
          <TextView book={book} />
        ) : (
          <RecommendedList onRead={handleRead} reading={reading} />
        )}
      </Box>
    </Container>
  )
}

export default App
