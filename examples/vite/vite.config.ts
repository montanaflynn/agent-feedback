import { agentFeedback } from "@agent-feedback/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), agentFeedback({ react: true })]
});
