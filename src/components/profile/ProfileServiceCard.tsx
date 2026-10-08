import Image from 'next/image';
import Link from 'next/link';
import {
  formatProfileServicePrice,
  resolveProfileServiceCtaUrl,
} from '@/lib/profileSiteClient';
import type { ProfileServiceDTO } from '@/types/profileSite';
import { PROFILE_SERVICE_CATEGORY_LABELS } from '@/types/profileSite';

export function ProfileServiceCard({
  service,
  bookingUrl,
  variant = 'card',
}: {
  service: ProfileServiceDTO;
  bookingUrl?: string | null;
  variant?: 'card' | 'detail';
}) {
  const category = service.category
    ? PROFILE_SERVICE_CATEGORY_LABELS[service.category]
    : null;
  const price = formatProfileServicePrice(
    service.priceFrom,
    service.currency,
    service.priceUnit
  );
  const ctaHref = resolveProfileServiceCtaUrl(service, bookingUrl);
  const ctaLabel = service.ctaLabel?.trim() || 'Inquire';
  const detailHref = service.slug?.trim() ? `/services/${encodeURIComponent(service.slug.trim())}` : undefined;
  const isDetail = variant === 'detail';

  return (
    <article className="bg-card rounded-lg sacred-shadow overflow-hidden flex flex-col">
      {service.coverImageUrl && (
        <div className={`relative w-full ${isDetail ? 'h-56' : 'h-40'} bg-muted`}>
          <Image src={service.coverImageUrl} alt="" fill className="object-cover" unoptimized />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        {category && (
          <p className="font-caption text-xs uppercase tracking-wide text-primary mb-2">{category}</p>
        )}
        <h3 className={`font-heading font-semibold ${isDetail ? 'text-2xl' : 'text-lg'} mb-1`}>
          {service.title}
        </h3>
        {price && <p className="text-sm font-semibold text-foreground mb-2">{price}</p>}
        {service.summary && (
          <p className={`font-body text-sm text-muted-foreground ${isDetail ? 'mb-4' : 'line-clamp-3 mb-4'}`}>
            {service.summary}
          </p>
        )}
        {isDetail && service.description && (
          <div className="font-body text-muted-foreground whitespace-pre-wrap mb-6">{service.description}</div>
        )}
        <div className="mt-auto flex flex-wrap gap-3">
          {!isDetail && detailHref && (
            <Link href={detailHref} className="text-sm text-primary font-semibold hover:underline">
              Details →
            </Link>
          )}
          {ctaHref && (
            <a
              href={ctaHref}
              target={ctaHref.startsWith('/') ? undefined : '_blank'}
              rel={ctaHref.startsWith('/') ? undefined : 'noopener noreferrer'}
              className="text-sm text-primary font-semibold hover:underline"
            >
              {ctaLabel} →
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
