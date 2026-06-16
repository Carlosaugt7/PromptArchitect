import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
export type Density = "cozy" | "compact";

const THEME_KEY = "omniforge.theme";
const DENSITY_KEY = "omniforge.density";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "dark";
    setTheme(saved);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  return { theme, setTheme, toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

export function useDensity() {
  const [density, setDensity] = useState<Density>("cozy");
  useEffect(() => {
    const saved = (localStorage.getItem(DENSITY_KEY) as Density | null) ?? "cozy";
    setDensity(saved);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.density = density;
    localStorage.setItem(DENSITY_KEY, density);
  }, [density]);
  return {
    density,
    setDensity,
    toggleDensity: () => setDensity((d) => (d === "cozy" ? "compact" : "cozy")),
  };
}
