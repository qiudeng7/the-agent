import { Module } from '@nestjs/common';
import { AgentMessageController } from './agent-message.controller';
import { AgentMessageService } from './agent-message.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AgentMessageController],
  providers: [AgentMessageService],
  exports: [AgentMessageService],
})
export class AgentMessageModule {}
