import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { nanoid } from 'nanoid';
import type { Message } from '@prisma/client';
import { MessageRole } from '@prisma/client';

export interface CreateMessageDto {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
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
      content: msg.content,
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
    const message = await this.prisma.message.create({
      data: {
        id: nanoid(),
        sessionId,
        role: this.toPrismaRole(data.role),
        content: data.content,
        model: data.model || null,
        timestamp: now,
      },
    });

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: now },
    });

    return {
      id: message.id,
      role: message.role.toLowerCase(),
      content: message.content,
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