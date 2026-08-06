import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Dev-only: the production image serves the frontend and API from the
    // same Express process/port (see backend/Dockerfile), so there's no
    // reverse proxy to depend on here. This proxy makes the Vite dev
    // server's relative "/api" calls (frontend/src/api/axios.ts's default)
    // reach the backend container under Docker Compose, mirroring that
    // same-origin behavior for local development.
    proxy: {
      "/api": {
        target: "http://backend:3000",
        changeOrigin: true,
      },
    },
  },
});
