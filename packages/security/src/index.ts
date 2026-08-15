import argon2 from 'argon2';
import { sha256 } from '@noble/hashes/sha2.js';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export function hashToken(token: string): string {
  return Buffer.from(sha256(new TextEncoder().encode(token))).toString('hex');
}

export function createOpaqueToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`;
}
