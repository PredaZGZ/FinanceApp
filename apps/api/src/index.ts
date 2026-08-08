import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import loadEnv from "./common/utils/envLoader";
import mainRouter from "./modules/mainRouter";

loadEnv();
const app = express();
app.set('etag', false); // Disable ETags to force 200 OK and preserve CORS headers

// Security Middleware
app.use(helmet());
app.use(cookieParser());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use(limiter);

// Stricter Rate Limiting for Auth
const authLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 25, // Limit each IP to 25 requests per windowMs
    skip: (req) => req.method === 'OPTIONS',
    message: "Too many login attempts from this IP, please try again after 30 minutes"
});
app.use("/auth/login", authLimiter);
app.use("/auth/register", authLimiter);

// Middleware
import { errorHandler } from "./common/middleware/errorHandler";
import { requestLogger } from "./common/middleware/requestLogger";

const trustedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4000',
    'tauri://localhost',
    'https://tauri.localhost',
]);

app.use(cors({
    origin: (origin, callback) => {
        const isLocalDevelopmentOrigin = process.env.NODE_ENV !== 'production'
            && Boolean(origin?.match(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/));
        if (!origin || trustedOrigins.has(origin) || isLocalDevelopmentOrigin) {
            callback(null, true);
            return;
        }
        callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
}));


app.use(express.json());
app.use(requestLogger);

// Routes
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/", mainRouter);

app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001; // Fallback to 3001 if env missing
app.listen(PORT, () => console.log(`API on :${PORT}`));
