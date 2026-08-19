import CaseDetailClient from './CaseDetailClient';

export default async function Page({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || '';
  return <CaseDetailClient id={id} />;
}
