import { Outlet, useLocation, useNavigate } from "react-router";
import HomeIcon from "@mui/icons-material/Home";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Paper,
} from "@mui/material";

// ホームと本棚を、画面の下のタブで切り替える
export function TabsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {/* 下のタブに隠れないよう、その高さぶん空ける */}
      <Box sx={{ pb: 7 }}>
        <Outlet />
      </Box>
      <Paper
        elevation={3}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          // iPhone の下端のバーに重ならないようにする
          pb: "env(safe-area-inset-bottom)",
        }}
      >
        <BottomNavigation
          showLabels
          value={location.pathname}
          // 端末の戻る操作でタブを行き来できるよう、履歴に積む
          onChange={(_, path: string) => navigate(path)}
        >
          <BottomNavigationAction
            label="ホーム"
            value="/"
            icon={<HomeIcon />}
          />
          <BottomNavigationAction
            label="本棚"
            value="/shelf"
            icon={<LocalLibraryIcon />}
          />
        </BottomNavigation>
      </Paper>
    </>
  );
}
