import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import PageHeaderRibbonMedia from '@/components/PageHeaderRibbonMedia';
import { PollList } from '@/components/polls/PollList';
import { fetchUserProfileServer } from '@/app/profile/ApiServerActions';
import PollsPageBackground from './PollsPageBackground';
import '@/styles/modernist-homepage.css';

export default async function PollsPage() {
  // CRITICAL: Next.js 15+ requires headers() to be awaited before calling auth()
  await headers();
  const authResult = await auth();
  const { userId } = authResult;

  let userProfile = null;
  if (userId) {
    try {
      userProfile = await fetchUserProfileServer(userId);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  return (
    <>
      <PollsPageBackground />
      <main className="mh-events-page modernist-home mh-polls-page">
        <section className="mh-events-hero" aria-label="Polls">
          <PageHeaderRibbonMedia />
          <div className="mh-events-hero-scrim" aria-hidden="true" />
          <div className="mh-events-hero-content">
            <div className="mh-events-hero-kicker">
              <span className="mh-dot" aria-hidden="true" />
              <span>Community voice</span>
            </div>
            <h1>Polls</h1>
            <p className="mh-events-hero-lede">
              Participate in interactive polls and share your opinions with our community.
            </p>
          </div>
        </section>

        <div className="mh-events-body">
          <PollList userId={userProfile?.id} />
        </div>
      </main>
    </>
  );
}
