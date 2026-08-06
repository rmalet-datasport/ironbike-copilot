import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { CampaignHistoryProvider } from '@/lib/context/CampaignHistoryContext';
import { BrandHistoryProvider } from '@/lib/context/BrandHistoryContext';
import { SidebarProvider } from '@/lib/context/SidebarContext';

export const metadata: Metadata = {
  title: 'Iron Bike Co-Pilot — Iron Bike Race Einsiedeln 2026',
  description: 'Marketing automation for event organizers by Datasport',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
        <SidebarProvider>
        <BrandHistoryProvider>
        <CampaignHistoryProvider>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <Topbar />
            <main style={{ flex: 1, overflowY: 'auto' }}>
              {children}
            </main>
          </div>
        </CampaignHistoryProvider>
        </BrandHistoryProvider>
        </SidebarProvider>
      </body>
    </html>
  );
}
