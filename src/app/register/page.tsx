import { redirect } from 'next/navigation';

type RegisterPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = (await searchParams) || {};
  const refRaw = params.ref;
  const ref = Array.isArray(refRaw) ? String(refRaw[0] || '').trim() : String(refRaw || '').trim();

  if (ref) {
    redirect(`/?ref=${encodeURIComponent(ref)}&register=1`);
  }

  redirect('/?register=1');
}
