import Link from 'next/link';
import {
  ArrowRightIcon,
  CheckIcon,
} from '@/components/icons';
import { COPY } from '@/lib/copy';

/**
 * Public marketing landing page. Server component.
 *
 * Renders the hero, three-step "how it works" row, social-proof CTA,
 * and final CTA. All copy lives in COPY.marketing.
 */
export function Landing() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <DemoCta />
      <FinalCta />
    </>
  );
}

function Hero() {
  return (
    <section className="grid gap-12 pb-20 pt-16 md:grid-cols-[1.1fr_1fr] md:gap-16 md:pt-24">
      <div className="space-y-6">
        <p className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-muted">
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
          {COPY.marketing.heroEyebrow}
        </p>
        <h1 className="text-3xl font-medium tracking-tight text-text md:text-3xl">
          {COPY.marketing.heroTitle}
        </h1>
        <p className="text-lg text-text-muted">
          {COPY.marketing.heroSubtitle}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href="/signup" className="btn-primary">
            {COPY.marketing.heroPrimaryCta}
            <ArrowRightIcon />
          </Link>
          <a href="#demo" className="btn-secondary">
            {COPY.marketing.heroSecondaryCta}
          </a>
        </div>
      </div>
      <div className="md:pt-2">
        <HeroMockup />
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-4 py-2.5">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-warn" />
        <span className="text-xs text-text-muted">Drift detected · 2 answers drifted</span>
      </div>
      <ul className="divide-y divide-border">
        <DriftMockRow
          project="Customer support bot"
          time="2h ago"
          question="What is the refund policy?"
          score={0.42}
        />
        <DriftMockRow
          project="Customer support bot"
          time="6h ago"
          question="How do I reset my password?"
          score={0.61}
        />
        <li className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-text-subtle">Sample drift · seeded for the demo</span>
          <span className="text-xs text-text-muted">View all →</span>
        </li>
      </ul>
    </div>
  );
}

function DriftMockRow({
  project,
  time,
  question,
  score,
}: {
  project: string;
  time: string;
  question: string;
  score: number;
}) {
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-text-muted">{project}</span>
        <span className="text-text-subtle">{time}</span>
      </div>
      <p className="text-sm text-text">{question}</p>
      <div className="flex items-center gap-3">
        <div className="relative h-1.5 flex-1 rounded-full bg-surface-muted">
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 rounded-full bg-danger"
            style={{ width: `${score * 100}%` }}
          />
        </div>
        <span className="num w-10 text-right text-xs text-text-muted">
          {score.toFixed(2)}
        </span>
      </div>
    </li>
  );
}

function HowItWorks() {
  const steps = [
    COPY.marketing.steps.one,
    COPY.marketing.steps.two,
    COPY.marketing.steps.three,
  ];
  return (
    <section className="border-t border-border py-16 md:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-lg font-medium tracking-tight text-text md:text-2xl">
          {COPY.marketing.howItWorksTitle}
        </h2>
        <p className="muted mt-2">{COPY.marketing.howItWorksSubtitle}</p>
      </div>
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="card space-y-3">
            <div className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-muted text-xs text-text-muted">
              {i + 1}
            </div>
            <h3 className="text-base font-medium text-text">{step.title}</h3>
            <p className="text-sm text-text-muted">{step.body}</p>
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <CheckIcon className="h-3 w-3 text-brand" />
              <span>No agent install</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DemoCta() {
  return (
    <section
      id="demo"
      className="border-t border-border bg-surface py-16 md:py-20"
    >
      <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <h2 className="text-lg font-medium tracking-tight text-text md:text-2xl">
            {COPY.marketing.demoTitle}
          </h2>
          <p className="text-text-muted">{COPY.marketing.demoBody}</p>
        </div>
        <div className="flex justify-start md:justify-end">
          <Link href="/signup" className="btn-primary">
            {COPY.marketing.demoCta}
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-border py-20 md:py-24">
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <h2 className="text-lg font-medium tracking-tight text-text md:text-2xl">
          {COPY.marketing.finalCtaTitle}
        </h2>
        <p className="text-text-muted">{COPY.marketing.finalCtaBody}</p>
        <div className="pt-2">
          <Link href="/signup" className="btn-primary">
            {COPY.marketing.finalCtaButton}
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}