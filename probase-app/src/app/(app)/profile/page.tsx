'use client';

import { useMyProfile } from '@/lib/api/me';
import { ProfileAvatarCard } from '@/components/profile/profile-avatar-card';
import { ProfileDetailsForm } from '@/components/profile/profile-details-form';
import { ProfileFacts } from '@/components/profile/profile-facts';
import { ProfileSkeleton } from '@/components/shared/skeletons';

export default function ProfilePage() {
  const { data: profile, isPending, error } = useMyProfile();

  if (isPending) {
    return <ProfileSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-destructive/30 bg-card p-5 text-sm text-destructive">
        Không tải được hồ sơ của bạn.
      </div>
    );
  }

  const editable = profile.student !== null || profile.lecturer !== null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <ProfileAvatarCard profile={profile} />

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
