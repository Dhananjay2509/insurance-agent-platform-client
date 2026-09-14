import { useState } from 'react';
import { Button } from '../../components/ui/Button';

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.8 14.16c-.25.69-1.44 1.32-1.99 1.36-.53.04-1.02.23-3.44-.72-2.9-1.14-4.74-4.11-4.88-4.3-.14-.19-1.16-1.55-1.16-2.96 0-1.41.74-2.1 1-2.39.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.57.81 1.98.88 2.12.07.14.12.31.02.5-.09.19-.14.31-.28.47-.14.16-.3.36-.42.48-.14.14-.29.29-.12.57.16.29.73 1.2 1.56 1.94 1.07.95 1.97 1.25 2.26 1.39.28.14.45.12.61-.07.17-.19.71-.83.9-1.11.19-.29.38-.24.64-.14.26.09 1.66.78 1.95.93.28.14.47.21.54.33.07.12.07.69-.18 1.36z" />
  </svg>
);

/**
 * WhatsApp click-to-chat.
 *
 * This does NOT send a message. It opens WhatsApp with the recipient and text
 * pre-filled; the agent presses send. That avoids WhatsApp Business API
 * onboarding entirely — see docs/technical-decisions.md.
 */
export function WhatsAppShare({
  whatsAppUrl,
  shareUrl,
  label,
  helpText,
}: {
  whatsAppUrl: string;
  shareUrl: string;
  label: string;
  helpText: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the link is visible below regardless.
      setCopied(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="whatsapp"
          icon={<WhatsAppIcon />}
          onClick={() => window.open(whatsAppUrl, '_blank', 'noopener,noreferrer')}
        >
          {label}
        </Button>
        <Button variant="secondary" onClick={handleCopy}>
          {copied ? 'Link copied' : 'Copy link'}
        </Button>
      </div>

      <div className="rounded-lg bg-slate-50 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Shareable link</p>
        <p className="mt-1 break-all font-mono text-xs text-slate-600">{shareUrl}</p>
      </div>

      <p className="text-xs text-slate-500">{helpText}</p>
    </div>
  );
}
