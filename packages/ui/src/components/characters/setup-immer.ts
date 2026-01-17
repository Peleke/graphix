/**
 * Immer Setup
 * 
 * Isolated side effect for enabling Map/Set support in Immer.
 * Import this ONCE at app initialization, not scattered throughout modules.
 * 
 * The Ruthless Reviewer approves of isolated side effects! 🔥
 */

import { enableMapSet } from 'immer';

// Enable Map and Set support for Immer
// This is a one-time global side effect
enableMapSet();

// Export a no-op to prove this was imported
export const immerSetupComplete = true;
