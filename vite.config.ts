import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? "/",
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: { "/api": `http://localhost:${process.env.API_PORT ?? 8787}` },
  },
  preview: { host: "127.0.0.1" },
  build: { outDir: "dist" },
});
