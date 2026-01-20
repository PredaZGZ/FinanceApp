import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import loadEnv from "./common/utils/envLoader";
import mainRouter from "./modules/mainRouter";

loadEnv();
const app = express();

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
    message: "Too many login attempts from this IP, please try again after 30 minutes"
});
app.use("/auth", authLimiter);

// Middleware
import { errorHandler } from "./common/middleware/errorHandler";
import { requestLogger } from "./common/middleware/requestLogger";

// CORS Configuration
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5173'
];
app.use(cors({
    origin: (origin, callback) => {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true // Allow cookies
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
