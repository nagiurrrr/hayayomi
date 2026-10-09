import type { ChangeEvent } from 'react'
import { Button } from '@mui/material'
import type { AozoraText } from './aozora'
import { importFile } from './importFile'

type Props = {
  onImport: (book: AozoraText) => void
  onError: (message: string) => void
}

export function ImportButton({ onImport, onError }: Props) {
  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      onImport(await importFile(file))
    } catch (e) {
      onError(e instanceof Error ? e.message : '読み込みに失敗しました')
    }
  }

  return (
    <Button variant="outlined" component="label">
      ファイルを選ぶ（.txt / .zip）
      <input type="file" accept=".txt,.zip" hidden onChange={handleChange} />
    </Button>
  )
}
