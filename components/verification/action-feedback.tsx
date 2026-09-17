import { AlertCircle, CheckCircle2, LoaderCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OperatorActionFeedback } from '@/lib/operator-action-feedback';

interface ActionFeedbackProps {
  feedback: OperatorActionFeedback;
  onDismiss?: () => void;
}

export function ActionFeedback({ feedback, onDismiss }: ActionFeedbackProps) {
  const Icon = feedback.phase === 'processing'
    ? LoaderCircle
    : feedback.phase === 'success'
      ? CheckCircle2
      : AlertCircle;

  return (
    <section
      aria-live={feedback.phase === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={cn(
        'mx-4 mt-3 grid grid-cols-[auto_1fr_auto] gap-3 rounded-xl border px-4 py-3 shadow-sm',
        feedback.phase === 'processing' && 'border-blue-200 bg-blue-50 text-blue-950',
        feedback.phase === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-950',
        feedback.phase === 'error' && 'border-red-200 bg-red-50 text-red-950',
      )}
    >
      <Icon className={cn('mt-0.5 size-5', feedback.phase === 'processing' && 'animate-spin')} />
      <div className="min-w-0">
        <h2 className="text-sm font-bold">{feedback.title}</h2>
        <p className="mt-0.5 text-sm">{feedback.detail}</p>
        <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
          <p><span className="font-bold">What happens next:</span> {feedback.nextStep}</p>
          <p><span className="font-bold">What to do:</span> {feedback.userAction}</p>
        </div>
      </div>
      {onDismiss && feedback.phase !== 'processing' ? (
        <Button type="button" variant="ghost" size="icon" onClick={onDismiss} aria-label="Dismiss action feedback">
          <X className="size-4" />
        </Button>
      ) : <span />}
    </section>
  );
}
