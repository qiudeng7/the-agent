import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用 CORS（开发环境允许前端跨域访问）
  app.enableCors({
    origin: true, // 允许所有来源
    credentials: true, // 允许携带 cookies
  });

  // 设置全局路由前缀
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
