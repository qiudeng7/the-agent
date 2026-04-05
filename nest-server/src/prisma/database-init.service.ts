import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-512',
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );
  return `${ITERATIONS}:${bufferToHex(salt.buffer as ArrayBuffer)}:${bufferToHex(derivedBits)}`;
}

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // 仅在非生产环境执行
    if (process.env.NODE_ENV === 'production') {
      this.logger.log('Production mode, skipping database init');
      return;
    }

    await this.initTestAdmin();
  }

  private async initTestAdmin() {
    const adminEmail = 'admin@the-console.com';
    const adminPassword = 'admin123';

    try {
      const existingAdmin = await this.prisma.user.findUnique({
        where: { email: adminEmail },
      });

      if (existingAdmin) {
        this.logger.log(`Test admin already exists: ${adminEmail}`);
        return;
      }

      const { nanoid } = await import('nanoid');
      const passwordHash = await hashPassword(adminPassword);

      await this.prisma.user.create({
        data: {
          id: nanoid(),
          email: adminEmail,
          passwordHash,
          nickname: 'Admin',
          role: 'ADMIN',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Created test admin: ${adminEmail} / ${adminPassword}`);
    } catch (error) {
      this.logger.error('Failed to init test admin', error);
    }
  }
}