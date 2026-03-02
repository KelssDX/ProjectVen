import { createHash, randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { DatabaseService } from '../database/database.service';
import type {
  AuthTokens,
  AuthUser,
  LoginBody,
  RegisterBody,
  UpdateVerificationBody,
} from './auth.types';

interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  first_name: string;
  last_name: string;
  user_type: 'sme' | 'entrepreneur' | 'investor' | 'mentor' | 'admin';
  is_verified: boolean;
  verification_level: 'basic' | 'verified' | 'trusted';
}

interface RefreshTokenClaims extends JwtPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
}

interface AccessTokenClaims extends JwtPayload {
  sub: string;
  userType: AuthUser['userType'];
  type: 'access';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    payload: RegisterBody,
    ipAddress: string | null,
    userAgent: string | null,
  ) {
    const passwordHash = await hash(payload.password, 12);

    const result = await this.databaseService.query<UserRow>(
      `
        INSERT INTO users (
          email,
          password_hash,
          first_name,
          last_name,
          user_type
        ) VALUES ($1, $2, $3, $4, $5::user_type)
        RETURNING
          id,
          email,
          password_hash,
          first_name,
          last_name,
          user_type,
          is_verified,
          verification_level
      `,
      [
        payload.email,
        passwordHash,
        payload.firstName,
        payload.lastName,
        payload.userType,
      ],
    );

    const user = result.rows[0];
    return this.createSessionResponse(user, ipAddress, userAgent);
  }

  async login(payload: LoginBody, ipAddress: string | null, userAgent: string | null) {
    const result = await this.databaseService.query<UserRow>(
      `
        SELECT
          id,
          email,
          password_hash,
          first_name,
          last_name,
          user_type,
          is_verified,
          verification_level
        FROM users
        WHERE email = $1
          AND deleted_at IS NULL
          AND is_active = TRUE
        LIMIT 1
      `,
      [payload.email],
    );

    const user = result.rows[0];
    if (!user?.password_hash) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    const passwordMatches = await compare(payload.password, user.password_hash);
    if (!passwordMatches) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    return this.createSessionResponse(user, ipAddress, userAgent);
  }

  async refresh(refreshToken: string, ipAddress: string | null, userAgent: string | null) {
    const claims = this.verifyRefreshToken(refreshToken);
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    const sessionResult = await this.databaseService.query<{ id: string }>(
      `
        SELECT id
        FROM auth_sessions
        WHERE id = $1
          AND user_id = $2
          AND refresh_token_hash = $3
          AND revoked_at IS NULL
          AND expires_at > now()
        LIMIT 1
      `,
      [claims.sessionId, claims.sub, refreshTokenHash],
    );

    if (!sessionResult.rows[0]) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is invalid or expired.',
        },
      });
    }

    const userResult = await this.databaseService.query<UserRow>(
      `
        SELECT
          id,
          email,
          password_hash,
          first_name,
          last_name,
          user_type,
          is_verified,
          verification_level
        FROM users
        WHERE id = $1
          AND deleted_at IS NULL
          AND is_active = TRUE
        LIMIT 1
      `,
      [claims.sub],
    );

    const user = userResult.rows[0];
    if (!user) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is invalid or expired.',
        },
      });
    }

    const tokens = this.generateTokens(user.id, claims.sessionId, user.user_type);
    const nextRefreshTokenHash = this.hashRefreshToken(tokens.refreshToken);
    const refreshExpiry = new Date(Date.now() + tokens.refreshTokenExpiresInSeconds * 1000);

    await this.databaseService.query(
      `
        UPDATE auth_sessions
        SET
          refresh_token_hash = $1,
          expires_at = $2,
          ip_address = COALESCE($3::inet, ip_address),
          user_agent = COALESCE($4, user_agent)
        WHERE id = $5
      `,
      [nextRefreshTokenHash, refreshExpiry, ipAddress, userAgent, claims.sessionId],
    );

    return {
      user: this.mapUser(user),
      tokens,
    };
  }

  async logout(refreshToken: string) {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    await this.databaseService.query(
      `
        UPDATE auth_sessions
        SET revoked_at = now()
        WHERE refresh_token_hash = $1
          AND revoked_at IS NULL
      `,
      [refreshTokenHash],
    );

    return { success: true as const };
  }

  async getCurrentUser(accessToken: string): Promise<AuthUser> {
    const claims = this.verifyAccessToken(accessToken);
    const user = await this.findActiveUserById(claims.sub);
    if (!user) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_ACCESS_TOKEN',
          message: 'Access token is invalid or expired.',
        },
      });
    }
    return this.mapUser(user);
  }

  async getCurrentUserVerification(accessToken: string): Promise<{
    isVerified: boolean;
    verificationLevel: AuthUser['verificationLevel'];
  }> {
    const user = await this.getCurrentUser(accessToken);
    return {
      isVerified: user.isVerified,
      verificationLevel: user.verificationLevel,
    };
  }

  async updateUserVerification(
    actorAccessToken: string,
    targetUserId: string,
    payload: UpdateVerificationBody,
  ): Promise<AuthUser> {
    const actorClaims = this.verifyAccessToken(actorAccessToken);
    if (actorClaims.userType !== 'admin') {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access is required for this action.',
        },
      });
    }

    const result = await this.databaseService.query<UserRow>(
      `
        UPDATE users
        SET
          is_verified = $1,
          verification_level = $2::verification_level
        WHERE id = $3
          AND deleted_at IS NULL
        RETURNING
          id,
          email,
          password_hash,
          first_name,
          last_name,
          user_type,
          is_verified,
          verification_level
      `,
      [payload.isVerified, payload.verificationLevel, targetUserId],
    );

    const updated = result.rows[0];
    if (!updated) {
      throw new NotFoundException({
        error: {
          code: 'TARGET_USER_NOT_FOUND',
          message: 'Target user was not found.',
        },
      });
    }

    return this.mapUser(updated);
  }

  private async createSessionResponse(
    user: UserRow,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const sessionId = randomUUID();
    const tokens = this.generateTokens(user.id, sessionId, user.user_type);
    const refreshTokenHash = this.hashRefreshToken(tokens.refreshToken);
    const refreshExpiry = new Date(Date.now() + tokens.refreshTokenExpiresInSeconds * 1000);

    await this.databaseService.query(
      `
        INSERT INTO auth_sessions (
          id,
          user_id,
          refresh_token_hash,
          user_agent,
          ip_address,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5::inet, $6)
      `,
      [sessionId, user.id, refreshTokenHash, userAgent, ipAddress, refreshExpiry],
    );

    return {
      user: this.mapUser(user),
      tokens,
    };
  }

  private mapUser(user: UserRow): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: user.user_type,
      isVerified: user.is_verified,
      verificationLevel: user.verification_level,
    };
  }

  private async findActiveUserById(userId: string): Promise<UserRow | null> {
    const result = await this.databaseService.query<UserRow>(
      `
        SELECT
          id,
          email,
          password_hash,
          first_name,
          last_name,
          user_type,
          is_verified,
          verification_level
        FROM users
        WHERE id = $1
          AND deleted_at IS NULL
          AND is_active = TRUE
        LIMIT 1
      `,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  private generateTokens(
    userId: string,
    sessionId: string,
    userType: AuthUser['userType'],
  ): AuthTokens {
    const accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'dev-access-secret-change-me',
    );
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret-change-me',
    );

    const accessTokenExpiresInSeconds = Number(
      this.configService.get<string>('JWT_ACCESS_TTL_SECONDS', '900'),
    );
    const refreshTokenExpiresInSeconds = Number(
      this.configService.get<string>('JWT_REFRESH_TTL_SECONDS', '2592000'),
    );

    const accessToken = jwt.sign(
      {
        sub: userId,
        userType,
        type: 'access',
      },
      accessSecret,
      {
        expiresIn: accessTokenExpiresInSeconds,
      },
    );

    const refreshToken = jwt.sign(
      {
        sub: userId,
        sessionId,
        type: 'refresh',
      },
      refreshSecret,
      {
        expiresIn: refreshTokenExpiresInSeconds,
      },
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresInSeconds,
      refreshTokenExpiresInSeconds,
    };
  }

  private verifyRefreshToken(refreshToken: string): RefreshTokenClaims {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret-change-me',
    );

    try {
      const decoded = jwt.verify(refreshToken, refreshSecret) as RefreshTokenClaims;
      if (decoded.type !== 'refresh' || !decoded.sub || !decoded.sessionId) {
        throw new Error('Invalid refresh token claims.');
      }
      return decoded;
    } catch {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is invalid or expired.',
        },
      });
    }
  }

  private verifyAccessToken(accessToken: string): AccessTokenClaims {
    const accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'dev-access-secret-change-me',
    );

    try {
      const decoded = jwt.verify(accessToken, accessSecret) as AccessTokenClaims;
      if (decoded.type !== 'access' || !decoded.sub || !decoded.userType) {
        throw new Error('Invalid access token claims.');
      }
      return decoded;
    } catch {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_ACCESS_TOKEN',
          message: 'Access token is invalid or expired.',
        },
      });
    }
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }
}
