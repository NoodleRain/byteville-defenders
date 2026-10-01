// Teacher settings. Edit this file on GitHub, no build step needed.
// SECURITY: This config is loaded from a trusted source and contains sensitive URLs.
// Do not expose secrets like CLASS_KEY in the config file; keep them server-side.

window.BYTEVILLE_CONFIG = {
  // Paste your Google Apps Script web app URL here to collect student answers.
  // IMPORTANT: This endpoint MUST use HTTPS and be configured to:
  //   1. Require the CLASS_KEY (kept secret, not shared in this file)
  //   2. Validate all incoming data server-side
  //   3. Implement strict rate limiting (e.g., 100 requests per minute per session)
  //   4. Use HMAC-SHA256 to sign answers, so tampering is detectable
  //   5. Log all submissions for audit trails
  // Leave it empty ("") and the game still works; data then stays in each student's browser.
  trackingUrl: "https://script.google.com/macros/s/AKfycbzMD0hVF3PYUIhTZzdtK6Plrro5yQJyA7psHDD6s96dDJP8v2XWCVJGLnyG_68eZUk/exec",

  // SECURITY: CLASS_KEY should NOT be in this config file if it's sensitive.
  // Instead, implement server-side session validation:
  //   1. Generate a random session token on first connection
  //   2. Validate the token server-side before accepting answers
  //   3. Tie the token to an IP address or fingerprint (weak) or certificate (strong)
  // If you must use a class key here, rotate it frequently and treat it as semi-public.
  classKey: "",

  // Pre-fills the class code on the sign-up screen.
  // SECURITY: Validate this server-side; don't trust the client value.
  defaultClassCode: "CYBR-2000",

  // Show a top-8 class leaderboard on the town map (needs trackingUrl).
  // SECURITY: Only show data the user is authorized to see.
  // For public leaderboards, scrub PII (first names only, no full names or IDs).
  showLeaderboard: true,

  // SECURITY: Server-side requirements for production:
  // 1. All answers must be re-verified server-side before counting toward scores
  // 2. Implement robust rate limiting: 10-20 requests per minute per session
  // 3. Use Content Security Policy on your Google Apps Script endpoint
  // 4. Log all anomalies (repeated wrong answers, impossible time deltas, etc.)
  // 5. Validate session IDs match the browser's session (not forged)
  // 6. For Night Watch, do not ever send correct answers or passcodes to the client
  // 7. Implement exponential backoff for repeated incorrect answers
};
