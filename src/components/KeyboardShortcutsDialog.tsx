import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

interface ShortcutInfo {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: ShortcutInfo[] = [
  // Navigation
  { keys: ["Alt", "D"], description: "Go to Dashboard", category: "Navigation" },
  { keys: ["Alt", "L"], description: "Go to Leads", category: "Navigation" },
  { keys: ["Alt", "M"], description: "Go to Members", category: "Navigation" },
  { keys: ["Alt", "T"], description: "Go to Templates", category: "Navigation" },
  { keys: ["Alt", "A"], description: "Go to Analytics", category: "Navigation" },
  // Actions
  { keys: ["Alt", "N"], description: "Create New Lead", category: "Actions" },
  { keys: ["Alt", "P"], description: "Add New POC (in forms)", category: "Actions" },
  { keys: ["Alt", "E"], description: "Edit Lead/POC", category: "Actions" },
  { keys: ["Alt", "S"], description: "Save Changes", category: "Actions" },
  // Forms
  { keys: ["Ctrl", "S"], description: "Submit Form", category: "Forms" },
  { keys: ["Ctrl", "Enter"], description: "Submit & Continue", category: "Forms" },
  { keys: ["Esc"], description: "Close Dialog / Cancel", category: "Forms" },
  // Help
  { keys: ["?"], description: "Show Keyboard Shortcuts", category: "Help" },
];

const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
  if (!acc[shortcut.category]) acc[shortcut.category] = [];
  acc[shortcut.category].push(shortcut);
  return acc;
}, {} as Record<string, ShortcutInfo[]>);

export const KeyboardShortcutsDialog = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "?" && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and work faster
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h4>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                  >
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <Kbd>{key}</Kbd>
                          {i < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Press <Kbd>?</Kbd> anytime to show this dialog
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsDialog;