import Link from 'next/link';
import Image from 'next/image';
import SubpageHomeDesignBackground from '@/components/SubpageHomeDesignBackground';
import { fetchProfileFamilyMembersServer } from '@/lib/profileSiteServer';
import { PROFILE_FAMILY_RELATIONSHIP_LABELS } from '@/types/profileSite';

export default async function FamilyListPage() {
  const items = await fetchProfileFamilyMembersServer();

  return (
    <>
      <SubpageHomeDesignBackground />
      <main className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-3">
            Family
          </h1>
          <p className="font-body text-muted-foreground mb-10 max-w-2xl">
            Spouse, children, parents, siblings, and other family.
          </p>

          {items.length === 0 ? (
            <p className="font-body text-muted-foreground">No family members listed yet.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {items.map((m) => (
                <li key={m.id ?? m.displayName} className="flex gap-4 bg-card rounded-lg sacred-shadow p-5">
                  {m.photoUrl && (
                    <div className="relative w-16 h-16 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                      <Image src={m.photoUrl} alt={m.displayName} fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-heading font-semibold">{m.displayName}</h2>
                    <p className="text-sm text-primary">
                      {PROFILE_FAMILY_RELATIONSHIP_LABELS[m.relationship] ?? m.relationship}
                      {m.roleTitle ? ` · ${m.roleTitle}` : ''}
                    </p>
                    {m.description && (
                      <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                    )}
                    {m.url?.trim() && (
                      <a
                        href={m.url}
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
