import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';

const TRANSMISSIONS = [
  { value: '',          label: 'الكل' },
  { value: 'automatic', label: 'أوتوماتيك' },
  { value: 'manual',    label: 'عادي' },
];

const FUELS = [
  { value: '',         label: 'الكل' },
  { value: 'benzine',  label: 'بنزين' },
  { value: 'diesel',   label: 'ديزل' },
  { value: 'gas',      label: 'غاز' },
  { value: 'electric', label: 'كهرباء' },
  { value: 'hybrid',   label: 'هايبرد' },
];

/**
 * FilterSidebar — RTL Sylndr-style filters.
 * @param {{
 *   filters: object,          // { car_type: string[], model: string[], price_min, price_max, ... }
 *   onChange: (f) => void,
 *   options: object,          // { brands, modelsByBrand, priceRange, odometerRange }
 *   onClose?: () => void,     // Mobile close
 *   mobile?: boolean
 * }} props
 */
export default function FilterSidebar({ filters, onChange, options, onClose, mobile }) {
  const [local, setLocal] = useState(filters);

  // Re-sync when outer filters change (URL sync)
  useEffect(() => { setLocal(filters); }, [filters]);

  const brands = options?.brands ?? [];
  const modelsByBrand = options?.modelsByBrand ?? {};
  const priceMin = options?.priceRange?.min ?? 0;
  const priceMax = options?.priceRange?.max ?? 0;

  // Available models depend on selected brands.
  const availableModels = (() => {
    const selectedBrands = local.car_type ?? [];
    if (selectedBrands.length === 0) {
      // All models
      return Object.values(modelsByBrand).flat();
    }
    return selectedBrands.flatMap((b) => modelsByBrand[b] ?? []);
  })();

  function update(patch) {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  }

  function toggleInArray(key, value) {
    const arr = local[key] ?? [];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    update({ [key]: next });
  }

  function clearAll() {
    const empty = {
      car_type: [], model: [],
      price_min: '', price_max: '',
      odometer_min: '', odometer_max: '',
      transmission: '', fuel_type: '', color: '',
    };
    setLocal(empty);
    onChange(empty);
  }

  return (
    <aside
      className={`bg-surface border border-border-muted rounded-md ${mobile ? '' : 'sticky top-4'}`}
      dir="rtl"
    >
      <div className="flex items-center justify-between p-4 border-b border-border-muted">
        <h2 className="font-semibold text-text-primary">الفلاتر</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={clearAll}
            className="text-xs text-text-secondary hover:text-primary"
          >
            مسح الكل
          </button>
          {mobile && onClose && (
            <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-5 max-h-[calc(100vh-8rem)] overflow-y-auto">
        {/* Brand (multi-select) */}
        {brands.length > 0 && (
          <Section title="النوع">
            <div className="space-y-1.5 max-h-48 overflow-y-auto pl-1">
              {brands.map((b) => (
                <Check
                  key={b}
                  label={b}
                  checked={(local.car_type ?? []).includes(b)}
                  onChange={() => toggleInArray('car_type', b)}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Model (dependent) */}
        {availableModels.length > 0 && (
          <Section title="الموديل">
            <div className="space-y-1.5 max-h-48 overflow-y-auto pl-1">
              {Array.from(new Set(availableModels)).sort().map((m) => (
                <Check
                  key={m}
                  label={m}
                  checked={(local.model ?? []).includes(m)}
                  onChange={() => toggleInArray('model', m)}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Price */}
        <Section title={`السعر ${priceMax ? `(${formatNumber(priceMin)} — ${formatNumber(priceMax)} ج.م)` : ''}`}>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              placeholder="من"
              value={local.price_min ?? ''}
              onChange={(v) => update({ price_min: v })}
            />
            <NumberInput
              placeholder="إلى"
              value={local.price_max ?? ''}
              onChange={(v) => update({ price_max: v })}
            />
          </div>
        </Section>

        {/* Transmission */}
        <Section title="ناقل الحركة">
          <div className="flex flex-col gap-1.5">
            {TRANSMISSIONS.map((t) => (
              <Radio
                key={t.value}
                label={t.label}
                checked={(local.transmission ?? '') === t.value}
                onChange={() => update({ transmission: t.value })}
              />
            ))}
          </div>
        </Section>

        {/* Odometer */}
        <Section title="العداد (كم)">
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              placeholder="من"
              value={local.odometer_min ?? ''}
              onChange={(v) => update({ odometer_min: v })}
            />
            <NumberInput
              placeholder="إلى"
              value={local.odometer_max ?? ''}
              onChange={(v) => update({ odometer_max: v })}
            />
          </div>
        </Section>

        {/* Color */}
        <Section title="اللون">
          <input
            type="text"
            value={local.color ?? ''}
            onChange={(e) => update({ color: e.target.value })}
            placeholder="أبيض، أسود…"
            className="w-full px-3 py-2 border border-border-muted rounded-sm text-sm bg-surface focus:outline-none focus:border-primary"
          />
        </Section>

        {/* Fuel */}
        <Section title="نوع الوقود">
          <div className="flex flex-col gap-1.5">
            {FUELS.map((f) => (
              <Radio
                key={f.value}
                label={f.label}
                checked={(local.fuel_type ?? '') === f.value}
                onChange={() => update({ fuel_type: f.value })}
              />
            ))}
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-text-primary mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-text-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}

function Radio({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-text-primary">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}

function NumberInput({ value, onChange, placeholder }) {
  return (
    <input
      type="number"
      min="0"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-border-muted rounded-sm text-sm bg-surface focus:outline-none focus:border-primary"
    />
  );
}
