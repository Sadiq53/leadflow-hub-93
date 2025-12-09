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
}

const shortcuts: ShortcutInfo[] = [
  { keys: ["Alt", "D"], description: "Go to Dashboard" },
  { keys: ["Alt", "L"], description: "Go to Leads" },
  { keys: ["Alt", "M"], description: "Go to Members" },
  { keys: ["Alt", "T"], description: "Go to Templates" },
  { keys: ["Alt", "A"], description: "Go to Analytics" },
  { keys: ["Alt", "N"], description: "Create New Lead" },
  { keys: ["?"], description: "Show Keyboard Shortcuts" },
  { keys: ["Esc"], description: "Close Dialog" },
];

export const KeyboardShortcutsDialog = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate quickly
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
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
        <p className="text-xs text-muted-foreground text-center">
          Press <Kbd>?</Kbd> anytime to show this dialog
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsDialog;