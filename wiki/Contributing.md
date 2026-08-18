# Contributing

MBTA Tracker welcomes concrete improvements that make rider decisions clearer, more accessible, and more trustworthy.

Before changing behavior:

1. Review the [architecture](https://github.com/aartisr/mbta-tracker/blob/main/ARCHITECTURE.md) and [current status](https://github.com/aartisr/mbta-tracker/blob/main/doc/STATUS.md).
2. Extend existing service interfaces where possible.
3. Keep reusable logic outside presentation components.
4. Add or update tests.
5. Run `npm run test:all` and `npm run check`.

Please avoid claims of precision that the underlying MBTA feed or implementation cannot support. The public product is [MBTA Tracker](https://mbta.ai-aarti.com/).
