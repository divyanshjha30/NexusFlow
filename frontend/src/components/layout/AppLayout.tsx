import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ActivitySidebar } from "./ActivitySidebar";
import { TopBar } from "./TopBar";
import { useProcessingSocket } from "@/hooks/useProcessingSocket";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUploadStore } from "@/stores/uploadStore";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { ShortcutsDialog } from "@/components/ui/ShortcutsDialog";
import { Toaster } from "@/components/ui/Toaster";
import { GlobalDropOverlay } from "@/components/upload/GlobalDropOverlay";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

export function AppLayout() {
  const applyEvent = useUploadStore((s) => s.applyEvent);

  useProcessingSocket(applyEvent);
  useKeyboardShortcuts();

  return (
    <div className="flex h-full">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

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
