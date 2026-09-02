import { execSync } from 'child_process';

// Fast non-blocking auto-sync before launching dev server
try {
  // 1. Fetch remote with a tight 3-second timeout (fails gracefully if offline)
  execSync('git fetch origin main --quiet', { timeout: 3500, stdio: 'ignore' });

  // 2. Check how many commits behind remote we are
  const status = execSync('git rev-list --count HEAD..origin/main', { encoding: 'utf-8' }).trim();
  const behindCount = parseInt(status, 10) || 0;

  if (behindCount > 0) {
    console.log(`\x1b[36m⚡ [Auto-Sync] พบโค้ดใหม่จากอีกเครื่อง (${behindCount} commit)! กำลังดึงข้อมูลล่าสุดอัตโนมัติ...\x1b[0m`);
    execSync('git pull --rebase origin main', { stdio: 'inherit' });
    console.log(`\x1b[32m✅ [Auto-Sync] ซิงค์โค้ดล่าสุดเรียบร้อยแล้ว!\x1b[0m\n`);
  }
} catch (e) {
  // If offline or git error, proceed to Vite without crashing
  // (Do not block the developer from running locally)
}
