import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const withDb = args.has('--with-db');

const runStep = (label, cmd, cmdArgs) => {
    console.log(`\n[preflight] ${label}`);
    const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit' });
    return result.status === 0;
};

const steps = [
    { label: 'Build', cmd: 'npm', args: ['run', 'build'] },
    { label: 'Lint', cmd: 'npm', args: ['run', 'lint'] }
];

if (withDb) {
    steps.push(
        { label: 'Verify DB RPC', cmd: 'node', args: ['scripts/verify_db.js'] },
        { label: 'Check staff_todos.branch', cmd: 'node', args: ['check_column.js'] }
    );
}

let ok = true;
for (const step of steps) {
    const passed = runStep(step.label, step.cmd, step.args);
    if (!passed) {
        ok = false;
        console.error(`[preflight] FAILED: ${step.label}`);
        break;
    }
}

if (!ok) {
    process.exit(1);
}

console.log('\n[preflight] PASSED');
