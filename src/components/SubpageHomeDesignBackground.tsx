'use client';

import { useLayoutEffect } from 'react';
import '@/styles/modernist-homepage.css';

type SubpageHomeDesignBackgroundProps = {
  /** Optional body class for page-specific overrides (e.g. `membership-page-background`) */
  bodyClass?: string;
};

/**
 * Applies the homepage organic design system to public subpages.
 * Body classes `modernist-home` + `organic-home` are also set globally by
 * PublicOrganicDesignBody; this keeps optional page-specific body classes.
 */
export default function SubpageHomeDesignBackground({ bodyClass }: SubpageHomeDesignBackgroundProps) {
  useLayoutEffect(() => {
    document.body.classList.add('modernist-home', 'organic-home');
    if (bodyClass) document.body.classList.add(bodyClass);
    return () => {
      if (bodyClass) document.body.classList.remove(bodyClass);
    };
  }, [bodyClass]);

  return null;
}
