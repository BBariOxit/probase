import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { RawSheetRow } from './eligible-column-matcher.util';

export interface EligibleImportCommitSummary {
  totalRows: number;
  importedCount: number;
  createdAccountsCount: number;
  updatedExistingCount: number;
  errorCount: number;
  errors: { row: number; reason: string }[];
}

export interface EligibleImportSession {
  id: string;
  roundId: number;
  adminId: number;
  createdAt: Date;
  expiresAt: Date;
  fileName: string;
  rows: RawSheetRow[];
  maxCol: number;
  committed: boolean;
  commitResult?: EligibleImportCommitSummary;
}

const TTL_MS = 30 * 60 * 1_000;
const MAX_SESSIONS_PER_ADMIN = 5;
const SWEEP_INTERVAL_MS = 5 * 60 * 1_000;

@Injectable()
export class EligibleImportSessionService {
  private readonly sessions = new Map<string, EligibleImportSession>();

  constructor() {
    setInterval(() => this.sweep(), SWEEP_INTERVAL_MS).unref();
  }

  create(params: {
    roundId: number;
    adminId: number;
    fileName: string;
    rows: RawSheetRow[];
    maxCol: number;
  }): EligibleImportSession {
    const now = Date.now();
    const activeForAdmin = [...this.sessions.values()].filter(
      (s) =>
        s.adminId === params.adminId &&
        s.expiresAt.getTime() > now &&
        !s.committed,
    );

    // Evict oldest uncommitted session if the admin hits the per-admin cap
    // so retrying uploads inside the dialog never locks them out.
    if (activeForAdmin.length >= MAX_SESSIONS_PER_ADMIN) {
      activeForAdmin.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      const oldest = activeForAdmin[0];
      if (oldest) {
        this.sessions.delete(oldest.id);
      }
    }

    const session: EligibleImportSession = {
      id: randomUUID(),
      roundId: params.roundId,
      adminId: params.adminId,
      createdAt: new Date(now),
      expiresAt: new Date(now + TTL_MS),
      fileName: params.fileName,
      rows: params.rows,
      maxCol: params.maxCol,
      committed: false,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  get(
    sessionId: string,
    roundId: number,
    adminId: number,
  ): EligibleImportSession {
    const session = this.sessions.get(sessionId);

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      if (session) this.sessions.delete(sessionId);
      throw new NotFoundException(
        'Phiên import không tồn tại hoặc đã hết hạn (30 phút). Vui lòng tải file lên lại.',
      );
    }

    if (session.adminId !== adminId) {
      throw new ForbiddenException(
        'Phiên import không thuộc về tài khoản này.',
      );
    }

    if (session.roundId !== roundId) {
      throw new ConflictException(
        'Phiên import này thuộc đợt đăng ký khác. Vui lòng tải file lên lại cho đợt hiện tại.',
      );
    }

    return session;
  }

  markCommitted(sessionId: string, result: EligibleImportCommitSummary): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.committed = true;
      session.commitResult = result;
    }
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (session.expiresAt.getTime() <= now) {
        this.sessions.delete(id);
      }
    }
  }
}
