import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
  end?: boolean;
}

const icon = (path: string) => (
  <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
    <path d={path} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true, icon: icon('M4 13h6V4H4v9zm10 7h6v-9h-6v9zM4 20h6v-4H4v4zm10-11h6V4h-6v5z') },
  { to: '/customers', label: 'Customers', icon: icon('M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 19v-1a4 4 0 00-3-3.87M16.5 3.6a4 4 0 010 7.75') },
  { to: '/products', label: 'Products', icon: icon('M4 7l8-4 8 4-8 4-8-4zm0 0v10l8 4 8-4V7M12 11v10') },
  { to: '/policies', label: 'Policies', icon: icon('M12 3l7 2.6v6.3c0 4.4-3 8-7 9.1-4-1.1-7-4.7-7-9.1V5.6L12 3zm-2.6 9.1l2.1 2.1 4-4.3') },
];

/**
 * Shell for every authenticated screen: fixed sidebar, top bar with the signed
 * in agent, and an outlet for the page. Desktop-first, as specified — the
 * sidebar collapses rather than becoming a mobile drawer.
 */
export function AppLayout() {
  const { agent, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = (agent?.name ?? '')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
              <path
                d="M12 3l7 2.6v6.3c0 4.4-3 8-7 9.1-4-1.1-7-4.7-7-9.1V5.6L12 3z"
                fill="currentColor"
                opacity=".25"
              />
              <path d="M9 12.3l2.1 2.1 4-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">Agent Portal</p>
            <p className="truncate text-xs text-slate-500">Insurance Platform</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
              {initials || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{agent?.name}</p>
              <p className="truncate text-xs text-slate-500">{agent?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start"
            onClick={handleLogout}
            loading={signingOut}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 lg:hidden">
          <span className="text-sm font-semibold text-slate-900">Agent Portal</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} loading={signingOut}>
            Sign out
          </Button>
        </header>

        <main className="flex-1 px-6 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
