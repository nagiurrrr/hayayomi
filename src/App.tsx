import { useState } from 'react'
import { Alert, Box, Container } from '@mui/material'
import type { AozoraText } from './features/import/aozora'
import { ImportButton } from './features/import/ImportButton'
import { TextView } from './features/reader/TextView'

function App() {
  const [book, setBook] = useState<AozoraText | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleImport(imported: AozoraText) {
    setError(null)
    setBook(imported)
  }

  function handleError(message: string) {
    setBook(null)
    setError(message)
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

      {book && (
        <Box sx={{ mt: 2 }}>
          <TextView book={book} />
        </Box>
      )}
    </Container>
  )
}

export default App
