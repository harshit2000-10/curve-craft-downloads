import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import fs from "node:fs";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "serve-landing",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const pathname = req.url?.split("?")[0];
          if (pathname === "/") {
            let html = fs.readFileSync(
              path.join(process.cwd(), "public/landing.html"),
              "utf-8"
            );
            const patch = `<script>(function(){function p(){document.querySelectorAll('a[href="https://curve-craft.vercel.app/"]').forEach(function(a){a.href='/app';a.removeAttribute('target');a.removeAttribute('rel');});}var o=new MutationObserver(p);o.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('load',function(){p();o.disconnect();});})();</script>`;
            html = html.replace("</body>", patch + "</body>");
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.statusCode = 200;
            res.end(html);
            return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
