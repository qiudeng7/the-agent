import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { JwtService } from './jwt.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let crypto: jest.Mocked<CryptoService>;
  let jwt: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    nickname: 'Test User',
    role: 'EMPLOYEE',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockCrypto = {
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
    };

    const mockJwt = {
      generateToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CryptoService, useValue: mockCrypto },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    crypto = module.get(CryptoService);
    jwt = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(1);
      prisma.user.create.mockResolvedValue(mockUser);
      crypto.hashPassword.mockResolvedValue('hashed-password');
      jwt.generateToken.mockResolvedValue('token-123');

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.data.token).toBe('token-123');
      expect(result.data.user.email).toBe('test@example.com');
    });

    it('should make first user admin', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(0);
      prisma.user.create.mockResolvedValue({ ...mockUser, role: 'ADMIN' });
      crypto.hashPassword.mockResolvedValue('hashed-password');
      jwt.generateToken.mockResolvedValue('token-123');

      const result = await service.register({
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });

    it('should throw ConflictException if email exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      crypto.verifyPassword.mockResolvedValue(true);
      jwt.generateToken.mockResolvedValue('token-123');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.data.token).toBe('token-123');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'notfound@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for deleted user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'password' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      crypto.verifyPassword.mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('me', () => {
    it('should return user info', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.me('user-123');

      expect(result.success).toBe(true);
      expect(result.data.user.id).toBe('user-123');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me('not-found')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for deleted user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await expect(service.me('user-123')).rejects.toThrow(ForbiddenException);
    });
  });
});