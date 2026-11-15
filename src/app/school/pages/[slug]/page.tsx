import SchoolNav from '@/components/school/SchoolNav';
import { fetchSchoolResource, type SchoolPageRecord } from '@/lib/school/schoolPublic';

export default async function SchoolContentPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const resolved = typeof (params as Promise<{ slug: string }>).then === 'function'
    ? await (params as Promise<{ slug: string }>)
    : (params as { slug: string });
  const rows = await fetchSchoolResource<SchoolPageRecord>('school-pages', {
    'slug.equals': resolved.slug,
    'isActive.equals': 'true',
    size: '1',
  });
  const page = rows[0];
  return (
    <div>
      <SchoolNav />
      <main className="max-w-3xl mx-auto px-4 py-10">
        {page ? (
          <>
            <h1 className="font-heading text-3xl mb-4">{page.title}</h1>
            {page.summary && <p className="text-gray-700 mb-4">{page.summary}</p>}
            {page.body && <div className="whitespace-pre-wrap">{page.body}</div>}
          </>
        ) : (
          <p>Page not found.</p>
        )}
      </main>
    </div>
  );
}
