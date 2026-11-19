// Mosaic design tokens. Approved at Gate 1 on 2026-11-19 (indigo accent).
// Shared by the web app's mobile and desktop layouts (spec 12.4). The design
// previews in design/ keep their own frozen copy, which also holds the teal
// candidate that was not chosen.
//
// Layout concept: calm cool-neutral ground, solid reading surfaces for evidence,
// Liquid Glass reserved for chrome (bars, sheets, inspectors, floating controls).

export const themes = {
  light: {
    // ground and surfaces
    'bg': '#EEF0F5',
    'bg-deep': '#E4E7EE',
    'surface': '#FFFFFF',
    'surface-2': '#F6F7FA',
    'surface-sunk': '#ECEEF3',
    'ink': '#12141B',
    'ink-2': '#4A4F5E',
    'ink-3': '#7A7F8E',
    'hairline': 'rgba(18, 20, 27, 0.09)',
    'hairline-strong': 'rgba(18, 20, 27, 0.16)',
    'focus': '#3346D3',
    // semantic risk (never used as accent)
    'risk-low-fg': '#4B5468', 'risk-low-bg': '#E9ECF2',
    'risk-mod-fg': '#8A4B00', 'risk-mod-bg': '#FFF1D6',
    'risk-high-fg': '#B23A12', 'risk-high-bg': '#FFE6DC',
    'risk-crit-fg': '#A3121F', 'risk-crit-bg': '#FFDDE0',
    'ok-fg': '#1D6B47', 'ok-bg': '#DDF3E7',
    'unassessed-fg': '#5B4A99', 'unassessed-bg': '#ECE8FB',
    // inference sources
    'src-device-fg': '#0F6A5B', 'src-device-bg': '#D9F2EC',
    'src-cloud-fg': '#2B56B8', 'src-cloud-bg': '#DFE8FB',
    'src-rules-fg': '#4B5468', 'src-rules-bg': '#E9ECF2',
    // evidence highlight
    'mark-bg': 'rgba(255, 184, 64, 0.30)',
    'mark-line': '#D88A00',
    'mark-active-bg': 'rgba(255, 140, 40, 0.42)',
    'diff-del-bg': '#FFE3E1', 'diff-del-fg': '#9B1C14',
    'diff-add-bg': '#DDF3E7', 'diff-add-fg': '#14583A',
    // glass
    'glass-tint': 'rgba(255, 255, 255, 0.58)',
    'glass-tint-strong': 'rgba(255, 255, 255, 0.76)',
    'glass-rim': 'rgba(255, 255, 255, 0.70)',
    'glass-rim-outer': 'rgba(18, 20, 27, 0.08)',
    'glass-spec-a': 'rgba(255, 255, 255, 0.95)',
    'glass-spec-b': 'rgba(255, 255, 255, 0.55)',
    'glass-shadow': '0 10px 30px -8px rgba(30, 36, 60, 0.22), 0 2px 6px rgba(30, 36, 60, 0.08)',
    'glass-opaque': '#F8F9FB',
    'scrim': 'rgba(18, 20, 27, 0.28)',
    'tile-a': 'rgba(51, 70, 211, 0.035)',
    'tile-b': 'rgba(15, 106, 91, 0.03)',
    'tile-c': 'rgba(216, 138, 0, 0.03)',
  },
  dark: {
    'bg': '#0C0D12',
    'bg-deep': '#07080B',
    'surface': '#171920',
    'surface-2': '#1D2029',
    'surface-sunk': '#12141A',
    'ink': '#ECEEF5',
    'ink-2': '#B1B5C3',
    'ink-3': '#80859A',
    'hairline': 'rgba(236, 238, 245, 0.09)',
    'hairline-strong': 'rgba(236, 238, 245, 0.18)',
    'focus': '#9AA6FF',
    'risk-low-fg': '#C3C8D6', 'risk-low-bg': '#262A35',
    'risk-mod-fg': '#FFC86B', 'risk-mod-bg': '#3A2A0E',
    'risk-high-fg': '#FF9D7A', 'risk-high-bg': '#43200F',
    'risk-crit-fg': '#FF8A93', 'risk-crit-bg': '#481018',
    'ok-fg': '#7FDCAA', 'ok-bg': '#12321F',
    'unassessed-fg': '#C3B6FF', 'unassessed-bg': '#2A2347',
    'src-device-fg': '#7FE0CB', 'src-device-bg': '#0F302A',
    'src-cloud-fg': '#9DBBFF', 'src-cloud-bg': '#16264A',
    'src-rules-fg': '#C3C8D6', 'src-rules-bg': '#262A35',
    'mark-bg': 'rgba(255, 184, 64, 0.22)',
    'mark-line': '#FFB648',
    'mark-active-bg': 'rgba(255, 150, 60, 0.38)',
    'diff-del-bg': '#4A1714', 'diff-del-fg': '#FFB3AC',
    'diff-add-bg': '#123522', 'diff-add-fg': '#9BE7BE',
    'glass-tint': 'rgba(34, 37, 48, 0.55)',
    'glass-tint-strong': 'rgba(34, 37, 48, 0.78)',
    'glass-rim': 'rgba(255, 255, 255, 0.14)',
    'glass-rim-outer': 'rgba(0, 0, 0, 0.45)',
    'glass-spec-a': 'rgba(255, 255, 255, 0.38)',
    'glass-spec-b': 'rgba(255, 255, 255, 0.12)',
    'glass-shadow': '0 14px 36px -10px rgba(0, 0, 0, 0.65), 0 2px 8px rgba(0, 0, 0, 0.4)',
    'glass-opaque': '#1F222C',
    'scrim': 'rgba(0, 0, 0, 0.5)',
    'tile-a': 'rgba(154, 166, 255, 0.05)',
    'tile-b': 'rgba(127, 224, 203, 0.035)',
    'tile-c': 'rgba(255, 182, 72, 0.035)',
  },
};

// Approved accent (owner decision, Gate 1). Risk and source colours stay separate.
export const accent = {
  light: { 'accent': '#3346D3', 'accent-ink': '#FFFFFF', 'accent-soft': '#E4E7FB', 'accent-text': '#2C3CB8' },
  dark: { 'accent': '#8E9BFF', 'accent-ink': '#0C0D12', 'accent-soft': '#232850', 'accent-text': '#AEB8FF' },
};

// Glass parameters shared by mobile and desktop (12.4).
export const glass = {
  'glass-blur': '22px',
  'glass-blur-strong': '34px',
  'glass-sat': '1.8',
  'glass-radius-bar': '28px',
  'glass-radius-sheet': '30px',
  'refraction-scale': '34',
  'refraction-edge': '22',
};

export const type = {
  'font-ui': '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  'font-mono': 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
  // iOS-flavoured scale (pt == px on web)
  'fs-large-title': '34px',
  'fs-title-1': '28px',
  'fs-title-2': '22px',
  'fs-title-3': '20px',
  'fs-headline': '17px',
  'fs-body': '17px',
  'fs-callout': '16px',
  'fs-subhead': '15px',
  'fs-footnote': '13px',
  'fs-caption': '12px',
  'fs-micro': '11px',
};

export const motion = {
  'spring': 'cubic-bezier(0.22, 1.12, 0.36, 1)',
  'ease-out': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  'dur-1': '160ms',
  'dur-2': '280ms',
  'dur-3': '460ms',
};
