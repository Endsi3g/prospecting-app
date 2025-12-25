import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AppLayout } from '@/layouts/AppLayout';
import { TodayDashboard } from '@/pages/TodayDashboard';
import { ProspectsPage } from '@/pages/ProspectsPage';
import { ProspectDetailPage } from '@/pages/ProspectDetailPage';
import { ListsPage } from '@/pages/ListsPage';
import { ImportPage } from '@/pages/ImportPage';
import { GeneratePage } from '@/pages/GeneratePage';
import { MessagesPage } from '@/pages/MessagesPage';
import { CampaignsPage } from '@/pages/CampaignsPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { ExportPage } from '@/pages/ExportPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AnalyzePage } from '@/pages/AnalyzePage';
import { SearchPage } from '@/pages/SearchPage';
import { SequencesPage } from '@/pages/SequencesPage';
import { PipelinePage } from '@/pages/PipelinePage';
import { AutomationsPage } from '@/pages/AutomationsPage';
import { ApifyActorsPage } from '@/pages/ApifyActorsPage';
import { CommandPalette } from '@/components/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function AppContent() {
  const { open, setOpen } = useCommandPalette();

  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<TodayDashboard />} />
          <Route path="/prospects" element={<ProspectsPage />} />
          <Route path="/prospects/:id" element={<ProspectDetailPage />} />
          <Route path="/lists" element={<ListsPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/sequences" element={<SequencesPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/tools/apify" element={<ApifyActorsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
      <CommandPalette open={open} onOpenChange={setOpen} />
      <Toaster position="bottom-right" />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
