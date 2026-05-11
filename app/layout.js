import './globals.css';
import { AppProvider } from '@/contexts/AppContext';
import { PomodoroProvider } from '@/contexts/PomodoroContext';
import CommandPalette from '@/components/CommandPalette';
import PomodoroPill from '@/components/PomodoroPill';
import UndoToast from '@/components/UndoToast';
import ThemeScript from '@/components/ThemeScript';

export const metadata = {
  title: 'TaskFlow – Task Tracker & Subject Store',
  description: 'Manage tasks on a Kanban board and organize your study subjects in one place.',
};

// All pages mount the Sidebar, which calls useSearchParams. Render dynamically
// rather than at build time so we don't need Suspense wrappers everywhere.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><ThemeScript /></head>
      <body suppressHydrationWarning>
        <AppProvider>
          <PomodoroProvider>
            {children}
            <CommandPalette />
            <PomodoroPill />
            <UndoToast />
          </PomodoroProvider>
        </AppProvider>
      </body>
    </html>
  );
}
