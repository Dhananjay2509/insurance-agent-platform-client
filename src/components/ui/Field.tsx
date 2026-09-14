import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { useId } from 'react';
import { cn } from '../../utils/cn';

const CONTROL_CLASSES =
  'block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:bg-slate-50 disabled:text-slate-500';

interface FieldWrapperProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (id: string, invalid: boolean) => ReactNode;
}

/**
 * One wrapper for every form control so the label, hint, error text and ARIA
 * wiring are identical across the app and cannot drift per form.
 */
function FieldWrapper({ label, error, hint, required, children }: FieldWrapperProps) {
  const id = useId();
  const invalid = Boolean(error);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children(id, invalid)}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
  /** Rendered inside the control, e.g. a currency symbol. */
  prefix?: string;
}

export function TextField({ label, error, hint, required, prefix, className, ...props }: TextFieldProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      {(id, invalid) => (
        <div className="relative">
          {prefix ? (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-500">
              {prefix}
            </span>
          ) : null}
          <input
            id={id}
            aria-invalid={invalid}
            aria-errormessage={invalid ? `${id}-error` : undefined}
            className={cn(
              CONTROL_CLASSES,
              prefix && 'pl-7',
              invalid ? 'border-red-400 bg-red-50/40' : 'border-slate-300',
              className,
            )}
            {...props}
          />
        </div>
      )}
    </FieldWrapper>
  );
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export function SelectField({ label, error, hint, required, options, className, ...props }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      {(id, invalid) => (
        <select
          id={id}
          aria-invalid={invalid}
          aria-errormessage={invalid ? `${id}-error` : undefined}
          className={cn(
            CONTROL_CLASSES,
            'bg-white',
            invalid ? 'border-red-400 bg-red-50/40' : 'border-slate-300',
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldWrapper>
  );
}

interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  label: string;
  description?: string;
}

export function CheckboxField({ label, description, className, ...props }: CheckboxFieldProps) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        {...props}
      />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        {description ? <span className="block text-xs text-slate-500">{description}</span> : null}
      </label>
    </div>
  );
}
