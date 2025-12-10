import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
  category?: string;
}

export const useKeyboardShortcuts = (customShortcuts?: ShortcutAction[]) => {
  const navigate = useNavigate();

  // Default navigation shortcuts
  const defaultShortcuts: ShortcutAction[] = [
    { key: "d", alt: true, description: "Go to Dashboard", action: () => navigate("/dashboard"), category: "Navigation" },
    { key: "l", alt: true, description: "Go to Leads", action: () => navigate("/leads"), category: "Navigation" },
    { key: "m", alt: true, description: "Go to Members", action: () => navigate("/members"), category: "Navigation" },
    { key: "t", alt: true, description: "Go to Templates", action: () => navigate("/templates"), category: "Navigation" },
    { key: "a", alt: true, description: "Go to Analytics", action: () => navigate("/analytics"), category: "Navigation" },
    { key: "n", alt: true, description: "Create New Lead", action: () => navigate("/leads/new"), category: "Actions" },
    { key: "s", ctrl: true, description: "Save (in forms)", action: () => {}, category: "Forms" },
  ];

  const shortcuts = [...defaultShortcuts, ...(customShortcuts || [])];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs (except for Ctrl+S to save)
      const target = event.target as HTMLElement;
      const isInputActive = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          // Allow Ctrl+S even in inputs, block others
          if (isInputActive && !shortcut.ctrl) {
            return;
          }
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
};

export default useKeyboardShortcuts;