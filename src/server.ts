import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { registry } from "./actors.js";

const app = new Hono();

// Serve static files from dist/client in production
app.use("/*", serveStatic({ root: "./dist/client" }));

// RivetKit handler for all actor requests
app.all("/api/rivet/*", (c) => registry.handler(c.req.raw));

// Fallback to index.html for SPA routing
app.get("*", serveStatic({ root: "./dist/client", path: "index.html" }));

const port = parseInt(process.env.PORT || "3000");

console.log(`Server running at http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
