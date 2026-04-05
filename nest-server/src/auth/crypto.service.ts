import { Injectable } from '@nestjs/common';

const ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

/**
 * 将 ArrayBuffer 转换为十六进制字符串
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 将十六进制字符串转换为 ArrayBuffer
 */
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes.buffer;
}

/**
 * 获取加密密钥
 */
async function getCryptoKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return keyMaterial;
}

@Injectable()
export class CryptoService {
  /**
   * 哈希密码
   */
  async hashPassword(password: string): Promise<string> {
    // 生成随机盐
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

    // 使用 PBKDF2 派生密钥
    const keyMaterial = await getCryptoKey(password);
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

    // 格式: iterations:salt:hash
    return `${ITERATIONS}:${bufferToHex(salt.buffer)}:${bufferToHex(derivedBits)}`;
  }

  /**
   * 验证密码
   */
  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [iterations, saltHex, hashHex] = storedHash.split(':');

    if (!iterations || !saltHex || !hashHex) {
      return false;
    }

    const salt = hexToBuffer(saltHex);
    const expectedHash = hexToBuffer(hashHex);

    try {
      const keyMaterial = await getCryptoKey(password);
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt,
          iterations: parseInt(iterations, 10),
          hash: 'SHA-512',
        },
        keyMaterial,
        KEY_LENGTH * 8,
      );

      // 常量时间比较
      const derivedArray = new Uint8Array(derivedBits);
      const expectedArray = new Uint8Array(expectedHash);

      if (derivedArray.length !== expectedArray.length) {
        return false;
      }

      let result = 0;
      for (let i = 0; i < derivedArray.length; i++) {
        result |= derivedArray[i] ^ expectedArray[i];
      }

      return result === 0;
    } catch {
      return false;
    }
  }
}
