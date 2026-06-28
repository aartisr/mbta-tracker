const major = Number.parseInt(process.versions.node.split('.')[0] || '0', 10);

if (!Number.isFinite(major) || major < 22) {
  console.error(
    `Wrangler requires Node.js 22 or newer. Detected Node ${process.versions.node}. ` +
      'Please switch to Node 22 before running worker deploy or dev commands.'
  );
  process.exit(1);
}
