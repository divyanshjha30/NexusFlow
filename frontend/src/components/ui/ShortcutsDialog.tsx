import { useUiStore } from "@/stores/uiStore";

const GROUPS = [
  {
    title: "General",
    items: [
      { keys: ["⌘", "K"], label: "Open command palette" },
      { keys: ["/"], label: "Search" },
      { keys: ["⌘", "J"], label: "Toggle theme" },
      { keys: ["?"], label: "Show this help" },
    ],
  },
  {
    title: "Navigation",
    items: [
      { keys: ["G", "D"], label: "Dashboard" },
      { keys: ["G", "L"], label: "Library" },
      { keys: ["G", "C"], label: "AI Chat" },
      { keys: ["G", "T"], label: "Cloud topology" },
      { keys: ["G", "A"], label: "Archive" },
      { keys: ["G", "S"], label: "Settings" },
    ],
  },
];

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close shortcuts"
        onClick={() => setOpen(false)}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />

      <dialog
        open
        aria-label="Keyboard shortcuts"
        className="card-glass relative m-0 w-full max-w-md animate-scale-in p-5 text-content-primary shadow-2xl"
      >
        <h2 className="text-base font-semibold">Keyboard shortcuts</h2>

        <div className="mt-4 space-y-4">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-caption uppercase tracking-wide text-content-muted">
                {group.title}
              </p>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between text-small text-content-secondary"
                  >
                    <span>{item.label}</span>
                    <span className="flex gap-1">
                      {item.keys.map((k) => (
                        <kbd key={k} className="kbd">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost mt-5 w-full"
        >
          Close
        </button>
      </dialog>
    </div>
  );
}
