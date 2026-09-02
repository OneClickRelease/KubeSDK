import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import validationRouter from "./server/routes/validation";
import clusterRouter from "./server/routes/cluster";
import exportRouter from "./server/routes/export";
import historyRouter from "./server/routes/history";
import registryRouter from "./server/routes/registry";
import configRouter from "./server/routes/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- API Routes ---
  app.use("/api", validationRouter);
  app.use("/api", clusterRouter);
  app.use("/api", exportRouter);
  app.use("/api/history", historyRouter);
  app.use("/api/registry", registryRouter);
  app.use("/api/config", configRouter);

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
