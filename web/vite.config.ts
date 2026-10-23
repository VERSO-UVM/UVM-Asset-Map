/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/UVM-Asset-Map/",
  plugins: [react()],
  build: { chunkSizeWarningLimit: 800 }, // cytoscape is ~600 kB; fine for a single-page prototype
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
