import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import { fetchFeaturedEventsForHomepageServer } from '@/lib/homepage/fetchFeaturedEventsServer';
import { fetchLiveEventsForHomepageServer } from '@/lib/homepage/fetchLiveEventsServer';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Upcoming events, tickets, membership, and community updates.',
  keywords: ['home', 'events', 'tickets', 'membership', 'KCNJ'],
};

export default async function HomePage() {
  const initialFeaturedEvents = await fetchFeaturedEventsForHomepageServer();
  const initialLiveEvents = await fetchLiveEventsForHomepageServer();
  return (
    <HomePageClient
      initialFeaturedEvents={initialFeaturedEvents}
      initialLiveEvents={initialLiveEvents}
    />
  );
}
