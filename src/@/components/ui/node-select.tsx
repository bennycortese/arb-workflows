'use client';

import * as Select from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export interface NodeSelectOption {
  value: string;
  label: string;
}

interface Props {
  id?: string;
  label?: string;
  value: string;
  options: NodeSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export function NodeSelect({ id, label, value, options, onChange, placeholder = 'Select…' }: Props) {
  const selected = options.find(o => o.value === value);

  return (
    <div className="nodrag nopan space-y-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger
          id={id}
          className={cn(
            'nodrag nopan flex h-9 w-full items-center justify-between gap-2 rounded-md border border-white/[0.1]',
            'bg-white/[0.04] px-3 py-2 text-sm text-white/90',
            'hover:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-cyan-500/40',
          )}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <Select.Value placeholder={placeholder}>
            {selected?.label ?? placeholder}
          </Select.Value>
          <Select.Icon>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/35" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="nodrag nopan z-[100000] overflow-hidden rounded-lg border border-white/[0.12] bg-[rgba(8,10,18,0.98)] shadow-xl"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport className="p-1 max-h-56">
              {options.map(opt => (
                <Select.Item
                  key={opt.value}
                  value={opt.value}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm text-white/80',
                    'outline-none data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white',
                    'data-[state=checked]:text-cyan-300',
                  )}
                >
                  <Select.ItemText>{opt.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
