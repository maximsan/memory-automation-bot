export function logRouteError(
  message: string,
  context: Record<string, unknown>,
): void {
  console.error(message, context);
}
