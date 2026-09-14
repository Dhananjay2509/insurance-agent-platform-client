import { cn } from '../../utils/cn';

export type JourneyStepState = 'done' | 'current' | 'todo';

export interface JourneyStep {
  label: string;
  state: JourneyStepState;
  hint?: string;
}

/**
 * Makes the required end-to-end flow visible on the screen the agent works
 * from: quote → document → share → payment link → payment → active policy.
 */
export function JourneyStepper({ steps }: { steps: JourneyStep[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                step.state === 'done' && 'bg-emerald-600 text-white',
                step.state === 'current' && 'bg-brand-600 text-white ring-4 ring-brand-100',
                step.state === 'todo' && 'bg-slate-200 text-slate-500',
              )}
            >
              {step.state === 'done' ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                  <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                'text-sm',
                step.state === 'todo' ? 'text-slate-400' : 'font-medium text-slate-800',
              )}
              title={step.hint}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <span aria-hidden="true" className="h-px w-6 bg-slate-300" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
