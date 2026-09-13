'use client';

import React from 'react';
import { TabBar } from './TabBar';
import { Omnibox } from './Omnibox';
import { BookmarksBar } from './BookmarksBar';

export const BrowserHeader: React.FC = () => {
  return (
    <header className="w-full shrink-0 z-30 bg-slate-950 select-none shadow-md">
      <TabBar />
      <Omnibox />
      <BookmarksBar />
    </header>
  );
};
