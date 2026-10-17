import { type CSSProperties, type ReactNode, createContext, useContext, useEffect, useMemo } from 'react';
import { type Palette, derivePalette, paletteVars } from './derive';
import type { BrandingTheme } from '@/domain/types';
import { cn } from '@/lib/cn';

const PaletteContext = createContext<Palette>(derivePalette('nubo'));

export function usePalette() {
  return useContext(PaletteContext);
}

interface Props {
  presetId: string;
  overrides?: Partial<Pick<BrandingTheme, 'accent' | 'mode'>>;
  children: ReactNode;
  className?: string;
  /** Also paint the page background and browser bar (for full-page scopes). */
  page?: boolean;
  style?: CSSProperties;
}

/** Applies a theme's CSS variables to its subtree. Nested scopes are allowed (live previews). */
export function ThemeScope({ presetId, overrides, children, className, page, style }: Props) {
  const palette = useMemo(() => derivePalette(presetId, overrides), [presetId, overrides?.accent, overrides?.mode]);
  const vars = useMemo(() => paletteVars(palette), [palette]);

  useEffect(() => {
    if (!page) return;
    document.body.style.background = palette.paper;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = palette.paper;
  }, [page, palette.paper]);

  return (
    <PaletteContext.Provider value={palette}>
      <div
        data-mode={palette.mode}
        className={cn('bg-paper text-ink', page && 'min-h-dvh', className)}
        style={{ ...(vars as CSSProperties), ...style }}
      >
        {children}
      </div>
    </PaletteContext.Provider>
  );
}
