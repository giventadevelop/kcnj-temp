import Link from 'next/link';
import SubpageHomeDesignBackground from '@/components/SubpageHomeDesignBackground';
import { ProfileServiceCard } from '@/components/profile/ProfileServiceCard';
import {
  fetchActiveProfileServicesServer,
  fetchPublishedPublicProfileForPagesServer,
} from '@/lib/profileSiteServer';

export default async function ServicesListPage() {
  const [services, profile] = await Promise.all([
    fetchActiveProfileServicesServer(),
    fetchPublishedPublicProfileForPagesServer(),
  ]);

  return (
    <>
      <SubpageHomeDesignBackground />
      <main className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-3">
            Services
          </h1>
          <p className="font-body text-muted-foreground mb-10 max-w-2xl">
            Professional services offered on this site, such as tax consulting and financial consulting.
          </p>

          {services.length === 0 ? (
            <p className="font-body text-muted-foreground">No services listed yet.</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <li key={service.id ?? service.slug ?? service.title}>
                  <ProfileServiceCard service={service} bookingUrl={profile?.bookingUrl} />
                </li>
              ))}
            </ul>
          )}

          <p className="mt-10">
            <Link href="/" className="text-primary font-semibold hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
