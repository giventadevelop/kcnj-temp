import Link from 'next/link';
import Image from 'next/image';
import {
  fetchPublishedPublicProfileForPagesServer,
  fetchTenantOrganizationForProfilePagesServer,
} from '@/lib/profileSiteServer';

export const dynamic = 'force-dynamic';

const KCNJ_EMAIL = 'keralacenternj@gmail.com';

function formatOrgAddress(org: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  zipCode?: string | null;
  country?: string | null;
}): string | null {
  const line1 = [org.addressLine1, org.addressLine2].filter(Boolean).join(', ');
  const line2 = [org.city, org.stateProvince, org.zipCode].filter(Boolean).join(', ');
  const parts = [line1, line2, org.country].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export default async function ProfileAboutPage() {
  const [profile, org] = await Promise.all([
    fetchPublishedPublicProfileForPagesServer(),
    fetchTenantOrganizationForProfilePagesServer(),
  ]);

  const orgName = org?.organizationName?.trim() || 'Kerala Center of New Jersey (KCNJ)';
  const address = org ? formatOrgAddress(org) : null;
  const phone = org?.contactPhone?.trim() || '';
  const email = org?.contactEmail?.trim() || KCNJ_EMAIL;

  if (!profile) {
    return (
      <main className="min-h-screen bg-background pt-28 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="font-caption text-sm uppercase tracking-widest text-primary mb-2">About</p>
          <h1 className="font-heading text-4xl font-semibold text-foreground mb-4">{orgName}</h1>
          <p className="font-body text-lg text-muted-foreground leading-relaxed mb-8">
            Kerala Center of New Jersey (KCNJ) is a community organization based in New Jersey, USA. We host cultural
            events, programs, and gatherings for Malayalee families and friends in the region.
          </p>
          <div className="mb-10 p-4 bg-muted/50 rounded-xl border border-border/30 space-y-2">
            <p className="font-body text-foreground">New Jersey, USA</p>
            {address ? <p className="font-body text-foreground">{address}</p> : null}
            {phone ? <p className="font-body text-foreground">{phone}</p> : null}
            <p className="font-body text-foreground">
              <a href={`mailto:${email}`} className="text-primary font-semibold hover:underline">
                {email}
              </a>
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/contact" className="px-6 py-3 bg-primary text-primary-foreground rounded-sacred font-semibold">
              Contact
            </Link>
            <Link href="/" className="px-6 py-3 border border-border text-foreground rounded-sacred font-semibold">
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-28 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="font-caption text-sm uppercase tracking-widest text-primary mb-2">About</p>
        <h1 className="font-heading text-4xl font-semibold text-foreground mb-4">{profile.displayName}</h1>
        {profile.headline && (
          <p className="font-body text-xl text-muted-foreground mb-8">{profile.headline}</p>
        )}
        {profile.profileImageUrl && (
          <div className="relative w-32 h-32 rounded-full overflow-hidden mb-8 border-4 border-primary/30">
            <Image src={profile.profileImageUrl} alt={profile.displayName} fill className="object-cover" unoptimized />
          </div>
        )}
        {profile.bioMarkdown?.trim() ? (
          <div className="font-body text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed mb-10">
            {profile.bioMarkdown}
          </div>
        ) : (
          <p className="font-body text-muted-foreground mb-10">
            Kerala Center of New Jersey (KCNJ) is a community organization based in New Jersey, USA.
          </p>
        )}
        {(profile.location || profile.languages) && (
          <p className="text-sm text-muted-foreground mb-8">
            {[profile.location, profile.languages].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="mb-10 p-4 bg-muted/50 rounded-xl border border-border/30 space-y-1">
          <p className="font-caption text-xs uppercase tracking-wide text-primary mb-1">Organization</p>
          <p className="font-body text-foreground">{orgName}</p>
          <p className="font-body text-foreground">New Jersey, USA</p>
          {address ? <p className="font-body text-foreground">{address}</p> : null}
          {phone ? <p className="font-body text-foreground">{phone}</p> : null}
          <p className="font-body text-foreground">
            <a href={`mailto:${email}`} className="text-primary font-semibold hover:underline">
              {email}
            </a>
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/contact" className="px-6 py-3 bg-primary text-primary-foreground rounded-sacred font-semibold">
            Contact
          </Link>
          <Link href="/" className="px-6 py-3 border border-border text-foreground rounded-sacred font-semibold">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
