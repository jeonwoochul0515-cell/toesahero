import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    // 한 덩어리 1MB짜리 번들은 첫 화면을 늦춘다. 자주 안 바뀌는 것부터 떼어
    // 캐시가 유지되게 나눈다(2026-09-06 검색 최적화 점검).
    //
    // ⚠ 라이브러리를 잘게 쪼개면 덩어리끼리 서로를 참조하는 고리가 생겨
    // 아직 초기화되지 않은 값을 읽다가 스크립트 전체가 죽는다. 그러면 화면이
    // 통째로 비어 버린다(2026-09-07 홈 화면 공백 사고 — firebase 를 auth·
    // firestore·storage·core 넷으로, scheduler 를 react 와 따로 두었던 것이 원인).
    // 한 패키지 묶음은 반드시 한 덩어리에 함께 둔다.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            // 칼럼 본문 데이터는 블로그에서만 쓰인다
            if (id.includes("src/generated/posts")) return "posts";
            return undefined;
          }
          // firebase 는 내부 패키지끼리 촘촘히 얽혀 있어 쪼갤 수 없다
          if (id.includes("firebase")) return "firebase";
          // react-dom 은 scheduler 를 함께 쓴다. 반드시 같은 덩어리에
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("/use-sync-external-store/")
          )
            return "react";
          return "vendor";
        },
      },
    },
  },
});
