import { Suspense } from 'react';
import PageHeaderRibbonMedia from '@/components/PageHeaderRibbonMedia';
import GalleryPageBackground from './GalleryPageBackground';
import { GalleryContent } from './GalleryContent';
import '@/styles/modernist-homepage.css';

export default function GalleryPage() {
  return (
    <>
      <GalleryPageBackground />
      <main className="mh-events-page modernist-home mh-gallery-page">
        <section className="mh-events-hero" aria-label="Gallery">
          <PageHeaderRibbonMedia />
          <div className="mh-events-hero-scrim" aria-hidden="true" />
          <div className="mh-events-hero-content">
            <div className="mh-events-hero-kicker">
              <span className="mh-dot" aria-hidden="true" />
              <span>KCNJ memories</span>
            </div>
            <h1>Gallery</h1>
            <p className="mh-events-hero-lede">
              Explore albums and event photos in one place.
            </p>
          </div>
        </section>

        <div className="mh-events-body">
          <Suspense
            fallback={<div className="mh-events-loading">Loading gallery…</div>}
          >
            <GalleryContent />
          </Suspense>
        </div>
      </main>
    </>
  );
}
