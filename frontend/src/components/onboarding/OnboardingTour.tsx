import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  Search,
  Sparkles,
  Command,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

const STORAGE_KEY = "nexusflow.tourSeen";

const STEPS = [
  {
    icon: UploadCloud,
    title: "Drop a file anywhere",
    body: "You don't need the upload zone — drag a file onto any screen. NexusFlow fans it out to AWS, Azure, GCP and OCI in parallel, and the progress bar fills one segment per cloud.",
  },
  {
    icon: Sparkles,
    title: "AI reads it for you",
    body: "Every document is classified, summarised in three sentences, and mined for organisations, dates and amounts. Tags are generated automatically — you can add your own on top.",
  },
  {
    icon: Search,
    title: "Find anything instantly",
    body: "Search combines keyword and vector similarity, so “unpaid invoices from Acme” works even when those words never appear together. Ask follow-up questions in AI Chat and every answer cites its sources.",
  },
  {
    icon: Command,
    title: "Move at keyboard speed",
    body: "Press ⌘K for the command palette, ? for the full shortcut list, and g then d/l/c to jump between Dashboard, Library and Chat.",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== "true",
  );
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  function finish(destination?: string) {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
    if (destination) navigate(destination);
  }

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const last = step === STEPS.length - 1;

  return (
    <Modal
      open
      onClose={() => finish()}
      title={`Welcome to NexusFlow`}
      description={`${step + 1} of ${STEPS.length}`}
      footer={
        <>
          <button
            type="button"
            onClick={() => finish()}
            className="btn-subtle mr-auto"
          >
            Skip
          </button>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="btn-ghost"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              last ? finish("/dashboard") : setStep((s) => s + 1)
            }
            className="btn-primary"
          >
            {last ? "Get started" : "Next"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex justify-center">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-edge bg-surface-raised">
            <span className="absolute inset-0 animate-pulse-glow rounded-2xl bg-brand/15" />
            <Icon className="relative h-7 w-7 text-brand-light" />
          </span>
        </div>

        <div className="text-center">
          <h3 className="text-body font-semibold text-content-primary">
            {current.title}
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-small leading-relaxed text-content-secondary">
            {current.body}
          </p>
        </div>

        <div className="flex justify-center gap-1.5 pt-1">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Go to step ${i + 1}`}
              onClick={() => setStep(i)}
              className={
                i === step
                  ? "h-1.5 w-6 rounded-full bg-brand transition-all"
                  : "h-1.5 w-1.5 rounded-full bg-edge transition-all"
              }
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
