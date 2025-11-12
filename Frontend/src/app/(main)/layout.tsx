'use client';

import * as React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Navbar } from '@/components/layout/Navbar';
import { PlayerBar } from '@/components/player/PlayerBar';
import { QueueDrawer } from '@/components/player/QueueDrawer';
import { AutoMoodDetector } from '@/components/mood/AutoMoodDetector';

/**
 * Main app layout with sidebar, navbar, and player
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queueOpen, setQueueOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:ml-64">
        <Navbar />
        <main id="main-content" className="pb-24 lg:pb-20">
          {children}
        </main>
      </div>
      <BottomNav />
      <PlayerBar onQueueOpen={() => setQueueOpen(true)} />
      <QueueDrawer open={queueOpen} onOpenChange={setQueueOpen} />
      
      {/* Auto mood detection on first load */}
      <AutoMoodDetector />
    </div>
  );
}
