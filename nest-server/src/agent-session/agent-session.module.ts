import { Module } from '@nestjs/common';
import { AgentSessionController } from './agent-session.controller';
import { AgentSessionService } from './agent-session.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AgentSessionController],
  providers: [AgentSessionService],
  exports: [AgentSessionService],
})
export class AgentSessionModule {}