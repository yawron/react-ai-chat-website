import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Outlet,
} from "react-router-dom";

import App from "@pc/App";
import { LayoutWithSidebar } from "@pc/shared/components/Layout/LayoutWithSidebar";
import { PageTransition } from "@pc/shared/components/PageTransition/PageTransition";
import { WithPermission } from "@pc/shared/components/WithPermission";
import Agents from "@pc/features/agents/pages/Agents";
import CreateAccount from "@pc/features/auth/pages/CreateAccount";
import Home from "@pc/features/chat/pages/Home";
import Login from "@pc/features/auth/pages/Login";
import { SharedChat } from "@pc/features/shared-chat/pages/SharedChat";

// 创建React Router路由
const routeElements = createRoutesFromElements(
  <Route path="/" element={<App />}>
    <Route
      element={
        <PageTransition>
          <Outlet />
        </PageTransition>
      }
    >
      <Route path="/login" element={<Login />} />
      <Route path="/create-account" element={<CreateAccount />} />
      {/* 分享会话路由 - 不需要登录验证 */}
      <Route path="/shared/:shareId" element={<SharedChat />} />
    </Route>
    <Route
      element={
        <WithPermission>
          <LayoutWithSidebar />
        </WithPermission>
      }
    >
      <Route path="/" element={<Home />} />
      <Route path="/conversation" element={<Home />} />
      <Route path="/conversation/:id" element={<Home />} />
      <Route path="/agents" element={<Agents />} />
    </Route>
  </Route>,
);

const router = createBrowserRouter(routeElements);

export default router;
