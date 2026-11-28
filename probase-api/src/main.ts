import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';

function trustedProxyHops(): number {
  const configured = process.env.TRUST_PROXY_HOPS;
  if (!configured) return 0;

  const hops = Number(configured);
  if (!Number.isInteger(hops) || hops < 0) {
    // Refusing to start beats starting with rate limiting quietly disabled.
    throw new Error(
      `TRUST_PROXY_HOPS must be a non-negative integer, got "${configured}"`,
    );
  }
  return hops;
}

function normalizeOrigin(raw: string): string {
  return raw
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/+$/, '');
}

function toOriginMatcher(entry: string): string | RegExp {
  if (!entry.includes('*')) return entry;
  const escaped = entry
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]+');
  return new RegExp(`^${escaped}$`);
}

function configuredCorsOrigins(): (string | RegExp)[] {
  const raw = [
    process.env.FRONTEND_URL ?? 'http://localhost:3000',
    process.env.CORS_ORIGINS ?? '',
  ].join(',');

  const seen = new Set<string>();
  const matchers: (string | RegExp)[] = [];
  for (const part of raw.split(',')) {
    const normalized = normalizeOrigin(part);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    matchers.push(toOriginMatcher(normalized));
  }
  return matchers;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const hops = trustedProxyHops();
  if (hops > 0) app.set('trust proxy', hops);

  app.use(cookieParser());
  const allowedOrigins: (string | RegExp)[] = [
    ...configuredCorsOrigins(),
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:3002',
    /^http:\/\/localhost:[0-9]+$/,
    /^http:\/\/127\.0\.0\.1:[0-9]+$/,
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
