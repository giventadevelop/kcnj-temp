import { getAppUrl } from '@/lib/env';
import FocusGroupsGridWithSearch from './FocusGroupsGridWithSearch';
import SubpageHomeDesignBackground from '@/components/SubpageHomeDesignBackground';
import PageHeaderRibbonMedia from '@/components/PageHeaderRibbonMedia';
import subpageStyles from '@/components/SubpageHomeDesign.module.css';

async function fetchEventsForGroup(baseUrl: string, groupId: number) {
  try {
    const res = await fetch(`${baseUrl}/api/proxy/event-details?focusGroupId.equals=${groupId}&isActive.equals=true&sort=startDate,asc&size=3`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function FocusGroupsPage() {
  const baseUrl = getAppUrl();
  const sort = 'name,asc';
  const size = 50;

  let groups: any[] = [];
  let total = 0;
  try {
    const res = await fetch(`${baseUrl}/api/proxy/focus-groups?isActive.equals=true&page=0&size=${size}&sort=${encodeURIComponent(sort)}`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      groups = Array.isArray(data) ? data : [];
      total = Number(res.headers.get('x-total-count') || groups.length || 0);
    }
  } catch { }

  const groupsWithEvents = await Promise.all(
    groups.map(async (group) => {
      const events = group?.id ? await fetchEventsForGroup(baseUrl, group.id) : [];
      return { ...group, events };
    })
  );

  return (
    <>
      <SubpageHomeDesignBackground bodyClass="focus-groups-page-background" />

      <section className="mh-events-hero" aria-label="Focus Groups">
        <PageHeaderRibbonMedia />
        <div className="mh-events-hero-scrim" aria-hidden="true" />
        <div className="mh-events-hero-content">
          <div className="mh-events-hero-kicker">
            <span className="mh-dot" aria-hidden="true" />
            <span>Community circles</span>
          </div>
          <h1>Focus Groups</h1>
          <p className="mh-events-hero-lede">
            Explore our specialized groups and their upcoming activities.
          </p>
        </div>
      </section>

      <div
        className={`${subpageStyles.subpageRoot} home-page-layout relative z-[1] min-h-screen w-full overflow-x-hidden`}
      >
        <div
          className="w-full max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8"
          style={{ paddingTop: '2.5rem', paddingBottom: '2rem' }}
        >
          <div className="homepage-glass-card services-glass-card-face rounded-2xl p-6 lg:p-8 mb-8 w-full max-w-[75%] mx-auto">
            <FocusGroupsGridWithSearch groups={groupsWithEvents} total={total} />
          </div>
        </div>
      </div>
    </>
  );
}
