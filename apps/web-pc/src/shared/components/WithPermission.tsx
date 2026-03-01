import React from "react";
import { Navigate } from "react-router-dom";

import { useUserStore } from "@pc/store/useUserStore";

interface WithPermissionProps {
  children: React.ReactNode;
  redirectPath?: string;
}

export const WithPermission: React.FC<WithPermissionProps> = ({
  children,
  redirectPath = "/login",
}) => {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};
