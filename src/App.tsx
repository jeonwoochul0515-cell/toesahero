import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./Home";
import { MyPage } from "./pages/MyPage";
import { CalcPage } from "./pages/CalcPage";
import { AdminAuthProvider } from "./admin/AdminAuthContext";
import { AdminLogin } from "./admin/AdminLogin";
import { RequireAdmin } from "./admin/RequireAdmin";
import { AdminLayout } from "./admin/AdminLayout";
import { AdminDashboard } from "./admin/AdminDashboard";
import { ConsultationsList } from "./admin/ConsultationsList";
import { ConsultationDetail } from "./admin/ConsultationDetail";
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
            <Route path="kanban" element={<Kanban />} />
            <Route path="reviews" element={<ReviewsAdmin />} />
            <Route path="chats" element={<ChatLogs />} />
          </Route>
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
