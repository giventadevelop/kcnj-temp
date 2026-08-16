import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProfilePageWithLoading from '@/components/ProfilePageWithLoading';
import SubpageHomeDesignBackground from '@/components/SubpageHomeDesignBackground';
import PageHeaderRibbonMedia from '@/components/PageHeaderRibbonMedia';

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <>
      <SubpageHomeDesignBackground bodyClass="profile-page-background" />

      <section className="mh-events-hero" aria-label="Profile">
        <PageHeaderRibbonMedia />
        <div className="mh-events-hero-scrim" aria-hidden="true" />
        <div className="mh-events-hero-content">
          <div className="mh-events-hero-kicker">
            <span className="mh-dot" aria-hidden="true" />
            <span>KCNJ account</span>
          </div>
          <h1>Profile</h1>
          <p className="mh-events-hero-lede">
            Manage your account information and preferences.
          </p>
        </div>
      </section>

      <ProfilePageWithLoading initialUserId={userId} homepageDesign hidePageHeader />
    </>
  );
}
