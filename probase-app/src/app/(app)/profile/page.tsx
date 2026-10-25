'use client';

import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { useMyProfile } from '@/lib/api/me';
import { ProfileAvatarCard } from '@/components/profile/profile-avatar-card';
import { ProfileDetailsForm } from '@/components/profile/profile-details-form';
import { ProfileFacts } from '@/components/profile/profile-facts';
import { ProfileSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const { data: profile, isPending, error } = useMyProfile();

  if (isPending) {
    return <ProfileSkeleton />;
  }

  if (error || !profile) {
    return (
      <p className="text-sm text-destructive">Không tải được hồ sơ của bạn.</p>
    );
  }

  const editable = profile.student !== null || profile.lecturer !== null;

  return (
    <div className="mx-auto grid max-w-5xl items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {/*
        Identity and the password sit together in the narrow column, and what
        the faculty holds sits beside them. Splitting it the other way left the
        left-hand column a short card with three hundred pixels of nothing under
        it — and on a phone, where the columns stack, this order still reads as
        a sentence: this is you, this is how you get in, this is what the office
        has, this is what you may change.
      */}
      <div className="space-y-4">
        <ProfileAvatarCard profile={profile} />

        {/*
          One heading and one button. "Đặt lại mật khẩu" is a different thing
          and does not belong on a screen you reached by being signed in — a
          reset is for somebody who cannot get in, and it lives on the login
          page and in the admin's hands — but saying so here was explaining an
          absence to people who had not noticed one.
        */}
        <section className="space-y-3 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-medium">Bảo mật</h2>

          <Button variant="outline" render={<Link href="/change-password" />}>
            <KeyRound />
            Đổi mật khẩu
          </Button>
        </section>
      </div>

      {/*
        One card, one heading. The fixed half and the editable half are the same
        subject — this is you — so the rule between them is all the separation
        they need; two titled cards made the page argue about who owns which
        field before it had shown a single one.
      */}
      <section className="space-y-5 rounded-xl border bg-card p-5">
        <ProfileFacts profile={profile} />

        {editable && (
          <>
            <hr className="border-border" />
            <ProfileDetailsForm profile={profile} />
          </>
        )}
      </section>
    </div>
  );
}
