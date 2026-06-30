// All user-facing copy lives here so we never repeat a string literal
// across components. Brand & microcopy that should stay consistent.

export const COPY = {
  brand: 'RAG Drift Watcher',
  brandShort: 'Driftwatch',
  tagline: 'Watches your RAG and screams when it starts lying.',

  nav: {
    home: 'Inbox',
    projects: 'Projects',
    triage: 'Triage',
    settings: 'Settings',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    signIn: 'Sign in',
    getStarted: 'Get started',
  },

  marketing: {
    heroEyebrow: 'Watches your RAG in production',
    heroTitle: 'Get an email when your RAG starts lying.',
    heroSubtitle:
      'Point Driftwatch at any RAG endpoint, add a handful of golden Q&As, and we will run them on a schedule and flag drift before your customers do.',
    heroPrimaryCta: 'Start watching free',
    heroSecondaryCta: 'See a live demo',
    howItWorksTitle: 'How it works',
    howItWorksSubtitle:
      'Three steps. Five minutes. You will get the first drift email before lunch.',
    steps: {
      one: {
        title: 'Point at your RAG',
        body: 'Paste your RAG endpoint URL and an optional bearer token. Driftwatch sends the same JSON shape your RAG already returns.',
      },
      two: {
        title: 'Add golden Q&As',
        body: 'Drop in the questions your RAG should answer correctly. Optionally tag them by topic so the judge weighs the right criteria.',
      },
      three: {
        title: 'Get alerts',
        body: 'We run the suite on a schedule and email you when an answer drifts. Triage, accept, or reword from a friendly console.',
      },
    },
    demoTitle: 'No RAG yet? Try the demo inbox.',
    demoBody:
      'Sign up, seed sample data in one click, and explore a triage console that already has drift in it.',
    demoCta: 'Open sample inbox',
    finalCtaTitle: 'Stop finding out from your customers.',
    finalCtaBody:
      'Driftwatch emails you the moment an answer drifts from your golden set. Set it up once, sleep better.',
    finalCtaButton: 'Start watching',
    nav: {
      signIn: 'Sign in',
      getStarted: 'Get started',
    },
    footer: {
      copyright: (year: number) =>
        `© ${year} Driftwatch. Built so RAG owners sleep better.`,
      product: 'Product',
      productInbox: 'Inbox',
      productTriage: 'Triage',
      productPricing: 'Pricing',
      company: 'Company',
      companyAbout: 'About',
      companyContact: 'Contact',
      legal: 'Legal',
      legalTerms: 'Terms',
      legalPrivacy: 'Privacy',
    },
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
    filters: {
      all: 'All',
      lowScore: 'Drifted <0.5',
      midScore: 'Drifted 0.5–0.7',
      byProject: 'By project',
      allProjects: 'All projects',
      noMatchesTitle: 'No drifts match your filter.',
      noMatchesBody: 'Try clearing the filter to see everything.',
      clearFilter: 'Clear filter',
    },
    loadMore: 'Load more',
    loadingMore: 'Loading…',
    reword: {
      title: 'Reword the question',
      questionLabel: 'Question',
      expectedLabel: 'Expected answer',
      save: 'Save & mark reworded',
      saving: 'Saving…',
      cancel: 'Cancel',
      savedTitle: 'Question reworded',
      savedBody: 'Marked this drift as reverted.',
      errorTitle: 'Could not save',
    },
    triageErrors: {
      approve: 'Could not approve',
      reword: 'Could not save reword',
      escalate: 'Could not escalate',
    },
    shortcuts: {
      helpTitle: 'Keyboard shortcuts',
      helpIntro: 'Move fast through the inbox without touching the mouse.',
      openHelp: 'Show keyboard shortcuts',
      groups: {
        nav: 'Navigate',
        actions: 'Triage',
      },
      keys: {
        j: 'Move selection down',
        k: 'Move selection up',
        a: 'Approve selected',
        r: 'Reword Q on selected',
        e: 'Escalate selected',
        question: 'Show this help',
        escape: 'Close this help',
      },
      note: 'Shortcuts pause while you type in an input or textarea.',
    },
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

  confirmDialogs: {
    deleteOrg: {
      title: 'Delete organization?',
      description:
        'This permanently deletes your organization, all projects, and every golden Q&A. This action cannot be undone.',
      confirm: 'Delete organization',
      cancel: 'Cancel',
      typeToConfirmPrompt: 'Type your organization name to confirm:',
    },
    deleteProject: {
      title: 'Delete project?',
      description:
        'This permanently deletes this project, its golden Q&A, sources, and run history. This action cannot be undone.',
      confirm: 'Delete project',
      cancel: 'Cancel',
      typeToConfirmPrompt: 'Type the project name to confirm:',
    },
    deleteGoldenQ: {
      title: 'Delete question?',
      description:
        'This permanently removes this question from your golden Q&A suite. This action cannot be undone.',
      confirm: 'Delete question',
      cancel: 'Cancel',
    },
    deleteSource: {
      title: 'Delete source?',
      description:
        'This stops watching this source. Existing runs that referenced it are kept.',
      confirm: 'Delete source',
      cancel: 'Cancel',
    },
    generic: {
      title: 'Are you sure?',
      confirm: 'Confirm',
      cancel: 'Cancel',
    },
  },
} as const;

export type Copy = typeof COPY;
