import { unzipSync } from 'fflate'
import { decodeText, parseAozora, type AozoraText } from './aozora'

export async function importFile(file: File): Promise<AozoraText> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const textBytes = file.name.toLowerCase().endsWith('.zip')
    ? extractTextFromZip(bytes)
    : bytes
  return parseAozora(decodeText(textBytes))
}

function extractTextFromZip(bytes: Uint8Array): Uint8Array {
  const entries = unzipSync(bytes, {
    filter: (entry) => entry.name.toLowerCase().endsWith('.txt'),
  })
  const first = Object.values(entries)[0]
  if (!first) {
    throw new Error('zip の中にテキストファイルが見つかりません')
  }
  return first
}
