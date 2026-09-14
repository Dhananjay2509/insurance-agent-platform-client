import type { ReactNode } from 'react';

/** Shared frame for the login and signup screens. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-brand-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M12 3l7 2.6v6.3c0 4.4-3 8-7 9.1-4-1.1-7-4.7-7-9.1V5.6L12 3z" fill="currentColor" opacity=".4" />
              <path d="M9 12.3l2.1 2.1 4-4.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-base font-semibold">Insurance Agent Platform</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-2xl font-semibold leading-snug">
            From first conversation to an active policy, in one place.
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-brand-100">
            {[
              'Capture a customer once and see exactly which products they qualify for.',
              'Generate a personalised quotation PDF and share it on WhatsApp.',
              'Collect payment through Stripe and activate cover automatically.',
            ].map((line) => (
              <li key={line} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-brand-200">
          Demonstration environment. Payments run in Stripe test mode.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer ? <p className="mt-6 text-center text-sm text-slate-500">{footer}</p> : null}
        </div>
      </div>
    </div>
  );
}
