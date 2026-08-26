'use client';

import { Button } from '@endwise/ui/components/button';
import { cn } from '@endwise/ui/lib/utils';
import { Questionnaire as Primitive } from '@shadcn/react/questionnaire';
import type * as React from 'react';

/*
 * shadcn/ui `questionnaire` — stil-skallet, skrevet.
 * Se ui-pakker.md §9.
 * Denne er ikke kopiert fra registeret
 * `message` og `message-scroller` ble hentet med `npx shadcn@latest view`.
 * `questionnaire` ligger ikke i det offentlige style-registeret
 * (`/r/styles/new-york-v4/questionnaire.json` → 404, verifisert );
 * bare dokumentasjonssidene finnes. **Oppførselen** — flersteg, enkelt-/
 * flervalg, fritekst, hopp over, tastatursnarveier, validering — kommer likevel
 * fra `@shadcn/react/questionnaire`, samme pakke som scrolleren bruker.
 * Denne fila er derfor **kun stil på et ekte shadcn-primitiv**, skrevet mot den
 * dokumenterte API-en (Root · Progress · Item · Title · Description · Choices
 * Choice · Input · Error · Actions · Previous · Skip · Next · Submit).
 * Blir komponenten publisert i registeret senere, bør denne byttes ut mot
 * den kanoniske i stedet for å vedlikeholdes videre.
 * Hva den brukes til hos oss
 * Human-in-the-loop: agenten kan ikke gjette, så den spør. Se `ask_user` i
 * `tool-part.tsx`. Et fritekstsvar fra en kunde er `customer_freetext` og skal
 * behandles deretter — den regelen ligger på serveren, ikke her.
 */

export const Questionnaire = Primitive.Root;
export const QuestionnaireChoiceInput = Primitive.ChoiceInput;
export const QuestionnaireChoiceLabel = Primitive.ChoiceLabel;

export function QuestionnaireProgress({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Progress>) {
  return (
    <Primitive.Progress
      data-slot="questionnaire-progress"
      className={cn('text-[12px] text-fg-muted', className)}
      {...props}
    />
  );
}

export function QuestionnaireItem({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      data-slot="questionnaire-item"
      className={cn(
        'flex min-w-0 flex-col gap-3 border-0 p-0',
        // Kun det aktive spørsmålet vises. Primitivet styrer `data-active`.
        'data-[active=false]:hidden',
        className,
      )}
      {...props}
    />
  );
}

export function QuestionnaireTitle({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title
      data-slot="questionnaire-title"
      className={cn('p-0 text-label text-fg', className)}
      {...props}
    />
  );
}

export function QuestionnaireDescription({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description
      data-slot="questionnaire-description"
      className={cn('text-body text-fg-muted leading-relaxed', className)}
      {...props}
    />
  );
}

export function QuestionnaireChoices({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Choices>) {
  return (
    <Primitive.Choices
      data-slot="questionnaire-choices"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

/**
 * Ett svaralternativ. Hele raden er klikkbar (`<label>`), ikke bare en liten
 * radioknapp — dette skal kunne treffes med en tommel i en verkstedhall.
 */
export function QuestionnaireChoice({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Choice>) {
  return (
    <Primitive.Choice
      data-slot="questionnaire-choice"
      className={cn(
        'flex min-h-row cursor-pointer items-center gap-3 rounded-control border border-border px-3 py-2 text-body text-fg transition-colors',
        'hover:bg-surface-2 has-focus-visible:outline-2 has-focus-visible:outline-ring',
        'data-[checked=true]:border-accent-strong data-[checked=true]:bg-accent-soft data-[checked=true]:text-accent-strong',
        className,
      )}
      {...props}
    >
      <Primitive.ChoiceInput className="sr-only" />
      <Primitive.ChoiceLabel className="min-w-0 flex-1">{children}</Primitive.ChoiceLabel>
      {/* Tastatursnarvei (a/b/c …) — primitivet fyller den ut selv. */}
      <Primitive.ChoiceShortcut className="shrink-0 rounded-badge bg-surface-2 px-1.5 text-[11px] text-fg-muted" />
    </Primitive.Choice>
  );
}

export function QuestionnaireInput({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Input>) {
  return (
    <Primitive.Input
      data-slot="questionnaire-input"
      className={cn(
        'h-control w-full rounded-control border border-border bg-bg px-3 text-body text-fg outline-none',
        'placeholder:text-fg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    />
  );
}

export function QuestionnaireError({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Error>) {
  return (
    <Primitive.Error
      data-slot="questionnaire-error"
      className={cn('text-[12px] text-destructive', className)}
      {...props}
    />
  );
}

export function QuestionnaireActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="questionnaire-actions"
      className={cn('flex flex-wrap items-center gap-2 pt-1', className)}
      {...props}
    />
  );
}

export function QuestionnairePrevious({
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Previous>) {
  return (
    <Primitive.Previous
      data-slot="questionnaire-previous"
      render={<Button variant="ghost" size="sm" />}
      {...props}
    >
      {children ?? 'Tilbake'}
    </Primitive.Previous>
  );
}

export function QuestionnaireSkip({
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Skip>) {
  return (
    <Primitive.Skip
      data-slot="questionnaire-skip"
      render={<Button variant="ghost" size="sm" />}
      {...props}
    >
      {children ?? 'Vet ikke'}
    </Primitive.Skip>
  );
}

export function QuestionnaireNext({
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Next>) {
  return (
    <Primitive.Next
      data-slot="questionnaire-next"
      render={<Button variant="secondary" size="sm" />}
      {...props}
    >
      {children ?? 'Neste'}
    </Primitive.Next>
  );
}

export function QuestionnaireSubmit({
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Submit>) {
  return (
    <Primitive.Submit data-slot="questionnaire-submit" render={<Button size="sm" />} {...props}>
      {children ?? 'Send svar'}
    </Primitive.Submit>
  );
}
