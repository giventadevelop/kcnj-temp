import SchoolNav from '@/components/school/SchoolNav';
import { fetchSchoolResource, type SchoolStaffRecord } from '@/lib/school/schoolPublic';

export const metadata = { title: 'Staff' };

export default async function SchoolStaffPage() {
  const staff = await fetchSchoolResource<SchoolStaffRecord>('school-staff-members', {
    sort: 'priorityOrder,asc',
    'isActive.equals': 'true',
  });
  const groups = new Map<string, SchoolStaffRecord[]>();
  for (const member of staff) {
    const label = `${member.staffCategory || 'STAFF'} / ${member.stage || 'ALL'}`;
    const list = groups.get(label) || [];
    list.push(member);
    groups.set(label, list);
  }

  return (
    <div>
      <SchoolNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-heading text-3xl mb-6">Staff</h1>
        {Array.from(groups.entries()).map(([label, members]) => (
          <section key={label} className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{label}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <article key={member.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold">{member.firstName} {member.lastName}</h3>
                  {member.designation && <p className="text-sm text-gray-700">{member.designation}</p>}
                  {member.qualification && <p className="text-sm text-gray-600">{member.qualification}</p>}
                  {member.subjectName && <p className="text-sm text-gray-600">{member.subjectName}</p>}
                  {member.classTeacherOf && <p className="text-sm text-gray-600">Class teacher: {member.classTeacherOf}</p>}
                </article>
              ))}
            </div>
          </section>
        ))}
        {staff.length === 0 && <p className="text-gray-600">No staff published yet.</p>}
      </main>
    </div>
  );
}
