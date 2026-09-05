import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Landing } from "@/pages/Landing";
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

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

      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
