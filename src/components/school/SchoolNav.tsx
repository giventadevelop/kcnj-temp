import Link from 'next/link';

const LINKS = [
  { href: '/school/pages/about', label: 'About' },
  { href: '/school/staff', label: 'Staff' },
  { href: '/school/departments', label: 'Departments' },
  { href: '/school/facilities', label: 'Facilities' },
  { href: '/school/activities', label: 'Activities' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/news', label: 'News' },
  { href: '/downloads', label: 'Downloads' },
  { href: '/school/admissions', label: 'Admissions' },
  { href: '/contact', label: 'Contact' },
];

export default function SchoolNav() {
  return (
    <nav className="bg-white border-b border-gray-200" aria-label="School">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap gap-3">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-sm font-semibold text-blue-800 hover:text-blue-600">
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
