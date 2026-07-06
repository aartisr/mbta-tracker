#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function printHelp() {
  console.log(`Search Console CTR Report

Usage:
  node scripts/search-console-ctr-report.mjs --input <csv-path> [--output <md-path>] [--min-impressions <number>] [--window-label <text>]

Required:
  --input              CSV export from Google Search Console Search results.

Optional:
  --output             Output markdown report path.
  --min-impressions    Default: 100
  --window-label       Example: "Last 28 days"
  --help               Show this help

Expected CSV columns (case-insensitive, common aliases supported):
  query, page, clicks, impressions, ctr, position
`);
}

function parseArgs(argv) {
  const args = {
    input: "",
    output: "",
    minImpressions: 100,
    windowLabel: "",
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--input") {
      args.input = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (token === "--output") {
      args.output = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (token === "--min-impressions") {
      const raw = argv[i + 1] ?? "100";
      const parsed = Number.parseInt(raw, 10);
      args.minImpressions = Number.isFinite(parsed) ? parsed : 100;
      i += 1;
      continue;
    }
    if (token === "--window-label") {
      args.windowLabel = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
  }

  return args;
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") {
        i += 1;
      }
      row.push(field);
      if (row.some((v) => v.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value) {
  return value.trim().toLowerCase();
}

function cleanNumber(raw) {
  if (!raw) return 0;
  const normalized = raw.replace(/,/g, "").replace(/%/g, "").trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapColumns(headers) {
  const byName = new Map(headers.map((h, i) => [normalizeHeader(h), i]));

  const findIndex = (aliases) => {
    for (const alias of aliases) {
      if (byName.has(alias)) return byName.get(alias);
    }
    return -1;
  };

  return {
    query: findIndex(["query", "top queries", "queries"]),
    page: findIndex(["page", "top pages", "pages", "url"]),
    clicks: findIndex(["clicks"]),
    impressions: findIndex(["impressions"]),
    ctr: findIndex(["ctr"]),
    position: findIndex(["position", "average position"])
  };
}

function toRecords(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const columns = mapColumns(headers);

  return rows.slice(1).map((r) => {
    const ctrRaw = columns.ctr >= 0 ? (r[columns.ctr] ?? "") : "0";
    const ctrPercent = cleanNumber(ctrRaw);
    const ctr = ctrRaw.includes("%") ? ctrPercent / 100 : ctrPercent;

    return {
      query: columns.query >= 0 ? (r[columns.query] ?? "").trim() : "",
      page: columns.page >= 0 ? (r[columns.page] ?? "").trim() : "(not provided)",
      clicks: columns.clicks >= 0 ? cleanNumber(r[columns.clicks] ?? "0") : 0,
      impressions: columns.impressions >= 0 ? cleanNumber(r[columns.impressions] ?? "0") : 0,
      ctr,
      position: columns.position >= 0 ? cleanNumber(r[columns.position] ?? "0") : 0
    };
  }).filter((r) => r.impressions > 0 && r.query.length > 0);
}

function formatPct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatNum(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function asMarkdownTable(items, limit = 20) {
  const top = items.slice(0, limit);
  if (top.length === 0) {
    return "No rows matched this segment.";
  }

  const lines = [
    "| Query | Page | Clicks | Impressions | CTR | Position |",
    "| --- | --- | ---: | ---: | ---: | ---: |"
  ];

  for (const item of top) {
    lines.push(
      `| ${item.query.replace(/\|/g, "\\|")} | ${item.page.replace(/\|/g, "\\|")} | ${formatNum(item.clicks)} | ${formatNum(item.impressions)} | ${formatPct(item.ctr)} | ${item.position.toFixed(2)} |`
    );
  }

  return lines.join("\n");
}

function buildReport(records, options) {
  const now = new Date();
  const stamp = now.toISOString();
  const minImpressions = options.minImpressions;

  const highImpressionsLowCtr = records
    .filter((r) => r.impressions >= minImpressions && r.ctr < 0.03)
    .sort((a, b) => b.impressions - a.impressions);

  const midRankOpportunity = records
    .filter((r) => r.impressions >= minImpressions && r.position > 4 && r.position <= 20 && r.ctr < 0.08)
    .sort((a, b) => b.impressions - a.impressions);

  const quickWinTitleTests = records
    .filter((r) => r.impressions >= minImpressions && r.position <= 5 && r.ctr < 0.10)
    .sort((a, b) => b.impressions - a.impressions);

  const totalImpressions = records.reduce((sum, r) => sum + r.impressions, 0);
  const totalClicks = records.reduce((sum, r) => sum + r.clicks, 0);
  const weightedCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  const windowLine = options.windowLabel ? `- Window: ${options.windowLabel}` : "";

  return `# Search Console CTR Opportunity Report

Generated: ${stamp}
${windowLine}
- Input rows analyzed: ${formatNum(records.length)}
- Min impressions threshold: ${formatNum(minImpressions)}
- Total clicks: ${formatNum(totalClicks)}
- Total impressions: ${formatNum(totalImpressions)}
- Weighted CTR: ${formatPct(weightedCtr)}

## Segment 1: High Impressions, Low CTR (Top Priority)

Action: Improve title, meta description, and first 120 words. Match SERP intent directly.

${asMarkdownTable(highImpressionsLowCtr, 25)}

## Segment 2: Position 4-20 Ranking Opportunities

Action: Strengthen topical depth, internal links, and on-page relevance. Add FAQ where useful.

${asMarkdownTable(midRankOpportunity, 25)}

## Segment 3: Quick Wins (Already Top 5 but CTR Underperforming)

Action: Run title and meta A/B style refreshes and monitor impact over 7 to 14 days.

${asMarkdownTable(quickWinTitleTests, 25)}

## Weekly Execution Checklist

1. Pick top 10 rows from Segment 1.
2. Update title, meta description, intro paragraph, and internal links.
3. Ship 2 new pages from doc/SEO_KEYWORD_TO_PAGE_MAP.csv.
4. Re-measure in 7 to 14 days.
5. Log outcomes in doc/STATUS.md.
`;
}

function defaultOutputPath() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return path.join("doc", "reports", `search-console-ctr-report-${y}-${m}-${d}.md`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.input) {
    console.error("Missing required --input argument. Use --help for usage.");
    process.exit(1);
  }

  if (!fs.existsSync(args.input)) {
    console.error(`Input file does not exist: ${args.input}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(args.input, "utf8");
  const rows = parseCsv(raw);
  const records = toRecords(rows);

  if (records.length === 0) {
    console.error("No valid rows found. Confirm the CSV includes query/clicks/impressions data.");
    process.exit(1);
  }

  const report = buildReport(records, {
    minImpressions: args.minImpressions,
    windowLabel: args.windowLabel
  });

  const output = args.output || defaultOutputPath();
  const outputDir = path.dirname(output);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(output, report, "utf8");

  console.log(`CTR report written to ${output}`);
}

main();
