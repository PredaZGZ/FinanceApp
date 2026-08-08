
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
    email: z.string().email(),
    password: z.string().min(6),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

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
            select: { id: true, email: true, createdAt: true },
        });

        const token = this.generateToken(user.id);
        return { user, token };
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

        const token = this.generateToken(user.id);

        return {
            user: {
                id: user.id,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            token,
        };
    }

    async getMe(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, createdAt: true },
        });
    }

    private generateToken(userId: string) {
        // In a real high-security app, we would use HttpOnly cookies instead of returning the token in body.
        // For now, we return it, but the client should ideally store it securely.
        return jwt.sign({ userId }, requiredSecret('JWT_SECRET'), { expiresIn: '7d' });
    }
}

export const authService = new AuthService();
