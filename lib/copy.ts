// All user-facing copy lives here so we never repeat a string literal
// across components. Brand & microcopy that should stay consistent.

export const COPY = {
  brand: 'RAG Drift Watcher',
  tagline: 'Watches your RAG and screams when it starts lying.',

  nav: {
    home: 'Home',
    projects: 'Projects',
    triage: 'Triage',
    signOut: 'Sign out',
    signIn: 'Sign in',
    getStarted: 'Get started',
  },

  auth: {
    loginTitle: 'Sign in to RAG Drift Watcher',
    loginSubtitle: 'Watch your RAG, catch drift early.',
    signupTitle: 'Create your account',
    signupSubtitle: 'Start watching your RAG in under a minute.',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    orgNameLabel: 'Organization name',
    orgNamePlaceholder: 'Acme Inc.',
    submitLogin: 'Sign in',
    submitSignup: 'Create account',
    switchToSignup: "Don't have an account? Sign up",
    switchToLogin: 'Already have an account? Sign in',
    switchToSignupCta: 'Sign up',
    switchToLoginCta: 'Sign in',
    signInMeta: 'Sign in · RAG Drift Watcher',
    signupMeta: 'Create your account · RAG Drift Watcher',
    errors: {
      missingFields: 'Please enter your email and password.',
      signupMissing: 'Please enter email, password, and an organization name.',
      generic: 'Something went wrong. Please try again.',
    },
  },

  home: {
    title: 'Your RAG projects',
    newProjectCta: 'New project',
    pendingReviews: 'pending reviews',
    noProjects: {
      title: 'No projects yet',
      body: 'Create your first project to start watching a RAG system.',
      cta: 'Create a project',
    },
  },

  onboarding: {
    title: 'Set up your organization',
    body: 'Pick a name for your workspace. You can change it later.',
    placeholder: 'Acme Inc.',
    submit: 'Create organization',
    submitting: 'Creating…',
  },

  inbox: {
    title: 'Inbox',
    subtitleEmpty: 'Your RAG is healthy.',
    subtitleEmptyDetail: 'No drift detected.',
    subtitleWithCount: (n: number) =>
      n === 1 ? '1 answer drifted' : `${n} answers drifted`,
    lastRun: (when: string) => `Last full run ${when}`,
    runOk: (passed: number, total: number) => `${passed}/${total} passed`,
    actions: {
      approve: 'Approve',
      reword: 'Reword Q',
      escalate: 'Escalate',
    },
    emptyTitle: 'No drift detected.',
    emptyBody: 'Your RAG is behaving. We will email you when something changes.',
    noProjectsTitle: 'Watch your first RAG system.',
    noProjectsBody:
      'Create a project, point it at your RAG endpoint, and add a handful of golden Q&As. We will run them on a schedule and flag drift.',
    noProjectsCta: 'Create your first project',
    trySample: 'Try with sample data',
    seeding: 'Seeding…',
    seedFailedBody:
      'Could not seed sample data. Please try again or create a project manually.',
    expectedLabel: 'Expected',
    actualLabel: 'Actual',
    reasoningLabel: 'Why the judge scored this',
    scoreLabel: 'Score',
    latencyLabel: 'Latency',
  },

  projects: {
    newTitle: 'New project',
    fields: {
      name: 'Project name',
      namePlaceholder: 'Customer support bot',
      endpointUrl: 'RAG endpoint URL',
      endpointUrlPlaceholder: 'https://example.com/api/rag',
      endpointSecret: 'Bearer token (optional)',
    },
    create: 'Create project',
    cancel: 'Cancel',
    columnAction: 'Open',
    rowAction: 'Open →',
  },

  tabs: {
    overview: 'Overview',
    golden: 'Golden Q&A',
    sources: 'Sources',
    runs: 'Runs',
    triage: 'Triage',
  },

  overview: {
    lastRun: 'Last run',
    neverRun: 'No runs yet',
    passRate: 'Pass rate',
    pendingReviews: 'Pending reviews',
    sourcesHealth: 'Source health',
    sourcesOk: 'All sources up to date',
    sourcesStale: 'One or more sources have not been fetched yet',
    sparklineEmpty: 'Not enough run data to draw a trend yet.',
  },

  golden: {
    title: 'Golden Q&A',
    addCta: 'Add question',
    bulkImportCta: 'Bulk import (JSON)',
    importHelp:
      'Paste a JSON array of { question, expected_answer, judge_rubric?, tags? } objects.',
    import: 'Import',
    columns: {
      question: 'Question',
      expected: 'Expected',
      tags: 'Tags',
      status: 'Active',
      actions: 'Actions',
    },
    empty: {
      title: 'No golden Q&A pairs yet',
      body: 'Add a question and the answer your RAG should produce. We will run them on a schedule and flag drift.',
    },
    form: {
      questionLabel: 'Question',
      questionPlaceholder: 'What is your refund policy?',
      expectedLabel: 'Expected answer',
      expectedPlaceholder: 'A short statement of the policy…',
      rubricLabel: 'Judge rubric (optional)',
      rubricPlaceholder: 'Any extra criteria the judge should weigh.',
      tagsLabel: 'Tags (comma separated)',
      tagsPlaceholder: 'pricing, support',
      save: 'Save',
      saving: 'Saving…',
    },
  },

  sources: {
    title: 'Sources',
    addCta: 'Add source',
    columns: {
      title: 'Title',
      uri: 'URI',
      lastFetched: 'Last fetched',
      lastHash: 'Last hash',
      actions: 'Actions',
    },
    empty: {
      title: 'No sources yet',
      body: 'Add a URL your RAG should watch. When the content changes, we re-run the suite.',
    },
    form: {
      titleLabel: 'Title (optional)',
      titlePlaceholder: 'Public docs',
      uriLabel: 'URL',
      uriPlaceholder: 'https://example.com/docs',
      save: 'Add source',
    },
    refresh: 'Refresh now',
    refreshing: 'Refreshing…',
  },

  runs: {
    title: 'Runs',
    triggerCta: 'Run now',
    triggering: 'Triggering…',
    columns: {
      started: 'Started',
      status: 'Status',
      total: 'Total',
      passed: 'Passed',
      failed: 'Failed',
      triggeredBy: 'Triggered by',
    },
    empty: {
      title: 'No runs yet',
      body: 'Trigger a run to test your current golden Q&A suite.',
    },
  },

  runDetail: {
    title: 'Run',
    columns: {
      question: 'Question',
      expected: 'Expected',
      actual: 'Actual',
      score: 'Score',
      latency: 'Latency',
      review: 'Review',
    },
    actions: {
      approve: 'Approve',
      revert: 'Revert',
      accept: 'Accept',
    },
  },

  triage: {
    title: 'Triage queue',
    subtitle: 'Pending reviews across all your projects.',
    columns: {
      project: 'Project',
      question: 'Question',
      score: 'Score',
      actions: 'Actions',
    },
    empty: {
      title: 'All clear',
      body: 'No pending reviews. Your RAG is behaving.',
    },
  },

  status: {
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    passed: 'Passed',
    pending: 'Pending',
    failedLabel: 'Failed',
    approved: 'Approved',
    reverted: 'Reverted',
    accepted: 'Accepted',
  },

  empty: {
    cta: 'Get started',
  },

  errors: {
    notSignedIn: 'You need to sign in to view this page.',
    failedToLoad: 'We could not load that. Please try again.',
    failedToSave: 'We could not save that. Please try again.',
    failedToDelete: 'We could not delete that. Please try again.',
    failedToTrigger: 'We could not trigger that run. Please try again.',
  },
} as const;

export type Copy = typeof COPY;
