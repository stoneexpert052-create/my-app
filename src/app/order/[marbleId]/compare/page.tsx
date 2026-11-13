import { marbles } from '@/lib/data';
import CompareClient from './compare-client';

export async function generateStaticParams() {
  const ids = marbles.map((marble) => ({
    marbleId: String(marble.id),
  }));

  const fallbackIds = [{ marbleId: '1' }, { marbleId: '2' }];
  for (const fallback of fallbackIds) {
    if (!ids.some((item) => item.marbleId === fallback.marbleId)) {
      ids.push(fallback);
    }
  }

  return ids;
}

export default async function ComparePage(props: {
  params: Promise<{ marbleId: string }> | { marbleId: string };
}) {
  const resolvedParams = await props.params;
  return <CompareClient marbleId={resolvedParams?.marbleId} />;
}
