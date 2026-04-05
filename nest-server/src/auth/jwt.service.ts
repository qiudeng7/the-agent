import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jose from 'jose';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtService {
  private getSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return new TextEncoder().encode(secret);
  }

  /**
   * 生成 JWT token
   */
  async generateToken(user: {
    id: string;
    email: string;
    role: string;
  }): Promise<string> {
    const secret = this.getSecret();
    return new jose.SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);
  }

  /**
   * 验证 JWT token
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    const secret = this.getSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  }
}