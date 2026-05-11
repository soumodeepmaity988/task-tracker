import './globals.css';
import { AppProvider } from '@/contexts/AppContext';

export const metadata = {
  title: 'TaskFlow – Task Tracker & Subject Store',
  description: 'Manage tasks on a Kanban board and organize your study subjects in one place.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
