import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    // 한 덩어리 1MB짜리 번들은 첫 화면을 늦춘다. 자주 안 바뀌는 것부터 떼어
    // 캐시가 유지되게 나눈다(2026-09-06 검색 최적화 점검).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            // 칼럼 본문 데이터는 블로그에서만 쓰인다
            if (id.includes("src/generated/posts")) return "posts";
            return undefined;
          }
          if (id.includes("firebase") || id.includes("@firebase")) return "firebase";
          if (id.includes("react-router")) return "router";
          if (id.includes("react-dom") || id.includes("/react/")) return "react";
          return "vendor";
        },
      },
    },
  },
});
