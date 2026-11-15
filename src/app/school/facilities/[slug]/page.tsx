import SchoolNav from '@/components/school/SchoolNav';
import { fetchSchoolResource, type SchoolNamedRecord } from '@/lib/school/schoolPublic';

export default async function SchoolFacilityPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const resolved = typeof (params as Promise<{ slug: string }>).then === 'function'
    ? await (params as Promise<{ slug: string }>)
    : (params as { slug: string });
  const rows = await fetchSchoolResource<SchoolNamedRecord>('school-facilities', {
    'slug.equals': resolved.slug,
    size: '1',
  });
  const row = rows[0];
  return (
    <div>
      <SchoolNav />
      <main className="max-w-3xl mx-auto px-4 py-10">
        {row ? (
          <>
            <h1 className="font-heading text-3xl mb-4">{row.name}</h1>
            {row.summary && <p className="text-gray-700 mb-4">{row.summary}</p>}
            {row.body && <div className="whitespace-pre-wrap">{row.body}</div>}
          </>
        ) : (
          <p>Facility not found.</p>
        )}
      </main>
    </div>
  );
}
