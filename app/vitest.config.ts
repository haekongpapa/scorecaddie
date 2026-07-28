import { defineConfig } from "vitest/config";
import path from "node:path";

// coding-guidelines.md §5 — 단위 테스트는 Vitest, 대상 파일 옆에 *.test.ts로 co-locate.
// tsconfig.json의 "@/*" -> "./src/*" 경로 별칭을 여기서도 동일하게 맞춰준다
// (vite-tsconfig-paths 같은 별도 플러그인 없이 alias를 직접 지정 — 의존성 최소화).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
