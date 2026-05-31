'use client';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export interface SegmentedOption {
  value: string;
  label: string;
  /** yes / no — tints the active segment for binary markets */
  tone?: 'yes' | 'no' | 'neutral';
}

interface Props {
  id?: string;
  label?: string;
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
  className?: string;
}

const activeTone: Record<NonNullable<SegmentedOption['tone']>, string> = {
  yes: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.25)]',
  no: 'bg-red-500/15 text-red-300 border-red-500/30 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.2)]',
  neutral: 'bg-white/10 text-white border-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]',
};

export function SegmentedControl({ id, label, value, options, onChange, className }: Props) {
  return (
    <div className={cn('nodrag nopan', className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div
        id={id}
        role="group"
        className="flex gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1"
        onPointerDown={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {options.map(opt => {
          const active = value === opt.value;
          const tone = opt.tone ?? 'neutral';
          return (
            <button
              key={opt.value}
              type="button"
              className={cn(
                'nodrag nopan flex-1 min-w-0 rounded-md border border-transparent px-2 py-2 text-xs font-medium transition-all',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50',
                active
                  ? activeTone[tone]
                  : 'text-white/45 hover:text-white/75 hover:bg-white/[0.04]',
              )}
              aria-pressed={active}
              onPointerDown={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onClick={() => onChange(opt.value)}
            >
              <span className="block truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
