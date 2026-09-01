/**
 * Static config consistency checks against index.html -- catches drift
 * between UI-advertised limits and what the service layer actually enforces.
 */

const fs = require('fs');
const path = require('path');
import { MonteCarloService } from '../../scripts/services/MonteCarloService.js';

describe('index.html config consistency', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');

  test('Monte Carlo iterations input max matches the service-enforced cap (ISSUES.md #29)', () => {
    const match = html.match(/id="monte-carlo-iterations"[^>]*max="(\d+)"/);
    expect(match).not.toBeNull();

    const uiMax = parseInt(match[1], 10);
    const service = new MonteCarloService({ on: () => {}, emit: () => {} });
    expect(uiMax).toBe(service.defaultConfig.maxIterations);
  });
});
