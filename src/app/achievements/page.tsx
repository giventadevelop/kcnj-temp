import Link from 'next/link';
import Image from 'next/image';
import SubpageHomeDesignBackground from '@/components/SubpageHomeDesignBackground';
import { fetchProfileAchievementsServer } from '@/lib/profileSiteServer';
import { formatProfileDate } from '@/lib/profileSitePaths';

export default async function AchievementsListPage() {
  const items = await fetchProfileAchievementsServer();

  return (
    <>
      <SubpageHomeDesignBackground />
      <main className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-3">
            Achievements
          </h1>
          <p className="font-body text-muted-foreground mb-10 max-w-2xl">
            Awards, honors, speaking, and education milestones.
          </p>

          {items.length === 0 ? (
            <p className="font-body text-muted-foreground">No achievements listed yet.</p>
          ) : (
            <ul className="space-y-6">
              {items.map((a) => (
                <li key={a.id ?? a.title} className="bg-card rounded-lg sacred-shadow p-6 border-l-4 border-primary">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                    {a.imageUrl && (
                      <div className="relative w-full sm:w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        <Image src={a.imageUrl} alt="" fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="font-heading font-semibold text-lg">{a.title}</h2>
                          {a.issuer && <p className="text-sm text-muted-foreground">{a.issuer}</p>}
                          {a.category && (
                            <p className="font-caption text-xs text-primary mt-1">{a.category}</p>
                          )}
                        </div>
                        {a.achievementDate && (
                          <span className="text-sm font-caption text-primary whitespace-nowrap">
                            {formatProfileDate(a.achievementDate)}
                          </span>
                        )}
                      </div>
                      {a.description && (
                        <p className="font-body text-sm mt-2 text-muted-foreground">{a.description}</p>
                      )}
                      {a.url?.trim() && (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary font-semibold mt-2 inline-block hover:underline"
                        >
                          Learn more →
                        </a>
                      )}
                    </div>
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
