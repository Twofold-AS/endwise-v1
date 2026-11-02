'use client';

import type { ComponentProps } from 'react';
import { Checkbox } from '../components/base/checkbox/checkbox.tsx';
import { DateCalendar } from '../components/base/date-picker/date-calendar.tsx';
import { DatePicker } from '../components/base/date-picker/date-picker.tsx';
import { Input } from '../components/base/input/input.tsx';
import { InputOtp } from '../components/base/input-otp/input-otp.tsx';
import { NumberField } from '../components/base/number-field/number-field.tsx';
import { Radio, RadioGroup } from '../components/base/radio/radio.tsx';
import { SearchField } from '../components/base/search-field/search-field.tsx';
import { Select } from '../components/base/select/select.tsx';
import { Switch } from '../components/base/switch/switch.tsx';
import { Textarea } from '../components/base/textarea/textarea.tsx';
import { TimeField } from '../components/base/time-field/time-field.tsx';
import { Search } from '../icons.ts';
import { FELT_LG, FELT_MD, FELT_SM } from '../lib/felt.ts';
import { cn } from '../lib/utils.ts';

/** Skjemafelt med label/hint/error. Auth bruker size + FELT_LG. */
export function FeltInput({
  storrelse = 'md',
  className,
  fieldClassName,
  ...props
}: ComponentProps<typeof Input> & { storrelse?: 'lg' | 'md' | 'sm' }) {
  const felt = storrelse === 'lg' ? FELT_LG : storrelse === 'sm' ? FELT_SM : FELT_MD;
  return (
    <Input
      {...props}
      size={storrelse === 'sm' ? 'small' : 'medium'}
      className={className}
      fieldClassName={cn(felt, fieldClassName)}
    />
  );
}

export function FeltTekst({
  className,
  fieldClassName,
  ...props
}: ComponentProps<typeof Textarea>) {
  return <Textarea {...props} className={className} fieldClassName={cn(FELT_MD, fieldClassName)} />;
}

/** Listesøk. Chrome-søk beholder egen geometri (h-8). */
export function FeltSok({
  clearLabel = 'Tøm søk',
  icon = Search,
  shape = 'rounded',
  size = 'small',
  ...props
}: ComponentProps<typeof SearchField>) {
  return <SearchField {...props} icon={icon} shape={shape} size={size} clearLabel={clearLabel} />;
}

export function FeltTall(props: ComponentProps<typeof NumberField>) {
  return <NumberField {...props} />;
}

export function FeltAvkrysning(props: ComponentProps<typeof Checkbox>) {
  return <Checkbox {...props} />;
}

export function FeltRadio(props: ComponentProps<typeof Radio>) {
  return <Radio {...props} />;
}

export function FeltRadioGruppe(props: ComponentProps<typeof RadioGroup>) {
  return <RadioGroup {...props} />;
}

export function FeltBryter(props: ComponentProps<typeof Switch>) {
  return <Switch size="sm" shape="pill" {...props} />;
}

export function FeltSelect(props: ComponentProps<typeof Select>) {
  return <Select {...props} />;
}

export function FeltKode(props: ComponentProps<typeof InputOtp>) {
  return <InputOtp {...props} />;
}

export function FeltKlokke(props: ComponentProps<typeof TimeField>) {
  return <TimeField {...props} />;
}

export function FeltDato(props: ComponentProps<typeof DatePicker>) {
  return <DatePicker {...props} />;
}

export function FeltKalender(props: ComponentProps<typeof DateCalendar>) {
  return <DateCalendar {...props} />;
}
