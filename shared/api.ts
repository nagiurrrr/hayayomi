// Worker（worker/）が返し、画面（src/）が受け取るデータの形

export type RankingBook = {
  rank: number
  title: string
  subtitle: string
  author: string
  // 図書カードの URL（cards/000148/card773.html）の 000148 と 773
  personId: string
  workId: string
}

// GET /ranking
export type Ranking = {
  // 元にした年間アクセスランキングの年と URL
  year: number
  sourceUrl: string
  books: RankingBook[]
}

// GET /books/:personId/:workId/text は「テキストファイル(ルビあり)」の zip をそのまま返す
export function bookTextPath(book: Pick<RankingBook, 'personId' | 'workId'>) {
  return `/books/${book.personId}/${book.workId}/text`
}
