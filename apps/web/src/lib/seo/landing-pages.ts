export type LandingPageKind = 'route' | 'stop' | 'guide';

export type LandingSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LandingFaq = {
  question: string;
  answer: string;
};

export type LandingLink = {
  label: string;
  href: string;
};

export type LandingPage = {
  kind: LandingPageKind;
  slug: string;
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  eyebrow: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
  sections: LandingSection[];
  faqs: LandingFaq[];
  relatedLinks: LandingLink[];
};

const ROUTE = 'route';
const STOP = 'stop';
const GUIDE = 'guide';

export const LANDING_PAGES: LandingPage[] = [
  {
    kind: ROUTE,
    slug: 'red-line',
    path: '/mbta/routes/red-line',
    title: 'Red Line Arrivals and Best Boarding Stops | MBTA Tracker',
    description:
      'Check realtime Red Line arrivals, stop context, and quick boarding guidance for Boston commuters in one search-first view.',
    h1: 'Red Line arrivals with stop-by-stop boarding context',
    intro:
      'Use this page to check Red Line timing quickly, compare nearby boarding options, and make faster commute decisions with transparent freshness signals.',
    eyebrow: 'Red Line',
    primaryKeyword: 'red line arrivals',
    secondaryKeywords: ['red line tracker', 'mbta red line live', 'red line boston arrivals'],
    changefreq: 'daily',
    priority: '0.9',
    sections: [
      {
        heading: 'What riders can do on this page',
        bullets: [
          'Check current Red Line arrivals from search results quickly.',
          'Compare nearby stops when one platform is delayed.',
          'Open map context only when you need it.'
        ]
      },
      {
        heading: 'Reliability notes',
        paragraphs: [
          'Realtime feeds can lag during incidents. MBTA Tracker surfaces freshness signals so riders can judge confidence before acting.',
          'When timing uncertainty increases, use nearby stop alternatives and route context together.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Is this Red Line data realtime?',
        answer:
          'It is based on realtime MBTA feeds when available, with explicit freshness and connection context shown in the app.'
      },
      {
        question: 'Can I search by station name?',
        answer:
          'Yes. You can search by route, station, address, or landmark and jump directly to relevant arrivals.'
      }
    ],
    relatedLinks: [
      { label: 'North Station arrivals', href: '/mbta/stops/north-station' },
      { label: 'MBTA commute planner guide', href: '/guides/mbta-commute-planner' },
      { label: 'Open MBTA Tracker', href: '/' }
    ]
  },
  {
    kind: ROUTE,
    slug: 'red-line-tracker',
    path: '/mbta/routes/red-line-tracker',
    title: 'Red Line Tracker for Boston Commuters | MBTA Tracker',
    description:
      'Track Red Line arrivals with a search-first workflow built for quick commuter decisions and readable realtime status.',
    h1: 'Red Line tracker focused on fast decisions',
    intro:
      'This tracker page is optimized for riders who need timing and boarding context quickly without navigating heavy map-first interfaces.',
    eyebrow: 'Route Tracker',
    primaryKeyword: 'red line tracker',
    secondaryKeywords: ['mbta red line tracker', 'red line live tracker', 'red line train times'],
    changefreq: 'daily',
    priority: '0.88',
    sections: [
      {
        heading: 'Search-first workflow',
        bullets: [
          'Start with route or station input and get compact result cards.',
          'Use quick actions to jump into arrivals and map context.',
          'Keep focus on next boarding decision, not screen complexity.'
        ]
      },
      {
        heading: 'For daily commuting',
        paragraphs: [
          'The page is designed for repeated daily checks where speed and clarity matter more than visual overload.',
          'Riders can compare alternatives quickly when service changes happen.'
        ]
      }
    ],
    faqs: [
      {
        question: 'How is this different from a map-only tracker?',
        answer: 'It emphasizes search and decision-ready cards first, with map context available on demand.'
      },
      {
        question: 'Can I use this on mobile?',
        answer: 'Yes. The flow supports mobile and desktop for quick route and stop checks.'
      }
    ],
    relatedLinks: [
      { label: 'Red Line arrivals page', href: '/mbta/routes/red-line' },
      { label: 'South Station arrivals', href: '/mbta/stops/south-station' },
      { label: 'How to check MBTA delays', href: '/guides/how-to-check-mbta-delays' }
    ]
  },
  {
    kind: ROUTE,
    slug: 'orange-line',
    path: '/mbta/routes/orange-line',
    title: 'Orange Line Arrivals and Commuter Timing | MBTA Tracker',
    description:
      'See Orange Line arrivals, stop-level context, and practical timing signals for faster Boston transit choices.',
    h1: 'Orange Line arrivals with practical boarding guidance',
    intro:
      'Use this page to find Orange Line timing quickly and reduce uncertainty during high-traffic commuting windows.',
    eyebrow: 'Orange Line',
    primaryKeyword: 'orange line arrivals',
    secondaryKeywords: ['orange line tracker', 'mbta orange line live', 'orange line train times'],
    changefreq: 'daily',
    priority: '0.86',
    sections: [
      {
        heading: 'Why this page helps',
        bullets: [
          'Shows arrival context in compact cards that are easy to scan.',
          'Lets riders move from discovery to decision quickly.',
          'Supports route-first and stop-first search behavior.'
        ]
      },
      {
        heading: 'When service is irregular',
        paragraphs: [
          'Use nearby stop alternatives and updated arrival windows to choose the most reliable next step.',
          'Pair this page with station pages for faster local decision making.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Can I compare nearby Orange Line stops?',
        answer: 'Yes. You can move from route view to stop-specific context and compare options quickly.'
      },
      {
        question: 'Does this replace official MBTA alerts?',
        answer: 'No. Use this as a practical decision layer alongside official agency communications.'
      }
    ],
    relatedLinks: [
      { label: 'Government Center arrivals', href: '/mbta/stops/government-center' },
      { label: 'Park Street arrivals', href: '/mbta/stops/park-street' },
      { label: 'Open MBTA Tracker', href: '/' }
    ]
  },
  {
    kind: ROUTE,
    slug: 'blue-line',
    path: '/mbta/routes/blue-line',
    title: 'Blue Line Arrivals and Route Context | MBTA Tracker',
    description:
      'Check Blue Line arrivals with compact realtime cards and stop context built for quick commuter planning.',
    h1: 'Blue Line arrivals in a compact search-first view',
    intro:
      'Get realtime Blue Line timing without clutter and switch to map context only when it improves your next decision.',
    eyebrow: 'Blue Line',
    primaryKeyword: 'blue line arrivals',
    secondaryKeywords: ['blue line tracker', 'mbta blue line live', 'blue line boston'],
    changefreq: 'daily',
    priority: '0.84',
    sections: [
      {
        heading: 'Decision speed features',
        bullets: [
          'Compact route and stop cards for rapid scanning.',
          'Clear freshness and connectivity indicators.',
          'Minimal navigation steps to arrivals.'
        ]
      },
      {
        heading: 'Commuter fit',
        paragraphs: [
          'The page is useful for riders who need confidence quickly, especially during transfer-heavy commutes.',
          'You can pivot from route checks to stop details in one flow.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Can I use this page during service disruptions?',
        answer: 'Yes. It is designed to keep core timing and context visible when riders need quick alternatives.'
      },
      {
        question: 'What is the best way to use this page daily?',
        answer: 'Start with route input, confirm arrivals, then open stop context only if needed.'
      }
    ],
    relatedLinks: [
      { label: 'How to check MBTA delays', href: '/guides/how-to-check-mbta-delays' },
      { label: 'North Station arrivals', href: '/mbta/stops/north-station' },
      { label: 'MBTA commute planner', href: '/guides/mbta-commute-planner' }
    ]
  },
  {
    kind: ROUTE,
    slug: 'green-line',
    path: '/mbta/routes/green-line',
    title: 'Green Line Arrivals and Boarding Decisions | MBTA Tracker',
    description:
      'View Green Line arrivals and nearby stop options with a practical interface built for fast rider choices.',
    h1: 'Green Line arrivals with nearby stop alternatives',
    intro:
      'This page helps Green Line riders compare immediate options, reduce waiting uncertainty, and board with more confidence.',
    eyebrow: 'Green Line',
    primaryKeyword: 'green line arrivals',
    secondaryKeywords: ['green line tracker', 'mbta green line live', 'green line stop times'],
    changefreq: 'daily',
    priority: '0.84',
    sections: [
      {
        heading: 'Core rider workflow',
        bullets: [
          'Search route or stop and see results quickly.',
          'Compare nearby boarding choices for better timing.',
          'Use route context to avoid unnecessary detours.'
        ]
      },
      {
        heading: 'Practical guidance',
        paragraphs: [
          'Green Line travel can vary by segment and time window. This page helps riders evaluate immediate options with less friction.',
          'Use stop pages when you need station-specific timing details.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Does this page work for all Green Line branches?',
        answer: 'It supports route-level and stop-level discovery so riders can navigate branch complexity more easily.'
      },
      {
        question: 'Can I use this instead of memorizing schedules?',
        answer: 'Yes, for daily realtime checks. Keep official schedules as a fallback reference when needed.'
      }
    ],
    relatedLinks: [
      { label: 'Park Street arrivals', href: '/mbta/stops/park-street' },
      { label: 'Government Center arrivals', href: '/mbta/stops/government-center' },
      { label: 'Open MBTA Tracker', href: '/' }
    ]
  },
  {
    kind: STOP,
    slug: 'north-station',
    path: '/mbta/stops/north-station',
    title: 'North Station Realtime Arrivals and Platform Timing | MBTA Tracker',
    description:
      'Check North Station realtime arrivals and nearby route context for faster platform and boarding decisions.',
    h1: 'North Station arrivals with route context',
    intro:
      'Use this page to monitor North Station arrivals, review nearby route options, and make rapid boarding decisions with less guesswork.',
    eyebrow: 'North Station',
    primaryKeyword: 'north station arrivals',
    secondaryKeywords: ['north station mbta tracker', 'north station realtime trains', 'north station train times'],
    changefreq: 'daily',
    priority: '0.87',
    sections: [
      {
        heading: 'Best use cases',
        bullets: [
          'Confirm current arrivals before entering the platform area.',
          'Compare route alternatives when one line is delayed.',
          'Move from stop context to full app quickly.'
        ]
      },
      {
        heading: 'Data trust guidance',
        paragraphs: [
          'Realtime timings may shift quickly during incidents. Use freshness indicators and cross-check with official alerts when required.',
          'For transfers, compare route pages to reduce risk of missed connections.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Can I check both commuter and subway context from here?',
        answer: 'Yes. This page is meant to support high-traffic transfer decisions with compact context.'
      },
      {
        question: 'Is this page mobile friendly for on-platform checks?',
        answer: 'Yes. The layout is optimized for quick checks on mobile and desktop.'
      }
    ],
    relatedLinks: [
      { label: 'Red Line arrivals', href: '/mbta/routes/red-line' },
      { label: 'Orange Line arrivals', href: '/mbta/routes/orange-line' },
      { label: 'MBTA commute planner', href: '/guides/mbta-commute-planner' }
    ]
  },
  {
    kind: STOP,
    slug: 'south-station',
    path: '/mbta/stops/south-station',
    title: 'South Station Arrivals and Route Timing | MBTA Tracker',
    description:
      'See South Station realtime arrivals and route context for practical commuter timing decisions in Boston.',
    h1: 'South Station arrivals for fast commuter decisions',
    intro:
      'This page helps South Station riders check arrivals quickly, compare route options, and reduce uncertainty during busy travel windows.',
    eyebrow: 'South Station',
    primaryKeyword: 'south station arrivals',
    secondaryKeywords: ['south station tracker', 'south station realtime trains', 'mbta south station timing'],
    changefreq: 'daily',
    priority: '0.87',
    sections: [
      {
        heading: 'What to check first',
        bullets: [
          'Current arrival windows for immediate departures.',
          'Nearby route alternatives in case of delay.',
          'Connection context before committing to transfer.'
        ]
      },
      {
        heading: 'Commuter strategy',
        paragraphs: [
          'For repeated commuting, monitor this page before departure and again near station entry to reduce timing surprises.',
          'Pair station context with route pages for better transfer planning.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Does this page include delay context?',
        answer: 'It supports timing context and should be used with official incident communications for major disruptions.'
      },
      {
        question: 'Can I jump to related route pages from here?',
        answer: 'Yes. Related links are included to keep decision flow fast.'
      }
    ],
    relatedLinks: [
      { label: 'Red Line tracker', href: '/mbta/routes/red-line-tracker' },
      { label: 'How to check MBTA delays', href: '/guides/how-to-check-mbta-delays' },
      { label: 'Open MBTA Tracker', href: '/' }
    ]
  },
  {
    kind: STOP,
    slug: 'park-street',
    path: '/mbta/stops/park-street',
    title: 'Park Street Station Arrivals and Transfer Timing | MBTA Tracker',
    description:
      'Check Park Street station arrivals and transfer context with concise realtime views for fast rider decisions.',
    h1: 'Park Street arrivals with transfer-aware context',
    intro:
      'Use this page to check Park Street timing, compare transfer options, and move through commute decisions with less friction.',
    eyebrow: 'Park Street',
    primaryKeyword: 'park street station arrivals',
    secondaryKeywords: ['park street tracker', 'park street realtime trains', 'mbta park street times'],
    changefreq: 'daily',
    priority: '0.85',
    sections: [
      {
        heading: 'Transfer-first utility',
        bullets: [
          'Compare immediate arrival options during transfers.',
          'Keep route context visible while deciding next move.',
          'Avoid excessive map toggling during rush periods.'
        ]
      },
      {
        heading: 'Operational tips',
        paragraphs: [
          'Check this page before entering crowded platform areas to make transfer decisions earlier.',
          'Use related route links for broader fallback planning.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Can I use this for transfer-heavy routes?',
        answer: 'Yes. It is designed to support transfer decisions where timing clarity is critical.'
      },
      {
        question: 'Is route context available from this page?',
        answer: 'Yes. Related route links and search flow are included.'
      }
    ],
    relatedLinks: [
      { label: 'Green Line arrivals', href: '/mbta/routes/green-line' },
      { label: 'Blue Line arrivals', href: '/mbta/routes/blue-line' },
      { label: 'MBTA stop vs route search', href: '/guides/mbta-stop-vs-route-search' }
    ]
  },
  {
    kind: STOP,
    slug: 'government-center',
    path: '/mbta/stops/government-center',
    title: 'Government Center Arrivals and Stop Context | MBTA Tracker',
    description:
      'Get Government Center realtime arrivals and related route context for practical boarding and transfer choices.',
    h1: 'Government Center arrivals in one practical view',
    intro:
      'This page helps riders evaluate Government Center arrivals quickly, compare options, and board with clearer timing confidence.',
    eyebrow: 'Government Center',
    primaryKeyword: 'government center arrivals',
    secondaryKeywords: ['government center tracker', 'mbta government center realtime', 'government center station timing'],
    changefreq: 'daily',
    priority: '0.85',
    sections: [
      {
        heading: 'Rider outcomes',
        bullets: [
          'Faster arrival checks for immediate departures.',
          'Simpler transfer decisions with related route context.',
          'Better clarity under service variability.'
        ]
      },
      {
        heading: 'How to use it daily',
        paragraphs: [
          'Open this page before and during commute windows to reduce uncertainty and improve boarding timing.',
          'Use guide links for deeper planning workflows.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Can I reach route details from this page?',
        answer: 'Yes. Use related links to open route-level pages for broader context.'
      },
      {
        question: 'Is this intended for occasional riders too?',
        answer: 'Yes. The page is designed for both daily commuters and occasional riders.'
      }
    ],
    relatedLinks: [
      { label: 'Orange Line arrivals', href: '/mbta/routes/orange-line' },
      { label: 'Green Line arrivals', href: '/mbta/routes/green-line' },
      { label: 'MBTA commute planner', href: '/guides/mbta-commute-planner' }
    ]
  },
  {
    kind: GUIDE,
    slug: 'how-to-check-mbta-delays',
    path: '/guides/how-to-check-mbta-delays',
    title: 'How to Check MBTA Delays Quickly | MBTA Tracker Guide',
    description:
      'A practical guide to checking MBTA delays quickly using realtime context, stop alternatives, and route-first workflows.',
    h1: 'How to check MBTA delays without losing time',
    intro:
      'This guide explains a fast, repeatable workflow for checking delays and choosing the next best ride option with less cognitive load.',
    eyebrow: 'Rider Guide',
    primaryKeyword: 'how to check mbta delays',
    secondaryKeywords: ['mbta delays today', 'mbta delay tracker', 'mbta service delay workflow'],
    changefreq: 'weekly',
    priority: '0.82',
    sections: [
      {
        heading: 'Fast delay-check workflow',
        bullets: [
          'Search by route or stop first.',
          'Check arrival freshness and confidence context.',
          'Compare one nearby fallback stop or route.',
          'Decide and move without over-scanning.'
        ]
      },
      {
        heading: 'When to escalate to official alerts',
        paragraphs: [
          'For major incidents and broad service changes, verify decisions with official MBTA alerts and station messaging.',
          'Use this guide as a practical decision layer, not as a replacement for agency advisories.'
        ]
      }
    ],
    faqs: [
      {
        question: 'What is the best first step during a suspected delay?',
        answer: 'Start with route or stop search and check the latest arrivals and freshness signals.'
      },
      {
        question: 'Should I rely only on one data source?',
        answer: 'No. For significant disruptions, combine realtime app context with official MBTA communications.'
      }
    ],
    relatedLinks: [
      { label: 'North Station arrivals', href: '/mbta/stops/north-station' },
      { label: 'South Station arrivals', href: '/mbta/stops/south-station' },
      { label: 'Open MBTA Tracker', href: '/' }
    ]
  },
  {
    kind: GUIDE,
    slug: 'mbta-commute-planner',
    path: '/guides/mbta-commute-planner',
    title: 'MBTA Commute Planner for Faster Daily Decisions | Guide',
    description:
      'Plan MBTA commutes with route-first and stop-first workflows that reduce uncertainty and improve daily timing decisions.',
    h1: 'MBTA commute planner guide for daily riders',
    intro:
      'Use this guide to build a consistent commute workflow that balances speed, confidence, and flexibility under real-world service changes.',
    eyebrow: 'Rider Guide',
    primaryKeyword: 'mbta commute planner',
    secondaryKeywords: ['mbta commute planning', 'boston commute transit planner', 'mbta daily commute workflow'],
    changefreq: 'weekly',
    priority: '0.81',
    sections: [
      {
        heading: 'Daily planning framework',
        bullets: [
          'Check your primary route timing first.',
          'Identify one fallback route or stop in advance.',
          'Confirm arrivals again near departure time.',
          'Use compact cards to decide quickly.'
        ]
      },
      {
        heading: 'Why this approach works',
        paragraphs: [
          'Commuters perform better with consistent decision patterns than with ad hoc scanning under pressure.',
          'A repeatable process lowers cognitive load and improves confidence in uncertain conditions.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Is this guide only for weekday commuters?',
        answer: 'No. The same planning pattern works for occasional and weekend riders too.'
      },
      {
        question: 'Can this replace route schedules?',
        answer: 'It complements schedules with realtime context and should be used alongside official planning information.'
      }
    ],
    relatedLinks: [
      { label: 'Red Line arrivals', href: '/mbta/routes/red-line' },
      { label: 'Government Center arrivals', href: '/mbta/stops/government-center' },
      { label: 'How to check MBTA delays', href: '/guides/how-to-check-mbta-delays' }
    ]
  }
];

const LANDING_PAGE_INDEX = new Map(LANDING_PAGES.map((page) => [`${page.kind}:${page.slug}`, page]));

export function getLandingPage(kind: LandingPageKind, slug: string): LandingPage | undefined {
  return LANDING_PAGE_INDEX.get(`${kind}:${slug}`);
}

export function listLandingPages(): LandingPage[] {
  return LANDING_PAGES;
}
