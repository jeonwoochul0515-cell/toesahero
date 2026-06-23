// 앱 라우트 정의 — vite-react-ssg 프리렌더용 RouteRecord 배열
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
import { BlogAdmin } from "./admin/BlogAdmin";
import { AdminAuthProvider } from "./admin/AdminAuthContext";
import { AdminLogin } from "./admin/AdminLogin";
import { RequireAdmin } from "./admin/RequireAdmin";
import { AdminLayout } from "./admin/AdminLayout";
import { AdminDashboard } from "./admin/AdminDashboard";
import { ConsultationsList } from "./admin/ConsultationsList";
import { ConsultationDetail } from "./admin/ConsultationDetail";
import { OrdersAdmin } from "./admin/OrdersAdmin";
import { StatsAdmin } from "./admin/StatsAdmin";
import { ChatLogs } from "./admin/ChatLogs";
import { PrintLetter } from "./admin/PrintLetter";
import { Kanban } from "./admin/Kanban";
import { ReviewsAdmin } from "./admin/ReviewsAdmin";

// 모든 라우트를 감싸는 루트 레이아웃 — 인증 컨텍스트 제공
function RootLayout() {
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
