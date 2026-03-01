import { XProvider } from "@ant-design/x";
import { App as AntdApp, ConfigProvider } from "antd";
import { Outlet } from "react-router-dom";

import "@pc/locales";
import { useLocaleStore } from "@pc/store";
import { ErrorBoundary } from "@pc/shared/components/ErrorBoundary";
import AntdGlobal from "@pc/utils/antdGlobal";

function App() {
  const { antdLocale } = useLocaleStore();

  return (
    <ConfigProvider locale={antdLocale}>
      <AntdApp>
        <AntdGlobal />
        <ErrorBoundary>
          <XProvider>
            <div className="min-h-screen">
              <Outlet />
            </div>
          </XProvider>
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
