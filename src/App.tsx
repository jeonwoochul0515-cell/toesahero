// 앱 라우트 정의 — vite-react-ssg 프리렌더용 RouteRecord 배열
import { lazy, Suspense } from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { RouteRecord } from "vite-react-ssg";
import { Home } from "./Home";
import { MyPage } from "./pages/MyPage";
import { CalcPage } from "./pages/CalcPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { DiagnosePage } from "./pages/DiagnosePage";
import { SegmentLandingPage } from "./pages/SegmentLandingPage";
import { ForeignWorkerPage } from "./pages/ForeignWorkerPage";
import { BlogList } from "./pages/BlogList";
import { BlogPost } from "./pages/BlogPost";
import { FAQPage } from "./pages/FAQPage";
import { NotFound } from "./pages/NotFound";
import { AdminAuthProvider } from "./admin/AdminAuthContext";

// admin/* 라우트는 프리렌더 대상이 아니고(main.tsx의 includedRoutes 참고) 방문자 대다수와 무관하므로
// 메인 번들에서 분리해 지연 로드한다 — 방문자용 홈/블로그/FAQ 초기 로드 용량을 줄이기 위함.
const AdminLogin = lazy(() =>
  import("./admin/AdminLogin").then((m) => ({ default: m.AdminLogin }))
);
const RequireAdmin = lazy(() =>
  import("./admin/RequireAdmin").then((m) => ({ default: m.RequireAdmin }))
);
const AdminLayout = lazy(() =>
  import("./admin/AdminLayout").then((m) => ({ default: m.AdminLayout }))
);
const AdminDashboard = lazy(() =>
  import("./admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard }))
);
const ConsultationsList = lazy(() =>
  import("./admin/ConsultationsList").then((m) => ({
    default: m.ConsultationsList,
  }))
);
const ConsultationDetail = lazy(() =>
  import("./admin/ConsultationDetail").then((m) => ({
    default: m.ConsultationDetail,
  }))
);
const OrdersAdmin = lazy(() =>
  import("./admin/OrdersAdmin").then((m) => ({ default: m.OrdersAdmin }))
);
const StatsAdmin = lazy(() =>
  import("./admin/StatsAdmin").then((m) => ({ default: m.StatsAdmin }))
);
const ChatLogs = lazy(() =>
  import("./admin/ChatLogs").then((m) => ({ default: m.ChatLogs }))
);
const PrintLetter = lazy(() =>
  import("./admin/PrintLetter").then((m) => ({ default: m.PrintLetter }))
);
const Kanban = lazy(() =>
  import("./admin/Kanban").then((m) => ({ default: m.Kanban }))
);
const ReviewsAdmin = lazy(() =>
  import("./admin/ReviewsAdmin").then((m) => ({ default: m.ReviewsAdmin }))
);
const BlogAdmin = lazy(() =>
  import("./admin/BlogAdmin").then((m) => ({ default: m.BlogAdmin }))
);

// 모든 라우트를 감싸는 루트 레이아웃 — 인증 컨텍스트 제공 + admin lazy chunk 로딩 경계
function RootLayout() {
  return (
    <AdminAuthProvider>
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </AdminAuthProvider>
  );
}

export const routes: RouteRecord[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "my", element: <MyPage /> },
      { path: "calc", element: <CalcPage /> },
      { path: "diagnose", element: <DiagnosePage /> },
      { path: "harassment", element: <SegmentLandingPage seg="harassment" /> },
      {
        path: "small-business",
        element: <SegmentLandingPage seg="small-business" />,
      },
      { path: "foreign-workers", element: <ForeignWorkerPage /> },
      { path: "checkout/:id", element: <CheckoutPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "terms", element: <Navigate to="/terms.html" replace /> },
      { path: "privacy", element: <Navigate to="/privacy.html" replace /> },
      { path: "blog", element: <BlogList /> },
      { path: "blog/:slug", element: <BlogPost /> },
      { path: "faq", element: <FAQPage /> },
      { path: "admin/login", element: <AdminLogin /> },
      {
        path: "admin/consultations/:id/print",
        element: (
          <RequireAdmin>
            <PrintLetter />
          </RequireAdmin>
        ),
      },
      {
        path: "admin",
        element: (
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        ),
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: "consultations", element: <ConsultationsList /> },
          { path: "consultations/:id", element: <ConsultationDetail /> },
          { path: "orders", element: <OrdersAdmin /> },
          { path: "stats", element: <StatsAdmin /> },
          { path: "kanban", element: <Kanban /> },
          { path: "reviews", element: <ReviewsAdmin /> },
          { path: "blog", element: <BlogAdmin /> },
          { path: "chats", element: <ChatLogs /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
];
