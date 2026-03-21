import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { CalendarProvider } from '../contracts/calendar';

interface CalendarOauthStatePayload {
  userId: string;
  provider: CalendarProvider;
  redirectUri: string;
}

interface VerifiedCalendarOauthState extends CalendarOauthStatePayload {
  exp: number;
  iat: number;
}

@Injectable()
export class CalendarCryptoService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getEncryptionKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64url'),
      authTag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const [ivValue, authTagValue, encryptedValue] = value.split('.');
    if (!ivValue || !authTagValue || !encryptedValue) {
      return null;
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.getEncryptionKey(),
      Buffer.from(ivValue, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  signOauthState(payload: CalendarOauthStatePayload): {
    state: string;
    expiresAt: string;
  } {
    const ttlSeconds = 10 * 60;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = new Date((now + ttlSeconds) * 1000).toISOString();
    const state = jwt.sign(payload, this.getStateSecret(), {
      algorithm: 'HS256',
      expiresIn: ttlSeconds,
      issuer: 'vendrome-calendar',
      audience: 'vendrome-calendar-oauth',
    });

    return { state, expiresAt };
  }

  verifyOauthState(state: string): VerifiedCalendarOauthState {
    return jwt.verify(state, this.getStateSecret(), {
      algorithms: ['HS256'],
      issuer: 'vendrome-calendar',
      audience: 'vendrome-calendar-oauth',
    }) as VerifiedCalendarOauthState;
  }

  buildWebhookToken(integrationId: string): string {
    const signature = createHmac('sha256', this.getWebhookSecret())
      .update(integrationId)
      .digest('hex')
      .slice(0, 32);

    return `${integrationId}.${signature}`;
  }

  verifyWebhookToken(token: string | null | undefined): string | null {
    if (!token) {
      return null;
    }

    const [integrationId, signature] = token.split('.');
    if (!integrationId || !signature) {
      return null;
    }

    const expected = this.buildWebhookToken(integrationId).split('.')[1];
    return expected === signature ? integrationId : null;
  }

  private getEncryptionKey(): Buffer {
    const configured =
      this.configService.get<string>('CALENDAR_TOKEN_ENCRYPTION_KEY') ??
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      'vendrome-calendar-dev-key';

    return createHash('sha256').update(configured, 'utf8').digest();
  }

  private getStateSecret(): string {
    return (
      this.configService.get<string>('CALENDAR_OAUTH_STATE_SECRET') ??
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'vendrome-calendar-oauth-state'
    );
  }

  private getWebhookSecret(): string {
    return (
      this.configService.get<string>('CALENDAR_WEBHOOK_SECRET') ??
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      'vendrome-calendar-webhook'
    );
  }
}
