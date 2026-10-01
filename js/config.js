// Teacher settings. Edit this file on GitHub, no build step needed.
window.BYTEVILLE_CONFIG = {
  // Paste your Google Apps Script web app URL here to collect student answers.
  // Leave it empty ("") and the game still works; data then stays in each student's browser.
  trackingUrl: "https://script.google.com/macros/s/AKfycbzMD0hVF3PYUIhTZzdtK6Plrro5yQJyA7psHDD6s96dDJP8v2XWCVJGLnyG_68eZUk/exec",

  // Optional: must match CLASS_KEY in backend/Code.gs. Stops random people from writing to your sheet.
  classKey: "",

  // Pre-fills the class code on the sign-up screen.
  defaultClassCode: "CYBR-2000",

  // Show a top-8 class leaderboard on the town map (needs trackingUrl).
  showLeaderboard: true
};
