'use client';

import { useState, useEffect } from 'react';
import { GalleryEventCard } from './components/GalleryEventCard';
import { GalleryAlbumCard } from './components/GalleryAlbumCard';
import { GalleryTabs } from './components/GalleryTabs';
import { GallerySearch } from './components/GallerySearch';
import { GalleryPagination } from './components/GalleryPagination';
import { fetchEventsForGallery, fetchAlbumsForGallery } from './ApiServerActions';
import type { GalleryPageData, GalleryAlbumWithMedia } from './ApiServerActions';
import '@/styles/modernist-homepage.css';

const ITEMS_PER_PAGE = 20;

type TabType = 'albums' | 'events';

export function GalleryContent() {
  const [activeTab, setActiveTab] = useState<TabType>('albums');
  const [galleryData, setGalleryData] = useState<GalleryPageData | null>(null);
  const [albumsData, setAlbumsData] = useState<{
    albumsWithMedia: GalleryAlbumWithMedia[];
    totalAlbums: number;
    currentPage: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [albumsCount, setAlbumsCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [searchFilters, setSearchFilters] = useState({
    searchTerm: '',
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  });

  useEffect(() => {
    const determineDefaultTabAndLoad = async () => {
      setLoading(true);
      try {
        const albumsResult = await fetchAlbumsForGallery(0, 1, '', undefined, undefined);
        const albumsTotal = albumsResult.totalAlbums;
        const eventsResult = await fetchEventsForGallery(0, 1, '', undefined, undefined);
        const eventsTotal = eventsResult.totalEvents;

        setAlbumsCount(albumsTotal);
        setEventsCount(eventsTotal);

        let defaultTab: TabType = 'albums';
        if (albumsTotal > 0) defaultTab = 'albums';
        else if (eventsTotal > 0) defaultTab = 'events';

        setActiveTab(defaultTab);
        setInitialLoad(false);

        if (defaultTab === 'albums') {
          const data = await fetchAlbumsForGallery(0, ITEMS_PER_PAGE, '', undefined, undefined);
          setAlbumsData(data);
          setAlbumsCount(data.totalAlbums);
        } else {
          const data = await fetchEventsForGallery(0, ITEMS_PER_PAGE, '', undefined, undefined);
          setGalleryData(data);
          setEventsCount(data.totalEvents);
        }
      } catch (error) {
        console.error('Failed to determine default tab and load data:', error);
        setInitialLoad(false);
      } finally {
        setLoading(false);
      }
    };

    determineDefaultTabAndLoad();
  }, []);

  useEffect(() => {
    if (activeTab === 'albums' && !initialLoad) {
      const loadAlbumsData = async () => {
        setLoading(true);
        try {
          const data = await fetchAlbumsForGallery(
            currentPage,
            ITEMS_PER_PAGE,
            searchFilters.searchTerm,
            searchFilters.startDate,
            searchFilters.endDate
          );
          setAlbumsData(data);
          setAlbumsCount(data.totalAlbums);
        } catch (error) {
          console.error('Failed to fetch albums data:', error);
          setAlbumsData(null);
        } finally {
          setLoading(false);
        }
      };
      loadAlbumsData();
    }
  }, [activeTab, currentPage, searchFilters, initialLoad]);

  useEffect(() => {
    if (activeTab === 'events' && !initialLoad) {
      const loadEventsData = async () => {
        setLoading(true);
        try {
          const data = await fetchEventsForGallery(
            currentPage,
            ITEMS_PER_PAGE,
            searchFilters.searchTerm,
            searchFilters.startDate,
            searchFilters.endDate
          );
          setGalleryData(data);
          setEventsCount(data.totalEvents);
        } catch (error) {
          console.error('Failed to fetch events data:', error);
          setGalleryData(null);
        } finally {
          setLoading(false);
        }
      };
      loadEventsData();
    }
  }, [activeTab, currentPage, searchFilters, initialLoad]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentPage(0);
  };

  const handleSearch = (filters: {
    searchTerm: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setSearchFilters(filters);
    setCurrentPage(0);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const hasFilters = Boolean(
    searchFilters.searchTerm || searchFilters.startDate || searchFilters.endDate
  );

  const toolbar = (
    <div className="mh-events-toolbar mh-gallery-toolbar">
      <GalleryTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        albumsCount={albumsCount}
        eventsCount={eventsCount}
        loading={loading}
      />
      <p className="mh-events-hint">
        {activeTab === 'albums'
          ? 'Browse public photo albums. Use search to filter by title or date.'
          : 'Browse event based albums. Use search to filter by title or date.'}
      </p>
      <div className="mh-gallery-search-panel">
        <p className="mh-gallery-search-panel-label">Filter gallery</p>
        <GallerySearch
          key={activeTab}
          onSearch={handleSearch}
          loading={loading}
          mode={activeTab}
          committedSearchTerm={searchFilters.searchTerm}
          committedStartDate={searchFilters.startDate ?? ''}
          committedEndDate={searchFilters.endDate ?? ''}
          localItems={
            activeTab === 'albums'
              ? (albumsData?.albumsWithMedia?.map((a) => a.album as unknown as Record<string, unknown>) ??
                [])
              : (galleryData?.eventsWithMedia?.map((e) => e.event as unknown as Record<string, unknown>) ??
                [])
          }
          placeholder={
            activeTab === 'albums' ? 'Enter album title…' : 'Enter event title…'
          }
        />
      </div>
    </div>
  );

  if (activeTab === 'albums') {
    const hasAlbums =
      albumsData && albumsData.albumsWithMedia && albumsData.albumsWithMedia.length > 0;

    return (
      <div className="mh-gallery-content">
        {toolbar}

        {loading ? (
          <div className="mh-events-loading">Loading albums…</div>
        ) : !hasAlbums ? (
          <div className="mh-events-empty">
            <h3>{hasFilters ? 'No albums found' : 'No albums available'}</h3>
            <p>
              {hasFilters
                ? 'No albums match your search criteria. Try adjusting your filters.'
                : 'Check back later for album photos and videos.'}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() =>
                  handleSearch({ searchTerm: '', startDate: undefined, endDate: undefined })
                }
                className="mh-btn mh-btn-ghost"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="mh-events-grid">
            {albumsData?.albumsWithMedia?.map((albumWithMedia) => (
              <GalleryAlbumCard
                key={albumWithMedia.album.id}
                albumWithMedia={albumWithMedia}
              />
            ))}
          </div>
        )}

        <GalleryPagination
          currentPage={currentPage}
          totalPages={albumsData?.totalPages || 1}
          totalCount={albumsData?.totalAlbums || 0}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={handlePageChange}
          loading={loading}
          itemType="albums"
        />
      </div>
    );
  }

  const hasEvents =
    galleryData && galleryData.eventsWithMedia && galleryData.eventsWithMedia.length > 0;
  const { eventsWithMedia, totalEvents, totalPages } = galleryData || {
    eventsWithMedia: [],
    totalEvents: 0,
    totalPages: 0,
  };

  return (
    <div className="mh-gallery-content">
      {toolbar}

      {loading ? (
        <div className="mh-events-loading">Loading event galleries…</div>
      ) : !hasEvents ? (
        <div className="mh-events-empty">
          <h3>{hasFilters ? 'No events found' : 'No events available'}</h3>
          <p>
            {hasFilters
              ? 'No events match your search criteria. Try adjusting your filters.'
              : 'Check back later for event photos and videos.'}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() =>
                handleSearch({ searchTerm: '', startDate: undefined, endDate: undefined })
              }
              className="mh-btn mh-btn-ghost"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="mh-events-grid">
          {eventsWithMedia?.map((eventWithMedia) => (
            <GalleryEventCard
              key={eventWithMedia.event.id}
              eventWithMedia={eventWithMedia}
            />
          ))}
        </div>
      )}

      <GalleryPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalEvents}
        pageSize={ITEMS_PER_PAGE}
        onPageChange={handlePageChange}
        loading={loading}
        itemType="events"
      />
    </div>
  );
}
