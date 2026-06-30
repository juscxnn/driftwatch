import { Landing } from '@/components/landing';

export const metadata = {
  title: 'Driftwatch — Get an email when your RAG starts lying.',
  description:
    'Driftwatch watches your RAG in production, runs your golden Q&A suite on a schedule, and emails you when answers drift.',
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function WelcomePage() {
  return <Landing />;
}