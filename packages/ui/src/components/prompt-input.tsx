'use client';

import { Send } from '../icons.ts';
import { cn } from '../lib/utils.ts';
import type {
  FormEvent,
  FormEventHandler,
  HTMLAttributes,
  KeyboardEventHandler,
  TextareaHTMLAttributes,
} from 'react';
import { useCallback, useState } from 'react';

/**
 * AI Elements Prompt Input — Ronny-skall (Mikael 02.09.2026).
 * Samme navn og oppførsel som `elements.ai-sdk.dev` PromptInput:
 * textarea med field-sizing, Enter sender, Shift+Enter linjeskift,
 * Footer + Submit. Ikke hentet: model-picker, web-search, attachments,
 * command/select (Mikael + UI-PAKKER: ikke to chat-systemer).
 * Submit-ikon er eget `Send`-SVG, ikke lucide CornerDownLeft.
 */

export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

export interface PromptInputMessage {
  text: string;
  files?: never[];
}

export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, 'onSubmit'> & {
  onSubmit: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function PromptInput({ className, onSubmit, children, ...props }: PromptInputProps) {
  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const text = String(new FormData(form).get('message') ?? '');
      void onSubmit({ text }, event);
    },
    [onSubmit],
  );

  return (
    <form
      data-slot="prompt-input"
      className={cn('w-full', className)}
      onSubmit={handleSubmit}
      {...props}
    >
      {children}
    </form>
  );
}

export function PromptInputBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="prompt-input-body" className={cn('w-full', className)} {...props} />;
}

export type PromptInputTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function PromptInputTextarea({
  className,
  onKeyDown,
  placeholder = 'Spør Ronny …',
  ...props
}: PromptInputTextareaProps) {
  const [composing, setComposing] = useState(false);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key !== 'Enter' || e.shiftKey || composing || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const submit = e.currentTarget.form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit?.disabled) return;
    e.currentTarget.form?.requestSubmit();
  };

  return (
    <textarea
      data-workshop-input
      data-slot="prompt-input-textarea"
      name="message"
      rows={1}
      placeholder={placeholder}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => setComposing(true)}
      onCompositionEnd={() => setComposing(false)}
      className={cn(
        'field-sizing-content max-h-36 min-h-8 w-full resize-none bg-transparent px-3 py-2 text-body text-fg outline-none placeholder:text-fg-muted disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export function PromptInputFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="prompt-input-footer"
      className={cn('flex items-center justify-end gap-1 px-1.5 pb-1.5', className)}
      {...props}
    />
  );
}

export function PromptInputSubmit({
  className,
  status,
  children,
  disabled,
  ...props
}: HTMLAttributes<HTMLButtonElement> & {
  status?: ChatStatus;
  type?: 'submit' | 'button';
  disabled?: boolean;
}) {
  const busy = status === 'submitted' || status === 'streaming';
  return (
    <button
      type="submit"
      data-slot="prompt-input-submit"
      aria-label={busy ? 'Sender' : 'Send'}
      disabled={busy || disabled}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#111] text-white transition-opacity hover:opacity-90 disabled:opacity-40',
        className,
      )}
      {...props}
    >
      {children ?? <Send size={14} strokeWidth={2} />}
    </button>
  );
}
