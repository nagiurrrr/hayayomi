import type { ChangeEvent } from 'react'
import { Button } from '@mui/material'
import type { AozoraText } from './aozora'
import { importFile } from './importFile'

// Android のファイル選択は MIME タイプで絞り込むことがあるので、拡張子と併記する
const ACCEPT = [
  '.txt',
  '.zip',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
].join(',')

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
      <input type="file" accept={ACCEPT} hidden onChange={handleChange} />
    </Button>
  )
}
