import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { WifiOff } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ActivitySidebar } from "./ActivitySidebar";
import { TopBar } from "./TopBar";
import { isOffline, onOfflineChange } from "@/api/client";
import { useProcessingSocket } from "@/hooks/useProcessingSocket";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUploadStore } from "@/stores/uploadStore";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { ShortcutsDialog } from "@/components/ui/ShortcutsDialog";
import { Toaster } from "@/components/ui/Toaster";
import { GlobalDropOverlay } from "@/components/upload/GlobalDropOverlay";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

export function AppLayout() {
  const [offline, setOffline] = useState(isOffline());
  const applyEvent = useUploadStore((s) => s.applyEvent);

  useProcessingSocket(applyEvent);
  useKeyboardShortcuts();

  useEffect(() => onOfflineChange(setOffline), []);

  return (
    <div className="flex h-full">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        {offline && (
          <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-5 py-1.5 text-caption text-amber-600 dark:text-amber-300">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            Backend unreachable — showing demo data. Check that Tailscale is
            connected and the API is running.
          </div>
        )}
        {/* min-h-0 stops flex-1 from growing past the viewport so children scroll internally */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <ActivitySidebar />

      <CommandPalette />
      <ShortcutsDialog />
      <GlobalDropOverlay />
      <OnboardingTour />
      <Toaster />
    </div>
  );
}
