// @lovable.dev/vite-tanstack-config já inclui os plugins padrões.
// Configurações adicionais do Vite devem ser passadas dentro de vite: { ... }.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    base: "/setaiav1/",
  },
  tanstackStart: {
    // Redireciona a entrada do servidor para src/server.ts
    server: { entry: "server" },
  },
});
