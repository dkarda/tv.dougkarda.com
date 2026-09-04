import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home' },
  { to: '/ratings', label: 'Ratings' },
  { to: '/stats', label: 'Stats' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/stopped', label: 'Stopped' },
  { to: '/browse', label: 'Browse' },
]

export function Layout() {
  return (
    <div className="min-h-svh bg-[#0b0d12] text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-[#0b0d12]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <NavLink
            to="/"
            className="text-lg font-semibold tracking-tight text-amber-300"
          >
            TheDoug TV
          </NavLink>
          <nav className="flex flex-wrap gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-sm ${
                    isActive
                      ? 'bg-amber-300 text-zinc-950'
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
