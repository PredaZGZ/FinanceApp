
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import pool from '../../common/db/client';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const PEPPER = process.env.PEPPER || 'default-pepper-ChangeMeInProduction!';

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
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            throw new Error('User already exists');
        }

        // Hash with Argon2 and Pepper
        const passwordHash = await argon2.hash(password, {
            type: argon2.argon2id,
            secret: Buffer.from(PEPPER)
        });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const insertRes = await client.query(
                'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, "createdAt"',
                [email, passwordHash]
            );
            const user = insertRes.rows[0];

            await client.query('COMMIT');

            const token = this.generateToken(user.id);
            return { user, token };
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async login(data: z.infer<typeof loginSchema>) {
        const { email, password } = data;

        const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (res.rows.length === 0) {
            throw new Error('Invalid credentials');
        }

        const user = res.rows[0];
        // Verify with Argon2 and Pepper
        try {
            const match = await argon2.verify(user.password_hash, password, {
                secret: Buffer.from(PEPPER)
            });

            if (!match) {
                throw new Error('Invalid credentials');
            }
        } catch (err) {
            // argon2.verify might throw on internal errors, or malformed hash
            throw new Error('Invalid credentials');
        }

        const token = this.generateToken(user.id);

        // Remove password hash from response
        delete user.password_hash;

        return { user, token };
    }

    async getMe(userId: string) {
        const res = await pool.query('SELECT id, email, "createdAt" FROM users WHERE id = $1', [userId]);
        if (res.rows.length === 0) return null;
        return res.rows[0];
    }

    private generateToken(userId: string) {
        // In a real high-security app, we would use HttpOnly cookies instead of returning the token in body.
        // For now, we return it, but the client should ideally store it securely.
        return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    }
}

export const authService = new AuthService();
