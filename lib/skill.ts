import fs from 'fs';
import path from 'path';

let cachedSkillContent: string | null = null;

/**
 * Loads the institutional SMC Playbook and rules from skills/SKILL.md
 * Caches the content in memory to avoid repetitive disk I/O.
 */
export function getSkillContent(): string {
  if (cachedSkillContent) {
    return cachedSkillContent;
  }

  try {
    const filePath = path.join(process.cwd(), 'skills', 'SKILL.md');
    if (fs.existsSync(filePath)) {
      cachedSkillContent = fs.readFileSync(filePath, 'utf8');
      return cachedSkillContent;
    }
  } catch (error) {
    console.error('[SKILLS LOAD ERROR] Failed to read SKILL.md:', error);
  }

  // Fallback if file not found or failed to read
  return `
# NIFTY 50 INSTITUTIONAL SMC RULES (FALLBACK)
- Trade only with the major structural trend.
- Identify unmitigated Order Blocks and Fair Value Gaps.
- Avoid trading during 09:15-09:30 and 15:15-15:30 IST buffer zones.
- Respect VIX limits (maximum volatility VIX limit is 25).
  `;
}
