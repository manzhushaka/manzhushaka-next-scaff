import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function readSecret(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  const stdin = process.stdin;
  if (!stdin.isTTY || !stdin.setRawMode)
    return (
      await new Promise<string>((resolve) => {
        stdin.once('data', (chunk) => resolve(chunk.toString().trim()));
      })
    ).trim();
  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (chunk: Buffer) => {
      const input = chunk.toString();
      for (const character of input) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('已取消。'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (character === '\u007f') {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode?.(false);
      stdin.pause();
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function main() {
  const rl = createInterface({ input, output });
  const username = (await rl.question('超级管理员用户名: ')).trim();
  rl.close();
  const password = (await readSecret('初始密码: ')).trim();
  if (!username || password.length < 10) throw new Error('用户名不能为空，密码至少 10 位。');
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error('该用户名已存在，脚本不会覆盖已有账号。');
  const role = await prisma.role.findUniqueOrThrow({ where: { code: 'super_admin' } });
  await prisma.user.create({
    data: {
      username,
      passwordHash: hash,
      displayName: '超级管理员',
      mustChangePassword: true,
      roles: { create: { roleId: role.id } },
    },
  });
  console.log('超级管理员已创建，首次登录必须修改密码。');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
