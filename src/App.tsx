import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./Home";
import { AdminAuthProvider } from "./admin/AdminAuthContext";
import { AdminLogin } from "./admin/AdminLogin";
import { RequireAdmin } from "./admin/RequireAdmin";
import { AdminLayout } from "./admin/AdminLayout";
import { AdminDashboard } from "./admin/AdminDashboard";
import { ConsultationsList } from "./admin/ConsultationsList";
import { ConsultationDetail } from "./admin/ConsultationDetail";
import { ChatLogs } from "./admin/ChatLogs";

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/login" element={<AdminLogin />} />
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
            <Route path="chats" element={<ChatLogs />} />
          </Route>
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
