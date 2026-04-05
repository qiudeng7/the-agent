import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { AgentSessionModule } from './agent-session/agent-session.module';
import { AgentMessageModule } from './agent-message/agent-message.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TasksModule,
    AgentSessionModule,
    AgentMessageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
