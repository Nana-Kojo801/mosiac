import { motion } from 'motion/react';

/** Segmented control with a sliding thumb (iOS-style). */
export function Seg<T extends string>({ id, value, options, onChange, role = 'radio', style }: { id: string; value: T; options: [T, string][]; onChange: (v: T) => void; role?: 'radio' | 'tab'; style?: React.CSSProperties }) {
  return (
    <div className="seg" role={role === 'tab' ? 'tablist' : 'radiogroup'} style={style}>
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <button key={v} type="button" role={role} {...(role === 'tab' ? { 'aria-selected': on } : { 'aria-checked': on })} aria-pressed={on} onClick={() => onChange(v)}>
            {on && <motion.span layoutId={`seg-${id}`} className="seg-thumb" transition={{ type: 'spring', stiffness: 700, damping: 45, mass: 0.6 }} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
