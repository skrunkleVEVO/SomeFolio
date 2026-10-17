import { useId, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { getCategory } from '../lib/categories';
import { cn } from '../lib/cn';

export const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-base text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-accent-400/60 md:text-sm';

export const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500';

/**
 * Inputs for a category's `fields` (lib/categories.js). `values` is a metadata
 * object; `onChange(key, value)` receives `null` for a cleared field.
 */
export default function MetadataFields({ category, values, onChange, exclude = [] }) {
  const id = useId();
  const fields = getCategory(category).fields.filter((f) => !exclude.includes(f.key));
  if (!fields.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map((field) => (
        <div key={field.key} className={field.type === 'tags' || field.key === 'link' ? 'col-span-2' : undefined}>
          <label htmlFor={`${id}-${field.key}`} className={labelClass}>
            {field.label}
          </label>
          <FieldInput id={`${id}-${field.key}`} field={field} value={values[field.key]} onChange={(v) => onChange(field.key, v)} />
        </div>
      ))}
    </div>
  );
}

function FieldInput({ id, field, value, onChange }) {
  switch (field.type) {
    case 'number':
      return (
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={field.min}
          max={field.max}
          value={value ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className={cn(inputClass, 'tabular-nums')}
        />
      );
    case 'select': {
      const options = value && !field.options.includes(value) ? [value, ...field.options] : field.options;
      return (
        <div className="relative">
          <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className={cn(inputClass, 'appearance-none pr-9')}>
            <option value="" className="bg-zinc-900">
              —
            </option>
            {options.map((o) => (
              <option key={o} value={o} className="bg-zinc-900">
                {o}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        </div>
      );
    }
    case 'tags':
      return <TagInput id={id} value={value || []} onChange={onChange} placeholder={field.placeholder} />;
    default:
      return (
        <>
          <input
            id={id}
            type={field.key === 'link' ? 'url' : 'text'}
            value={value ?? ''}
            placeholder={field.placeholder}
            list={field.list ? `${id}-list` : undefined}
            maxLength={200}
            onChange={(e) => onChange(e.target.value || null)}
            className={inputClass}
          />
          {field.list && (
            <datalist id={`${id}-list`}>
              {field.list.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          )}
        </>
      );
  }
}

/** Free-form tags: Enter or comma adds, Backspace on an empty input removes the last one. */
function TagInput({ id, value, onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const tag = draft.trim();
    setDraft('');
    if (tag && !value.some((t) => t.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
  };

  return (
    <div className={cn(inputClass, 'flex flex-wrap items-center gap-1.5 py-2 focus-within:border-accent-400/60')}>
      {value.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded-full bg-accent-400/15 py-0.5 pl-2.5 pr-1 text-xs font-medium text-accent-200">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.length > 1 ? value.filter((t) => t !== tag) : null)}
            aria-label={`Remove tag ${tag}`}
            className="grid size-4 place-items-center rounded-full hover:bg-white/15"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.length > 1 ? value.slice(0, -1) : null);
          }
        }}
        onBlur={commit}
        maxLength={32}
        placeholder={value.length ? '' : placeholder}
        className="min-w-24 flex-1 bg-transparent outline-none placeholder:text-zinc-500"
      />
    </div>
  );
}
