import Link from 'next/link';
import SchoolNav from '@/components/school/SchoolNav';
import { fetchSchoolHome } from '@/lib/school/schoolPublic';

function flashText(item: { headline?: string; title?: string }) {
  return item.headline || item.title || '';
}

export default async function SchoolHome() {
  const data = await fetchSchoolHome();
  const ticker = data.flashes.map(flashText).filter(Boolean);

  return (
    <div className="bg-background text-foreground">
      <SchoolNav />
      {ticker.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-900">
          {ticker.join('  ·  ')}
        </div>
      )}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-heading text-4xl mb-4">Welcome</h1>
        {data.principal ? (
          <article className="bg-white rounded-2xl p-6 shadow-sm mb-10">
            <h2 className="font-heading text-2xl mb-2">{data.principal.title || "Principal's message"}</h2>
            {data.principal.summary && <p className="text-gray-700 mb-3">{data.principal.summary}</p>}
            {data.principal.body && <p className="whitespace-pre-wrap text-gray-800">{data.principal.body}</p>}
          </article>
        ) : (
          <p className="text-gray-600 mb-10">The principal&apos;s message appears here when the school page slug principals-message is published.</p>
        )}
        <h2 className="font-heading text-2xl mb-4">Facilities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {data.facilities.map((facility) => (
            <Link key={facility.id} href={`/school/facilities/${facility.slug}`} className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold">{facility.name}</h3>
              {facility.summary && <p className="text-sm text-gray-600 mt-1">{facility.summary}</p>}
            </Link>
          ))}
        </div>
        <h2 className="font-heading text-2xl mb-4">Merit highlights</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {data.highlights.map((item) => (
            <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="font-semibold">{item.personName}</p>
              {item.subtitle && <p className="text-sm text-gray-600">{item.subtitle}</p>}
              {item.academicYear && <p className="text-xs text-gray-500">{item.academicYear}</p>}
            </div>
          ))}
        </div>
        <h2 className="font-heading text-2xl mb-4">Upcoming events</h2>
        <div className="grid gap-3">
          {data.events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="font-semibold">{event.title}</p>
              {event.startDate && <p className="text-sm text-gray-600">{event.startDate}</p>}
            </Link>
          ))}
          {data.events.length === 0 && <p className="text-gray-600">No upcoming events.</p>}
        </div>
      </section>
    </div>
  );
}
