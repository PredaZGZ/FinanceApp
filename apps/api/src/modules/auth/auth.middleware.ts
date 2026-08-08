
import { Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload, type VerifyErrors } from 'jsonwebtoken';

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
    return process.env.JWT_SECRET;
};

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

    jwt.verify(token, getJwtSecret(), (err: VerifyErrors | null, user: JwtPayload | string | undefined) => {
        if (err) {
            res.sendStatus(403);
            return;
        }

        const payload = user as JwtPayload & { userId?: string };
        if (!payload.userId) {
            res.sendStatus(403);
            return;
        }
        req.user = { id: payload.userId };
        next();
    });
};
