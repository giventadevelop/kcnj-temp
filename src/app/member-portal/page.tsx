import { Metadata } from 'next';
import MemberPortalClient from './MemberPortalClient';
import SubpageHomeDesignBackground from '@/components/SubpageHomeDesignBackground';
import PageHeaderRibbonMedia from '@/components/PageHeaderRibbonMedia';
import subpageStyles from '@/components/SubpageHomeDesign.module.css';

export const metadata: Metadata = {
  title: 'Members',
  description: 'Member portal – manage your membership and access member-only content.',
};

export default function MemberPortalPage() {
  return (
    <>
      <SubpageHomeDesignBackground bodyClass="member-portal-page-background" />

      <section className="mh-events-hero" aria-label="Members">
        <PageHeaderRibbonMedia />
        <div className="mh-events-hero-scrim" aria-hidden="true" />
        <div className="mh-events-hero-content">
          <div className="mh-events-hero-kicker">
            <span className="mh-dot" aria-hidden="true" />
            <span>Member access</span>
          </div>
          <h1>Members</h1>
          <p className="mh-events-hero-lede">
            Manage your membership and access member-only content.
          </p>
        </div>
      </section>

      <div
        className={`${subpageStyles.subpageRoot} home-page-layout relative z-[1] min-h-screen w-full overflow-x-hidden`}
      >
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          style={{ paddingTop: '2.5rem', paddingBottom: '2rem' }}
        >
          <div className="homepage-glass-card services-glass-card-face rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto">
            <MemberPortalClient homepageDesign hidePageHeader />
          </div>
        </div>
      </div>
    </>
  );
}
