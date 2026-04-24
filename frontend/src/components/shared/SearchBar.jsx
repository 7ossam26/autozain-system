import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

/**
 * Debounced search input (Arabic-friendly).
 * Calls onSearch with the latest value after `delay` ms of inactivity.
 */
export default function SearchBar({ value = '', onSearch, placeholder = 'ابحث…', delay = 300, className = '' }) {
  const [input, setInput] = useState(value);

  useEffect(() => { setInput(value); }, [value]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (input !== value) onSearch(input);
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <div className={`relative ${className}`} dir="rtl">
      <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="w-full pr-10 pl-4 py-2.5 border border-border-muted rounded-md text-sm bg-surface focus:outline-none focus:border-primary"
      />
    </div>
  );
}
