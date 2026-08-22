'use client';

import { useRef, useState, useTransition } from 'react';
import { uploadCompetitionWinnerPhotoServer } from '@/app/admin/events/[id]/competitions/ApiServerActions';

interface Props {
  eventId: string;
  resultId: number;
  onUploaded: (winnerPhotoUrl: string, winnerMediaId: number) => void;
}

export default function WinnerPhotoUpload({ eventId, resultId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    startTransition(async () => {
      try {
        setError(null);
        const formData = new FormData();
        formData.append('file', file);
        const { fileUrl, mediaId } = await uploadCompetitionWinnerPhotoServer(
          eventId,
          resultId,
          formData
        );
        onUploaded(fileUrl, mediaId);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        if (inputRef.current) inputRef.current.value = '';
      }
    });
  };

  return (
    <div>
      <label
        className={`flex-shrink-0 h-14 rounded-xl bg-purple-100 hover:bg-purple-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 cursor-pointer ${
          isPending ? 'opacity-50 cursor-not-allowed hover:scale-100 pointer-events-none' : ''
        }`}
        title="Upload winner photo"
        aria-label="Upload winner photo"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          disabled={isPending}
          className="sr-only"
        />
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-200 flex items-center justify-center">
          {isPending ? (
            <svg className="animate-spin w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>
        <span className="font-semibold text-purple-700">
          {isPending ? 'Uploading...' : 'Upload photo'}
        </span>
      </label>
      {error && <p className="text-sm text-red-600 mt-2 max-w-md">{error}</p>}
    </div>
  );
}
