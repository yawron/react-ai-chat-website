import { XProvider } from "@ant-design/x";
import { App as AntdApp, ConfigProvider, theme as antdTheme } from "antd";
import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import "@pc/locales";
import ThemeToggle from "@pc/components/ThemeToggle";
import { useUserStore, useLocaleStore, useThemeStore } from "@pc/store";
import { ErrorBoundary } from "@pc/components/ErrorBoundary";
import AntdGlobal from "@pc/utils/antdGlobal";

function App() {
  const { isAuthenticated, error } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated && error) {
      navigate("/login");
      useUserStore.setState({ error: null });
    }
  }, [isAuthenticated, error, navigate]);

  const { antdLocale } = useLocaleStore();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  // 同步主题到 DOM
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.body.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  const themeConfig = {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorBgContainer: isDark ? "#141414" : undefined,
    },
  };
  return (
    <ConfigProvider locale={antdLocale} theme={themeConfig}>
      <AntdApp>
        <AntdGlobal />
        <ErrorBoundary>
          <XProvider theme={themeConfig}>
            <div className="min-h-screen">
              <Outlet />
              <ThemeToggle />
            </div>
          </XProvider>
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
