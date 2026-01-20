
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

export interface AuthRequest extends Request {
    user?: {
        id: string;
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Check cookie first, then header
    const token = req.cookies?.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

    if (!token) {
        res.sendStatus(401);
        return;
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            res.sendStatus(403);
            return;
        }

        req.user = user as { id: string };
        next();
    });
};
