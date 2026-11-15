import Link from 'next/link';
import SchoolNav from '@/components/school/SchoolNav';
import { fetchSchoolResource, type SchoolNamedRecord } from '@/lib/school/schoolPublic';

export const metadata = { title: 'Facilities' };

export default async function SchoolFacilitiesPage() {
  const rows = await fetchSchoolResource<SchoolNamedRecord>('school-facilities', {
    sort: 'sortOrder,asc',
    'isActive.equals': 'true',
  });
  return (
    <div>
      <SchoolNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-heading text-3xl mb-6">Facilities</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => (
            <Link key={row.id} href={`/school/facilities/${row.slug}`} className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="font-semibold">{row.name}</h2>
              {row.summary && <p className="text-sm text-gray-600 mt-1">{row.summary}</p>}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
