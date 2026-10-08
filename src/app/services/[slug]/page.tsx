import Link from 'next/link';
import { notFound } from 'next/navigation';
import SubpageHomeDesignBackground from '@/components/SubpageHomeDesignBackground';
import { ProfileServiceCard } from '@/components/profile/ProfileServiceCard';
import {
  fetchProfileServiceBySlugServer,
  fetchPublishedPublicProfileForPagesServer,
} from '@/lib/profileSiteServer';

interface ServiceSlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ServiceSlugPage({ params }: ServiceSlugPageProps) {
  const { slug } = await params;
  const [service, profile] = await Promise.all([
    fetchProfileServiceBySlugServer(decodeURIComponent(slug)),
    fetchPublishedPublicProfileForPagesServer(),
  ]);
  if (!service) {
    notFound();
  }

  return (
    <>
      <SubpageHomeDesignBackground />
      <main className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-3xl mx-auto mb-8">
          <Link href="/services" className="text-primary font-semibold hover:underline text-sm">
            ← Back to services
          </Link>
        </div>
        <div className="max-w-3xl mx-auto">
          <ProfileServiceCard service={service} bookingUrl={profile?.bookingUrl} variant="detail" />
        </div>
      </main>
    </>
  );
}
