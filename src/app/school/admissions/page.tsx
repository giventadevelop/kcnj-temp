import SchoolNav from '@/components/school/SchoolNav';
import SchoolFeePayButton from '@/components/school/SchoolFeePayButton';
import { fetchSchoolResource, type SchoolFeeInvoiceRecord, type SchoolPageRecord } from '@/lib/school/schoolPublic';

export const metadata = { title: 'Admissions' };

function formatMoney(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default async function SchoolAdmissionsPage() {
  const [pages, invoices] = await Promise.all([
    fetchSchoolResource<SchoolPageRecord>('school-pages', {
      'slug.equals': 'admissions',
      'isActive.equals': 'true',
      size: '1',
    }),
    fetchSchoolResource<SchoolFeeInvoiceRecord>('school-fee-invoices', {
      'feeKind.equals': 'ADMISSION',
      'status.equals': 'OPEN',
      sort: 'id,desc',
    }),
  ]);
  const page = pages[0];

  return (
    <div>
      <SchoolNav />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-heading text-3xl mb-4">{page?.title || 'Admissions'}</h1>
        {page?.summary && <p className="text-gray-700 mb-4">{page.summary}</p>}
        {page?.body && <div className="whitespace-pre-wrap mb-8">{page.body}</div>}
        <h2 className="text-xl font-semibold mb-4">Admission fees</h2>
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <article key={invoice.id} className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold">{invoice.title}</h3>
              <p className="text-sm text-gray-600">
                {invoice.academicYear} {invoice.classLabel ? `· ${invoice.classLabel}` : ''}
              </p>
              <p className="text-lg font-semibold my-2">
                {formatMoney(Number(invoice.amountDue || 0), invoice.currency || 'INR')}
              </p>
              {invoice.id && <SchoolFeePayButton invoiceId={invoice.id} label="Pay admission fee" />}
            </article>
          ))}
          {invoices.length === 0 && <p className="text-gray-600">No open admission fee is published.</p>}
        </div>
      </main>
    </div>
  );
}
