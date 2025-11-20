const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function main() {
  const artifactPath = path.resolve(__dirname, '..', 'artifacts', 'contracts', 'SimpleStaking.sol', 'SimpleStaking.json');
  if (!fs.existsSync(artifactPath)) {
    console.error('Compiled artifact not found at', artifactPath);
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  let commit = 'unknown';
  try {
    commit = cp.execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    // ignore
  }

  const outDir = path.resolve(__dirname, '..', 'deployments');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const out = {
    generatedAt: new Date().toISOString(),
    commit,
    contract: 'SimpleStaking',
    source: artifact.sourceName || 'contracts/SimpleStaking.sol',
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    metadata: artifact.metadata || null,
  };

  const outPath = path.join(outDir, `deploy-artifact-${commit}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Wrote deployment artifact to', outPath);
}

main();
