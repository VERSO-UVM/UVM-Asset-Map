import { useEffect, useState } from "react";
import { DARK, LIGHT, type Theme } from "../lib/encoding";

function isDark(): boolean {
  const stamp = document.documentElement.dataset.theme;
  if (stamp === "dark") return true;
  if (stamp === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/** Follows prefers-color-scheme, overridden by a data-theme stamp on <html>. */
export function useTheme(): Theme {
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const update = () => setDark(isDark());
    mq?.addEventListener("change", update);
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq?.removeEventListener("change", update);
      obs.disconnect();
    };
  }, []);
  return dark ? DARK : LIGHT;
}
