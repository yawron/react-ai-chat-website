import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Outlet,
} from "react-router-dom";

import App from "@pc/App";
import { LayoutWithSidebar } from "@pc/shared/components/Layout/LayoutWithSidebar";
import { WithPermission } from "@pc/shared/components/WithPermission";
import CreateAccount from "@pc/features/auth/pages/CreateAccount";
import Home from "@pc/features/chat/pages/Home";
import Login from "@pc/features/auth/pages/Login";

// 创建React Router路由
const routeElements = createRoutesFromElements(
  <Route path="/" element={<App />}>
    <Route element={<Outlet />}>
      <Route path="/login" element={<Login />} />
      <Route path="/create-account" element={<CreateAccount />} />
    </Route>
    <Route
      element={
        <WithPermission>
          <LayoutWithSidebar />
        </WithPermission>
      }
    >
      <Route path="/" element={<Home />} />
      <Route path="/:id" element={<Home />} />
    </Route>
  </Route>,
);

const router = createBrowserRouter(routeElements);

export default router;
