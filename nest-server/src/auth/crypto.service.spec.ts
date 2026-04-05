import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash password and return formatted string', async () => {
      const password = 'myPassword123';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      // Format: iterations:salt:hash
      const parts = hash.split(':');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('100000'); // ITERATIONS
    });

    it('should generate different hashes for same password', async () => {
      const password = 'myPassword123';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'myPassword123';
      const hash = await service.hashPassword(password);

      const result = await service.verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'myPassword123';
      const hash = await service.hashPassword(password);

      const result = await service.verifyPassword('wrongPassword', hash);
      expect(result).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const result = await service.verifyPassword('password', 'invalid-hash');
      expect(result).toBe(false);
    });

    it('should return false for empty hash parts', async () => {
      const result = await service.verifyPassword('password', '::');
      expect(result).toBe(false);
    });
  });
});
