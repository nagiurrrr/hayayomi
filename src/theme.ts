import { createTheme } from '@mui/material'

// 端末の設定に合わせてライト / ダークを切り替える
export const theme = createTheme({
  cssVariables: true,
  colorSchemes: { dark: true },
  typography: {
    fontFamily: "system-ui, 'Hiragino Sans', 'Yu Gothic UI', sans-serif",
  },
})
