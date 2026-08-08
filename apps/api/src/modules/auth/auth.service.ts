
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../common/db/prisma';

const requiredSecret = (name: 'JWT_SECRET' | 'PEPPER') => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not configured`);
    return value;
};

export const registerSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(6),
});

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string(),
});

const avatarIcons = ['user-round', 'circle-user', 'badge-euro', 'landmark', 'wallet-cards', 'chart-no-axes-combined'] as const;
const avatarColors = ['slate', 'indigo', 'emerald', 'amber', 'rose', 'sky'] as const;

export const updateProfileSchema = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email(),
    avatarIcon: z.enum(avatarIcons),
    avatarColor: z.enum(avatarColors),
    locale: z.enum(['es-ES', 'en-US', 'en-GB']),
    timezone: z.string().trim().min(1).max(64),
    preferredCurrency: z.enum(['EUR', 'USD']),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string()
        .min(10, 'Password must contain at least 10 characters')
        .max(128)
        .regex(/[a-z]/, 'Password must contain a lowercase letter')
        .regex(/[A-Z]/, 'Password must contain an uppercase letter')
        .regex(/\d/, 'Password must contain a number'),
}).refine(({ currentPassword, newPassword }) => currentPassword !== newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
});

const publicUserSelect = {
    id: true,
    email: true,
    name: true,
    avatarIcon: true,
    avatarColor: true,
    locale: true,
    timezone: true,
    preferredCurrency: true,
    createdAt: true,
    updatedAt: true,
} as const;

const createHttpError = (message: string, statusCode: number) => Object.assign(new Error(message), { statusCode });

export class AuthService {
    async register(data: z.infer<typeof registerSchema>) {
        const { email, password } = data;

        // Check if user exists
        const existing = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existing) {
            throw new Error('User already exists');
        }

        // Hash with Argon2 and Pepper
        const passwordHash = await argon2.hash(password, {
            type: argon2.argon2id,
            secret: Buffer.from(requiredSecret('PEPPER'))
        });

        const user = await prisma.user.create({
            data: { email, passwordHash },
            select: { ...publicUserSelect, sessionVersion: true },
        });

        const token = this.generateToken(user.id, user.sessionVersion);
        const { sessionVersion: _sessionVersion, ...publicUser } = user;
        return { user: publicUser, token };
    }

    async login(data: z.infer<typeof loginSchema>) {
        const { email, password } = data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Verify with Argon2 and Pepper
        try {
            const match = await argon2.verify(user.passwordHash, password, {
                secret: Buffer.from(requiredSecret('PEPPER'))
            });

            if (!match) {
                throw new Error('Invalid credentials');
            }
        } catch (err) {
            // argon2.verify might throw on internal errors, or malformed hash
            throw new Error('Invalid credentials');
        }

        const token = this.generateToken(user.id, user.sessionVersion);

        return {
            user: await this.getMe(user.id),
            token,
        };
    }

    async getMe(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: publicUserSelect,
        });
    }

    async updateProfile(userId: string, data: z.infer<typeof updateProfileSchema>) {
        const emailOwner = await prisma.user.findUnique({
            where: { email: data.email },
            select: { id: true },
        });
        if (emailOwner && emailOwner.id !== userId) {
            throw createHttpError('That email address is already in use', 409);
        }

        return prisma.user.update({
            where: { id: userId },
            data,
            select: publicUserSelect,
        });
    }

    async changePassword(userId: string, data: z.infer<typeof changePasswordSchema>) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw createHttpError('User not found', 404);

        const matches = await argon2.verify(user.passwordHash, data.currentPassword, {
            secret: Buffer.from(requiredSecret('PEPPER')),
        }).catch(() => false);
        if (!matches) throw createHttpError('Current password is incorrect', 400);

        const passwordHash = await argon2.hash(data.newPassword, {
            type: argon2.argon2id,
            secret: Buffer.from(requiredSecret('PEPPER')),
        });
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { passwordHash, sessionVersion: { increment: 1 } },
            select: { sessionVersion: true },
        });

        return { token: this.generateToken(userId, updatedUser.sessionVersion) };
    }

    private generateToken(userId: string, sessionVersion: number) {
        // In a real high-security app, we would use HttpOnly cookies instead of returning the token in body.
        // For now, we return it, but the client should ideally store it securely.
        return jwt.sign({ userId, sessionVersion }, requiredSecret('JWT_SECRET'), { expiresIn: '7d' });
    }
}

export const authService = new AuthService();
