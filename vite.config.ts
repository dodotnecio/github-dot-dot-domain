import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    nitro({
      // Generic Node.js server target — works on Railway, Render, a VPS, Docker, etc.
      // Swap to "cloudflare-module", "vercel", or "netlify" later if you pick one of those hosts.
      config: { preset: "node-server" },
    }),
    react(),
  ],
  server: {
    port: 5173,
  },
});
