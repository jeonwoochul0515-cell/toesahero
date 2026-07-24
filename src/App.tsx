// 앱 라우트 정의 — vite-react-ssg 프리렌더용 RouteRecord 배열
import { lazy, Suspense } from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { RouteRecord } from "vite-react-ssg";
import { Home } from "./Home";
import { CalcPage } from "./pages/CalcPage";
import { UnemploymentCalcPage } from "./pages/UnemploymentCalcPage";
import { ResignationLetterPage } from "./pages/ResignationLetterPage";
import { DiagnosePage } from "./pages/DiagnosePage";
import { SegmentLandingPage } from "./pages/SegmentLandingPage";
import { ForeignWorkerPage } from "./pages/ForeignWorkerPage";
import { FAQPage } from "./pages/FAQPage";
import { NotFound } from "./pages/NotFound";
import { AdminAuthProvider } from "./admin/AdminAuthContext";

// my/checkout은 프리렌더 대상이 아니고(main.tsx의 includedRoutes 참고), blog는 react-markdown 의존성이 무거워
// 홈/FAQ/계산기 방문자 대다수와 무관한 코드를 메인 번들에서 분리해 지연 로드한다.
const MyPage = lazy(() =>
  import("./pages/MyPage").then((m) => ({ default: m.MyPage }))
);
const CheckoutPage = lazy(() =>
  import("./pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage }))
);
const BlogList = lazy(() =>
  import("./pages/BlogList").then((m) => ({ default: m.BlogList }))
);
const BlogPost = lazy(() =>
  import("./pages/BlogPost").then((m) => ({ default: m.BlogPost }))
);
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

// 모든 라우트를 감싸는 루트 레이아웃 — lazy chunk 로딩 경계
function RootLayout() {
  return (
    <Suspense fallback={null}>
      <Outlet />
    </Suspense>
  );
}

// admin/* 전용 — 인증 컨텍스트를 admin 라우트에만 마운트해 일반 방문자는 Firebase Auth 초기화를 겪지 않게 한다.
function AdminAuthLayout() {
  return (
    <AdminAuthProvider>
      <Outlet />
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
      { path: "unemployment-calc", element: <UnemploymentCalcPage /> },
      { path: "resignation-letter", element: <ResignationLetterPage /> },
      { path: "diagnose", element: <DiagnosePage /> },
      { path: "harassment", element: <SegmentLandingPage seg="harassment" /> },
      {
        path: "small-business",
        element: <SegmentLandingPage seg="small-business" />,
      },
      {
        path: "unfair-dismissal",
        element: <SegmentLandingPage seg="unfair-dismissal" />,
      },
      {
        path: "unpaid-wages",
        element: <SegmentLandingPage seg="unpaid-wages" />,
      },
      {
        path: "severance-pay",
        element: <SegmentLandingPage seg="severance-pay" />,
      },
      { path: "foreign-workers", element: <ForeignWorkerPage /> },
      { path: "checkout/:id", element: <CheckoutPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "terms", element: <Navigate to="/terms.html" replace /> },
      { path: "privacy", element: <Navigate to="/privacy.html" replace /> },
      { path: "blog", element: <BlogList /> },
      { path: "blog/:slug", element: <BlogPost /> },
      { path: "faq", element: <FAQPage /> },
      {
        element: <AdminAuthLayout />,
        children: [
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
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
];
