import { HEADER_RIBBON } from '@/lib/headerRibbon';

/**
 * Responsive page header ribbon media for public list/detail shells.
 *
 * The ribbon files are flat #f2e7d5 canvases with the KCNJ motif on the right.
 * `.mh-events-hero` paints that same cream, then sizes this image by height and
 * pins it right, so the motif always shows in full while the band still reads
 * edge-to-edge. See `.cursor/rules/public_page_header_ribbon_banner.mdc`.
 */
export default function PageHeaderRibbonMedia({
  alt = '',
  className = 'mh-events-hero-media',
}: {
  alt?: string;
  className?: string;
}) {
  return (
    <figure className={className}>
      <picture className="mh-events-hero-picture">
        <source
          media="(max-width: 767px)"
          srcSet={HEADER_RIBBON.mobile}
          width={1200}
          height={720}
        />
        <source
          media="(min-width: 768px) and (max-width: 1023px)"
          srcSet={HEADER_RIBBON.tablet}
          width={1600}
          height={560}
        />
        <source
          media="(min-width: 1024px)"
          srcSet={`${HEADER_RIBBON.desktop} 2100w, ${HEADER_RIBBON.desktopRetina} 3360w`}
          sizes="46rem"
          width={3360}
          height={800}
        />
        <img
          src={HEADER_RIBBON.desktopRetina}
          alt={alt}
          width={3360}
          height={800}
          className="mh-events-hero-ribbon-img"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
    </figure>
  );
}
