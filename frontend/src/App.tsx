import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Library } from "@/pages/Library";
import { DocumentDetail } from "@/pages/DocumentDetail";
import { AIChat } from "@/pages/AIChat";
import { CloudTopology } from "@/pages/CloudTopology";
import { ActivityPage } from "@/pages/Activity";
import { Costs } from "@/pages/Costs";
import { Compare } from "@/pages/Compare";
import { Settings } from "@/pages/Settings";
import { NotFound } from "@/pages/NotFound";
import { useAuthStore } from "@/stores/authStore";

function RequireAuth() {
  const session = useAuthStore((s) => s.session);
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/library" element={<Library />} />
          <Route path="/archive" element={<Library archived />} />
          <Route path="/documents/:id" element={<DocumentDetail />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/chat" element={<AIChat />} />
          <Route path="/clouds" element={<CloudTopology />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/costs" element={<Costs />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
