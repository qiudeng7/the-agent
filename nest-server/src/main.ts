import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动移除非 DTO 定义的属性
      forbidNonWhitelisted: true, // 拒绝包含非白名单属性的请求
      transform: true, // 自动转换类型
    }),
  );

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
