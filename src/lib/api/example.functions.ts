import { getServerConfig } from "../config.server";

// Example async function — runs client-side.
// For server-only logic, use a real backend API.
export async function getGreeting(data: {
  name: string;
}): Promise<{ greeting: string; mode: string }> {
  const config = getServerConfig();
  return {
    greeting: `Hello, ${data.name}!`,
    mode: config.nodeEnv ?? "unknown",
  };
}
