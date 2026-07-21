// Temporary maintenance-mode switch.
//
// While this is ON, every page shows the "we'll be back soon" screen.
//
// To turn the site back ON:
//   - flip the constant below to `false`, OR
//   - set the env var MAINTENANCE_MODE=false (no code change / redeploy of code needed)
//
// Default is ON so the site stays in maintenance until explicitly re-enabled.
export const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'false' ? false : true
