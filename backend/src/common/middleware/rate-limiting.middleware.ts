import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitingMiddleware implements NestMiddleware {
  private requests = new Map<string, RateLimitEntry>();
  private readonly maxRequests = 100; // Максимум запросов
  private readonly windowMs = 15 * 60 * 1000; // Окно в 15 минут

  use(req: Request, res: Response, next: () => void) {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = this.requests.get(clientIp);

    // Очищаем старые записи
    if (entry && now > entry.resetTime) {
      this.requests.delete(clientIp);
    }

    const currentEntry = this.requests.get(clientIp);

    if (!currentEntry) {
      // Первое посещение
      this.requests.set(clientIp, {
        count: 1,
        resetTime: now + this.windowMs,
      });
    } else if (currentEntry.count >= this.maxRequests) {
      // Превышен лимит
      res.status(429).json({
        message: 'Слишком много запросов, попробуйте позже',
        retryAfter: Math.ceil((currentEntry.resetTime - now) / 1000),
      });
      return;
    } else {
      // Увеличиваем счетчик
      currentEntry.count++;
    }

    // Добавляем заголовки для информации о лимите
    const current = this.requests.get(clientIp);
    if (current) {
      res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - current.count).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString());
    }

    next();
  }
}

