import { redirect } from 'next/navigation';

export default function RezensioneRedirectPage() {
  redirect('/admin/content?tab=rezensionen');
}
