
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
  allowedHosts: [
    "lands-employed-framing-compressed.trycloudflare.com",
    "judgment-britney-world-similarly.trycloudflare.com",
    "coupons-completed-dealers-scuba.trycloudflare.com",
    "november-forum-shut-premiere.trycloudflare.com"
  ],
  },
});
