'use client';
import Link from 'next/link';
import { useMagnetic } from './hooks/useMagnetic';

// Paper / lime buttons (passport site). Only transform and opacity animate: a 1px lift on hover
// (the `transform` property, not Tailwind's `translate` utilities, so the transition covers it);
// reduced motion keeps them still.
const BASE =
  'inline-flex items-center gap-2 rounded-[12px] font-sans text-[15px] leading-tight px-[22px] py-3 ' +
  'transition-[transform,opacity] duration-150 ease-out hover:[transform:translateY(-1px)] active:[transform:none] ' +
  'disabled:cursor-not-allowed disabled:[transform:none] motion-reduce:transition-none motion-reduce:hover:[transform:none] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-ink';

const VARIANTS = {
  primary: 'bg-lime text-night-1 font-extrabold', // #15231a on #b8cf5d: 9.4:1
  secondary: 'border-[1.5px] border-page-ink bg-page text-page-ink font-bold',
  ghost: 'border border-page-ink text-page-ink font-bold',
};

export default function Btn({ as = 'button', variant = 'primary', href, children, className = '', magnetic = false, ...rest }) {
  const ref = magnetic ? useMagnetic() : null;
  const cls = `${BASE} ${VARIANTS[variant] || VARIANTS.primary} ${className}`;
  if (href) {
    return <Link href={href} ref={ref} className={cls} {...rest}>{children}</Link>;
  }
  const Tag = as;
  return <Tag ref={ref} className={cls} {...rest}>{children}</Tag>;
}
