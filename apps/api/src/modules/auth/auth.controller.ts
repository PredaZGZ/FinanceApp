import { Request, Response, NextFunction } from 'express';
import { authService, loginSchema, registerSchema } from './auth.service';
import { AuthRequest } from './auth.middleware';

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const data = registerSchema.parse(req.body);
            const { user, token } = await authService.register(data);

            // Set HttpOnly Cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({ user });
        } catch (error: any) {
            if (error.message === 'User already exists') {
                return res.status(409).json({ error: 'User already exists' });
            }
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const data = loginSchema.parse(req.body);
            const { user, token } = await authService.login(data);

            // Set HttpOnly Cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // False in dev (http)
                sameSite: 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({ user });
        } catch (error: any) {
            if (error.message === 'Invalid credentials') {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            next(error);
        }
    }

    async getMe(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) return res.sendStatus(401);
            const user = await authService.getMe(req.user.id);
            res.json(user);
        } catch (error) {
            next(error);
        }
    }

    async logout(req: Request, res: Response) {
        res.clearCookie('token');
        res.json({ message: 'Logged out' });
    }
}

export const authController = new AuthController();
