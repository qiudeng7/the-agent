import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from './jwt.service';

describe('JwtService', () => {
  let service: JwtService;
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtService],
    }).compile();

    service = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const token = await service.generateToken({
        id: 'user-123',
        email: 'test@example.com',
        role: 'EMPLOYEE',
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token and return payload', async () => {
      const token = await service.generateToken({
        id: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN',
      });

      const payload = await service.verifyToken(token);

      expect(payload.userId).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.role).toBe('ADMIN');
    });

    it('should throw error for invalid token', async () => {
      await expect(service.verifyToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('getSecret', () => {
    it('should throw error if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      expect(() =>
        new JwtService().generateToken({
          id: '1',
          email: 'a@b.c',
          role: 'EMPLOYEE',
        }),
      ).rejects.toThrow('JWT_SECRET environment variable is required');

      process.env.JWT_SECRET = 'test-secret-key-for-testing';
    });
  });
});
