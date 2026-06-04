export function isDemoModeEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function demoModeLabel() {
  return isDemoModeEnabled() ? "Demo Data" : null;
}

export function assertNoProductionDemoData(context: string) {
  if (!isDemoModeEnabled()) {
    throw new Error(`${context} attempted to use demo data in production`);
  }
}
