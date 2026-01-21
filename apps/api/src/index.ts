import express from "express";

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import loadEnv from "./common/utils/envLoader";
import mainRouter from "./modules/mainRouter";
import { errorHandler } from "./common/middleware/errorHandler";
import { requestLogger } from "./common/middleware/requestLogger";

loadEnv();
const app = express();
app.disable('etag'); // Disable 304 responses to force fresh headers

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

// Middleware
app.use(requestLogger);

// Manual CORS Handling
app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Explicitly allow localhost:5173 and others
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Range');
        res.setHeader('Vary', 'Origin');
    }

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

app.use(cookieParser());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => req.method === 'OPTIONS', // Skip preflight requests
    message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use(limiter);

// Stricter Rate Limiting for Auth
const authLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    skip: (req) => req.method === 'OPTIONS', // Skip preflight requests
    message: "Too many login attempts from this IP, please try again after 30 minutes"
});
app.use("/auth", authLimiter);

app.use(express.json());

// Routes
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/", mainRouter);

app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001; // Fallback to 3001 if env missing
app.listen(PORT, () => console.log(`API on :${PORT}`));
