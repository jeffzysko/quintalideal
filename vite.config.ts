import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.png",
        "apple-touch-icon.png",
        "pwa-icon-192.png",
        "pwa-icon-512.png",
        "pwa-icon-maskable-512.png",
        "notification-icon.png",
        "og-image.png",
      ],
      manifest: {
        id: "/login",
        name: "Quintal Ideal Splash",
        short_name: "Quintal Ideal",
        description:
          "Descubra o potencial do seu quintal para ter uma piscina Splash. Gerencie leads e vendas.",
        start_url: "/login",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        theme_color: "#08a1d6",
        background_color: "#0a1628",
        categories: ["business", "lifestyle"],
        dir: "ltr",
        lang: "pt-BR",
        launch_handler: {
          client_mode: "navigate-existing",
        },
        handle_links: "preferred",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/og-image.png",
            sizes: "1200x630",
            type: "image/png",
            form_factor: "wide",
            label: "Painel de gestão do Quintal Ideal",
          },
        ],
        shortcuts: [
          {
            name: "Painel do Dia",
            short_name: "Hoje",
            description: "Veja seus leads e tarefas de hoje",
            url: "/hoje",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Dashboard",
            short_name: "Painel",
            description: "Acesse o painel completo da franquia",
            url: "/franquia",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Notificações",
            short_name: "Alertas",
            description: "Veja suas notificações",
            url: "/notificacoes",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        importScripts: ["/push-sw.js"],
        globPatterns: ["**/*.{js,css,html,ico,woff2}"],
        globIgnores: [
          "**/Admin*",
          "**/Kanban*",
          "**/PublicProposal*",
          "**/PerformanceAudit*",
          "**/og-image*",
          "**/vendor-charts*",
          "**/vendor-maps*",
          "**/vendor-dnd*",
        ],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/],
        skipWaiting: false,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        additionalManifestEntries: [
          { url: "/offline.html", revision: "v3" },
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern:
              /^https:\/\/bbfkorzehzoaogrnuyqp\.supabase\.co\/storage\/v1\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern:
              /^https:\/\/bbfkorzehzoaogrnuyqp\.supabase\.co\/rest\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
          ],
          "vendor-charts": ["recharts"],
          "vendor-maps": ["leaflet"],
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable"],
        },
      },
    },
  },
}));

