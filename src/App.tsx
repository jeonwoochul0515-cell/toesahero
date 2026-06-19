import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/my" element={<MyPage />} />
          <Route path="/calc" element={<CalcPage />} />
          <Route path="/diagnose" element={<DiagnosePage />} />
          <Route path="/harassment" element={<SegmentLandingPage seg="harassment" />} />
          <Route path="/small-business" element={<SegmentLandingPage seg="small-business" />} />
          <Route path="/foreign-workers" element={<ForeignWorkerPage />} />
          <Route path="/checkout/:id" element={<CheckoutPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route
            path="/terms"
            element={<Navigate to="/terms.html" replace />}
          />
          <Route
            path="/privacy"
            element={<Navigate to="/privacy.html" replace />}
          />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/consultations/:id/print"
            element={
              <RequireAdmin>
                <PrintLetter />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="consultations" element={<ConsultationsList />} />
            <Route
              path="consultations/:id"
              element={<ConsultationDetail />}
            />
            <Route path="orders" element={<OrdersAdmin />} />
            <Route path="stats" element={<StatsAdmin />} />
            <Route path="kanban" element={<Kanban />} />
            <Route path="reviews" element={<ReviewsAdmin />} />
            <Route path="blog" element={<BlogAdmin />} />
            <Route path="chats" element={<ChatLogs />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
