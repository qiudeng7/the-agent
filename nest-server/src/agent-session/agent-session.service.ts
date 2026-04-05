import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { nanoid } from 'nanoid';
import type { ChatSession } from '@prisma/client';
import type { CreateSessionDto, UpdateSessionDto } from './agent-session.dto';

@Injectable()
export class AgentSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    const sessionsWithCounts = await Promise.all(
      sessions.map(async (session: ChatSession) => {
        const count = await this.prisma.message.count({
          where: { sessionId: session.id },
        });

        return {
          id: session.id,
          title: session.title,
          model: session.model,
          taskId: session.taskId,
          createdAt: session.createdAt.getTime(),
          updatedAt: session.updatedAt.getTime(),
          messageCount: count,
        };
      }),
    );

    return sessionsWithCounts;
  }

  async findOne(id: string, userId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id },
    });

    if (!session || session.userId !== userId) {
      return null;
    }

    // 获取消息
    const messages = await this.prisma.message.findMany({
      where: { sessionId: id },
      orderBy: { timestamp: 'asc' },
    });

    return {
      session: {
        id: session.id,
        title: session.title,
        model: session.model,
        taskId: session.taskId,
        createdAt: session.createdAt.getTime(),
        updatedAt: session.updatedAt.getTime(),
      },
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role.toLowerCase(),
        content: JSON.parse(msg.content),
        model: msg.model,
        timestamp: msg.timestamp.getTime(),
      })),
    };
  }

  async create(userId: string, data: CreateSessionDto) {
    const now = new Date();
    const session = await this.prisma.chatSession.create({
      data: {
        id: nanoid(),
        userId,
        title: data.title || '新会话',
        model: data.model || 'default',
        taskId: data.taskId || null,
        createdAt: now,
        updatedAt: now,
      },
    });

    return {
      id: session.id,
      title: session.title,
      model: session.model,
      taskId: session.taskId,
      createdAt: session.createdAt.getTime(),
      updatedAt: session.updatedAt.getTime(),
      messageCount: 0,
    };
  }

  async update(id: string, userId: string, data: UpdateSessionDto) {
    const existing = await this.prisma.chatSession.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      return null;
    }

    const session = await this.prisma.chatSession.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return {
      id: session.id,
      title: session.title,
      model: session.model,
      taskId: session.taskId,
      createdAt: session.createdAt.getTime(),
      updatedAt: session.updatedAt.getTime(),
    };
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.chatSession.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      return null;
    }

    await this.prisma.chatSession.delete({
      where: { id },
    });

    return { success: true, id };
  }
}
