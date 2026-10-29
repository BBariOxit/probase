import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './core/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CloudinaryModule } from './core/cloudinary/cloudinary.module';
import { LecturersModule } from './modules/lecturers/lecturers.module';
import { MeModule } from './modules/me/me.module';
import { MailModule } from './core/mail/mail.module';
import { MajorsModule } from './modules/majors/majors.module';
import { NotificationsModule } from './core/notifications/notifications.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { OutlinesModule } from './modules/outlines/outlines.module';
import { ProgressModule } from './modules/progress/progress.module';
import { ProjectTypesModule } from './modules/project-types/project-types.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { RegistrationModule } from './modules/registration/registration.module';
import { RemindersModule } from './core/reminders/reminders.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReviewersModule } from './modules/reviewers/reviewers.module';
import { RoundsModule } from './modules/rounds/rounds.module';
import { SemestersModule } from './modules/semesters/semesters.module';
import { StudentsModule } from './modules/students/students.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { TopicsModule } from './modules/topics/topics.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // One loose ceiling, applied to every route separately — the storage key is
    // hashed from the controller and handler name alongside the caller, so this
    // is 120 requests a minute per endpoint, not 120 across the API. Credential
    // endpoints override it per route with @Throttle; a second named bucket
    // would not work, because every configured throttler applies to every route.
    //
    // Counting is per IP and in-memory: it resets on restart and does not span
    // instances. That is why brute-force protection does not live here — it is
    // counted per account, in the database, by AuthService. What is left for
    // this is capping how hard one host can hammer one endpoint, which an IP
    // count does well and needs no durability.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      // Nest's default is "ThrottlerException: Too Many Requests" — a framework
      // class name, in English, on a Vietnamese screen, telling nobody what to
      // do. The client used to paper over it with a canned string, which then
      // also overwrote the messages that did say something useful.
      errorMessage: 'Bạn gửi quá nhiều yêu cầu. Đợi một phút rồi thử lại.',
    }),
    // The clock the deadline reminders run on, and the only scheduled work in
    // the system. Everything else is worked out when somebody looks — which is
    // the right answer for state, and the wrong one for a notice, because the
    // reader who needs a reminder is the one not opening the app.
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    AuthModule,
    CloudinaryModule,
    LecturersModule,
    MajorsModule,
    MeModule,
    NotificationsModule,
    RoundsModule,
    SemestersModule,
    ProjectTypesModule,
    ProposalsModule,
    StudentsModule,
    SubmissionsModule,
    TopicsModule,
    OutlinesModule,
    ProgressModule,
    RegistrationModule,
    RemindersModule,
    ReportsModule,
    ReviewersModule,
    UsersModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Registered here rather than in AuthModule so the ceiling covers every
    // route, including ones added later that nobody remembers to annotate.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
