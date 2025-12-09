import { useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export const useKeyboardShortcuts = (customShortcuts?: ShortcutAction[]) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Default navigation shortcuts
  const defaultShortcuts: ShortcutAction[] = [
    { key: "d", alt: true, description: "Go to Dashboard", action: () => navigate("/dashboard") },
    { key: "l", alt: true, description: "Go to Leads", action: () => navigate("/leads") },
    { key: "m", alt: true, description: "Go to Members", action: () => navigate("/members") },
    { key: "t", alt: true, description: "Go to Templates", action: () => navigate("/templates") },
    { key: "a", alt: true, description: "Go to Analytics", action: () => navigate("/analytics") },
    { key: "n", alt: true, description: "Create New Lead", action: () => navigate("/leads/new") },
  ];

  const shortcuts = [...defaultShortcuts, ...(customShortcuts || [])];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
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