import { redirect } from 'next/navigation';

/** Passord er borte. Innlogging er magic link. */
export default function NyttPassordPage() {
  redirect('/signin');
}
