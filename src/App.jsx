import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { Mail, FileText } from 'lucide-react';
import SendEmails from './pages/SendEmails.jsx';
import Templates from './pages/Templates.jsx';

const navItems = [
  {
    to: '/send',
    label: '📧 Send Emails',
    icon: Mail,
  },
  {
    to: '/templates',
    label: '📝 Templates',
    icon: FileText,
  },
];

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 md:flex">
      <aside className="bg-navy text-white md:min-h-screen md:w-72">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-200">Bulk Emailer</p>
            <h1 className="mt-2 text-2xl font-bold tracking-normal">Campaign Console</h1>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-4 py-4 md:flex-col md:gap-1 md:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'flex min-w-max items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition',
                      isActive
                        ? 'bg-primary text-white shadow-lg shadow-indigo-950/30'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white',
                    ].join(' ')
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/send" replace />} />
          <Route path="/send" element={<SendEmails />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="*" element={<Navigate to="/send" replace />} />
        </Routes>
      </main>
    </div>
  );
}
