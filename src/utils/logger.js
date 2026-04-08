/**
 * Sends a message to the Vite dev server to be printed in the terminal.
 * Only works during local development.
 * @param {string} message 
 */
export async function logToTerminal(message) {
  if (import.meta.env.MODE === 'production') return;

  try {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    }).catch(() => {
      // Silently fail if dev server is unreachable or plugin not loaded
    });
  } catch {
    // browser catch
  }
}
