import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import "dotenv/config";
import rateLimit from "express-rate-limit";
import supabase from "./modules/supabase.js";
import { refreshCache } from "./modules/cache.js";

// routes
import Routes from "./routes/routes.js";

import geo from "./middlewares/geo.js";

const app: Application = express();
const limiter = rateLimit({
  windowMs: 5000, // 15 minutes
  max: 1, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://l.turing.sh",
      "https://turing-ai.link",
    ],
    methods: ["GET", "PUT"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));
app.set("port", process.env.PORT || 3000);

app.use(geo);
app.use("/", Routes);

app.listen(app.get("port"), async () => {
  console.log(`Server is running on port ${app.get("port")}`);
  // load active campaigns into cache
  await refreshCache();
  setInterval(async () => {
    await refreshCache();
  }, 1000 * 60 * 60 * 24);
});
