import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type MorphBotAttrs = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  state?: string;
  shape?: string;
  size?: string | number;
  color?: string;
  'eye-color'?: string;
  'follow-pointer'?: boolean | '';
  label?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'morph-bot': MorphBotAttrs;
    }
  }
}
