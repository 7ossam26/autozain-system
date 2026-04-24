import { NavLink } from 'react-router-dom';

export default function MobileNav({ items = [] }) {
  const visible = items.slice(0, 5);

  return (
    <nav className="fixed bottom-0 right-0 left-0 bg-surface border-t border-border-muted md:hidden z-20">
      <div className="flex">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 text-xs gap-1 transition-colors
                 ${isActive ? 'text-primary' : 'text-text-secondary'}`
              }
            >
              <Icon size={20} />
              <span className="truncate max-w-[60px] text-center">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
