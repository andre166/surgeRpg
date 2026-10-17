/**
 * Sandbox (test) mode, decided at build time by Vite: VITE_SANDBOX=1 (see .env.sandbox and the
 * *:sandbox npm scripts). In regular builds the flag is the literal `false`, so everything it
 * guards is dropped from the bundle: players cannot turn it on.
 *
 * Sandbox mode shows the Cheats menu, marks the title screen, starts muted and uses its own save file, so
 * test runs never touch the real profile.
 */
export const SANDBOX = import.meta.env.VITE_SANDBOX === '1';

/** Save slot of the profile: the sandbox keeps a separate file. */
export const PROFILE_SAVE_SLOT = SANDBOX ? 'profile-sandbox' : 'profile';
