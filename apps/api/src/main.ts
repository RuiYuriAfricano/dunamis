import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS origins never include a trailing slash — strip one if WEB_ORIGIN was
  // set with one, since that would silently fail every preflight check.
  const webOrigin = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').replace(/\/+$/, '');
  app.enableCors({
    origin: webOrigin,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Anchored to this file's location (apps/api/dist/main.js), not process.cwd(),
  // so uploads resolve consistently regardless of the directory the process is started from.
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
