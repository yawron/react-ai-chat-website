import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState {
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "theme-storage",
    },
  ),
);

// 初始化主题函数
export const initializeTheme = () => {
  const state = useThemeStore.getState();
  // 这里可以添加额外的主题初始化逻辑，例如根据系统主题设置
  if (!localStorage.getItem("theme-storage")) {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    state.setTheme(isDark ? "dark" : "light");
  }
};
