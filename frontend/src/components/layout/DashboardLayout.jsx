import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-surface border-l border-border-muted p-4 hidden md:block">
        <div className="text-xl font-bold text-primary mb-6">أوتوزين</div>
        <nav className="text-text-secondary">
          {/* Sidebar nav populated in Phase 1+ */}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-surface border-b border-border-muted h-14 flex items-center px-4">
          <h1 className="font-semibold">لوحة التحكم</h1>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
