import express from "express";
import cors from "cors";
import loadEnv from "./utils/envLoader";

loadEnv();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/health", (_req, res) => res.json({ ok: true }));

// Start server
const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`API on :${PORT}`));
