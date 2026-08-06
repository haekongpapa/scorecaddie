// Next.js App Router의 라우트 세그먼트 로딩 컨벤션 — 루트에 두면 모든 화면 이동에서
// 목적지 페이지(서버 컴포넌트의 auth()/Prisma 조회 등)가 준비되는 동안 자동으로 보임.
// 클릭 이벤트를 직접 잡거나 로딩 상태를 관리할 필요 없이 Next.js가 Suspense 경계로
// 알아서 처리해준다. 스피너 자체는 기존 전체화면 오버레이(PublicDataSyncCard 등)에서
// 쓰던 것과 같은 순수 CSS `animate-spin` 방식이되, 그쪽은 어두운 배경 위 흰색 링이고
// 여기는 배경이 없는 페이지 전체이므로 앱 기본 팔레트(card-bg 트랙 + primary 링)로
// 톤을 맞췄다. (2026-07-30 신규, 재홍님 요청)
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-card-bg border-t-primary"
        role="status"
        aria-label="로딩 중"
      />
    </div>
  );
}
