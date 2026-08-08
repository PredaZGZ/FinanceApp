import { Request, Response, NextFunction } from 'express';
import { authService, changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from './auth.service';
import { AuthRequest } from './auth.middleware';

export class AuthController {
    private setAuthCookie(res: Response, token: string) {
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
    }

    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const data = registerSchema.parse(req.body);
            const { user, token } = await authService.register(data);

            this.setAuthCookie(res, token);

            res.json({ user, token });
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

            this.setAuthCookie(res, token);

            res.json({ user, token });
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

    async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) return res.sendStatus(401);
            const data = updateProfileSchema.parse(req.body);
            res.json(await authService.updateProfile(req.user.id, data));
        } catch (error) {
            next(error);
        }
    }

    async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) return res.sendStatus(401);
            const data = changePasswordSchema.parse(req.body);
            const { token } = await authService.changePassword(req.user.id, data);
            this.setAuthCookie(res, token);
            res.json({ token, message: 'Password updated successfully' });
        } catch (error) {
            next(error);
        }
    }

    async logout(req: Request, res: Response) {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });
        res.json({ message: 'Logged out' });
    }
}

export const authController = new AuthController();
