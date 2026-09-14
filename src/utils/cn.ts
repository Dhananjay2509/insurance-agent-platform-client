/** Joins conditional class names. Keeps JSX readable without pulling in clsx. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
