export function allowsLocalForceRun(request: Request): boolean {
  const url = new URL(request.url);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

  return (
    url.searchParams.get("force") === "1"
    && process.env.VERCEL !== "1"
    && localHosts.has(url.hostname)
  );
}
