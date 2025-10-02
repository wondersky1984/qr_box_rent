import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RateLimitingMiddleware } from './rate-limiting.middleware';

@Module({})
export class MiddlewareModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitingMiddleware)
      .forRoutes('*'); // Применяем ко всем маршрутам
  }
}

