'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import Sidebar from '@/components/Sidebar';

export default function TasksIndexPage() {
  const { boards, loadingBoards } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loadingBoards && boards.length > 0) {
      router.replace(`/tasks/${boards[0].id}`);
    }
  }, [boards, loadingBoards]);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loadingBoards
          ? <div className="spinner" />
          : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No boards yet</h3>
              <p>Click <strong>+</strong> next to "Task Boards" in the sidebar to create one</p>
            </div>
          )
        }
      </main>
    </div>
  );
}
