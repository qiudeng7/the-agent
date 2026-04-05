import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { nanoid } from 'nanoid';
import type { Message } from '@prisma/client';
import { MessageRole } from '@prisma/client';

export interface CreateMessageDto {
  id?: string;
  role: 'user' | 'assistant';
  content: string | Record<string, unknown>[];
  model?: string;
  timestamp?: number;
}

@Injectable()
export class AgentMessageService {
  constructor(private readonly prisma: PrismaService) {}

  private toPrismaRole(role: string): MessageRole {
    return role.toUpperCase() as MessageRole;
  }

  async findBySession(sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      return null;
    }

    const messages = await this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });

    return messages.map((msg: Message) => ({
      id: msg.id,
      role: msg.role.toLowerCase(),
      content: JSON.parse(msg.content),
      model: msg.model,
      timestamp: msg.timestamp.getTime(),
    }));
  }

  async create(sessionId: string, userId: string, data: CreateMessageDto) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      return null;
    }

    const now = new Date();
    const messageId = data.id || nanoid();
    const timestamp = data.timestamp ? new Date(data.timestamp) : now;
    // 统一 stringify，保持与 nitro 后端一致
    const contentStr = JSON.stringify(data.content);

    const message = await this.prisma.message.create({
      data: {
        id: messageId,
        sessionId,
        role: this.toPrismaRole(data.role),
        content: contentStr,
        model: data.model || null,
        timestamp,
      },
    });

    // 更新会话的 updatedAt
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: now },
    });

    // 如果是第一条用户消息，自动提取标题
    if (data.role === 'user') {
      const existingMessages = await this.prisma.message.count({
        where: { sessionId },
      });

      if (existingMessages === 1) {
        let text = '';
        if (typeof data.content === 'string') {
          text = data.content;
        } else if (Array.isArray(data.content)) {
          const textBlock = data.content.find(
            (b: Record<string, unknown>) => b.type === 'text',
          );
          text = (textBlock?.text as string) || '';
        }

        const title = text.slice(0, 30) + (text.length > 30 ? '...' : '');
        await this.prisma.chatSession.update({
          where: { id: sessionId },
          data: { title },
        });
      }
    }

    return {
      id: message.id,
      sessionId,
      role: message.role.toLowerCase(),
      content: JSON.parse(message.content),
      model: message.model,
      timestamp: message.timestamp.getTime(),
    };
  }

  async remove(id: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: { session: true },
    });

    if (!message || message.session.userId !== userId) {
      return null;
    }

    await this.prisma.message.delete({
      where: { id },
    });

    return { success: true };
  }
}