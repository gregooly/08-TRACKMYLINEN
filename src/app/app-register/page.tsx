import { redirect } from 'next/navigation';

/** Public app registration removed — use App Users inside admin/agent panels. */
export default function AppRegisterRedirectPage() {
  redirect('/');
}
