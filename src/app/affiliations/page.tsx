import Link from 'next/link';
import Image from 'next/image';
import SubpageHomeDesignBackground from '@/components/SubpageHomeDesignBackground';
import { fetchProfileAffiliationsForLinksServer } from '@/lib/profileSiteServer';

export default async function AffiliationsListPage() {
  const items = await fetchProfileAffiliationsForLinksServer();

  return (
    <>
      <SubpageHomeDesignBackground />
      <main className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-3">
            Affiliations
          </h1>
          <p className="font-body text-muted-foreground mb-10 max-w-2xl">
            Boards, communities, and organizations.
          </p>

          {items.length === 0 ? (
            <p className="font-body text-muted-foreground">No affiliations listed yet.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {items.map((a) => (
                <li key={a.id ?? a.organizationName} className="flex gap-4 bg-card rounded-lg sacred-shadow p-5">
                  {a.logoUrl && (
                    <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      <Image src={a.logoUrl} alt={a.organizationName} fill className="object-contain" unoptimized />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-heading font-semibold">{a.organizationName}</h2>
                    {a.role && <p className="text-sm text-primary">{a.role}</p>}
                    {a.description && (
                      <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                    )}
                    {a.url?.trim() && (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary font-semibold mt-2 inline-block hover:underline"
                      >
                        Visit →
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-10">
            <Link href="/" className="text-primary font-semibold hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
