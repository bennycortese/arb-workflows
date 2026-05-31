'use client';

import { SegmentedControl } from '@/components/ui/segmented-control';
import { NodeSelect } from '@/components/ui/node-select';
import type { KalshiConfig } from '../../atoms';

type Direction = KalshiConfig['direction'];

const DIRECTION_OPTIONS = [
  { value: 'above' as const, label: 'Above', tone: 'neutral' as const },
  { value: 'below' as const, label: 'Below', tone: 'neutral' as const },
  { value: 'any' as const, label: 'Any', tone: 'neutral' as const },
];

export function DirectionField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: Direction;
  onChange: (value: Direction) => void;
}) {
  return (
    <SegmentedControl
      id={id}
      label="Direction"
      value={value}
      onChange={v => onChange(v as Direction)}
      options={DIRECTION_OPTIONS}
    />
  );
}

export interface OutcomeOption {
  label: string;
  price?: number;
}

function isBinaryYesNo(options: OutcomeOption[]): boolean {
  return (
    options.length === 2 &&
    options[0].label.toLowerCase() === 'yes' &&
    options[1].label.toLowerCase() === 'no'
  );
}

export function OutcomeField({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: OutcomeOption[];
  onChange: (index: string) => void;
}) {
  const binary = isBinaryYesNo(options);

  if (binary || options.length <= 4) {
    return (
      <SegmentedControl
        id={id}
        label="Outcome"
        value={value}
        onChange={onChange}
        options={options.map((o, i) => ({
          value: String(i),
          label: binary
            ? o.label
            : o.price && o.price > 0
              ? `${o.label} · ${o.price}¢`
              : o.label,
          tone: binary ? (i === 0 ? 'yes' : 'no') : 'neutral',
        }))}
      />
    );
  }

  return (
    <NodeSelect
      id={id}
      label="Outcome"
      value={value}
      onChange={onChange}
      options={options.map((o, i) => ({
        value: String(i),
        label: o.price && o.price > 0 ? `${o.label} (${o.price}¢)` : o.label,
      }))}
    />
  );
}
