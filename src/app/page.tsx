import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import SchoolHome from '@/components/school/SchoolHome';
import { fetchFeaturedEventsForHomepageServer } from '@/lib/homepage/fetchFeaturedEventsServer';
import { fetchLiveEventsForHomepageServer } from '@/lib/homepage/fetchLiveEventsServer';
import { fetchTenantOrganizationForProfilePagesServer } from '@/lib/profileSiteServer';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Upcoming events, tickets, membership, and community updates.',
  keywords: ['home', 'events', 'tickets', 'membership', 'KCNJ'],
};

export default async function HomePage() {
  const organization = await fetchTenantOrganizationForProfilePagesServer();
  if (organization?.siteType === 'SCHOOL') {
    return <SchoolHome />;
  }
  const initialFeaturedEvents = await fetchFeaturedEventsForHomepageServer();
  const initialLiveEvents = await fetchLiveEventsForHomepageServer();
  return (
    <HomePageClient
      initialFeaturedEvents={initialFeaturedEvents}
      initialLiveEvents={initialLiveEvents}
    />
  );
}
