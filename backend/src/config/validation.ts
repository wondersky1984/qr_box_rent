import * as Joi from 'joi';

export default Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),
  BASE_URL: Joi.string().uri().required(),
  DATABASE_URL: Joi.string().uri().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('30d'),
  YOOKASSA_SHOP_ID: Joi.string().allow('').optional(),
  YOOKASSA_SECRET_KEY: Joi.string().allow('').optional(),
  YOOKASSA_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  MOCK_PAYMENTS: Joi.boolean().default(true),
  LOCKER_HOLD_MINUTES: Joi.number().min(1).default(10),
  CORS_ORIGIN: Joi.string().default('*')
});
