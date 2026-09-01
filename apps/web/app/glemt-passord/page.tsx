import { redirect } from 'next/navigation';

/** Passord er borte. Innlogging er magic link. */
export default function GlemtPassordPage() {
  redirect('/signin');
}
