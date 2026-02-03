'use client';

import { ReactNode } from 'react';

interface MobileWrapperProps {
  children: ReactNode;
}

export function MobileWrapper({ children }: MobileWrapperProps) {
  return (
    <div className="min-h-screen bg-zinc-100">
      {/* Desktop: centered container | Mobile: full width */}
      <div className="mx-auto max-w-md min-h-screen bg-zinc-50 shadow-xl md:my-4 md:rounded-lg md:min-h-[calc(100vh-2rem)] overflow-hidden border border-zinc-200">
        {children}
      </div>
    </div>
  );
}
