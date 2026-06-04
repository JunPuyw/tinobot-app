type PlatformFlowDetails = Record<string, unknown>;

function formatPlatformFlow(flowId: string, event: string, details: PlatformFlowDetails) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    flowId,
    event,
    ...details,
  });
}

export function logPlatformFlow(
  flowId: string,
  event: string,
  details: PlatformFlowDetails = {},
) {
  console.info("[PlatformFlow]", formatPlatformFlow(flowId, event, details));
}

export function logPlatformFlowError(
  flowId: string,
  event: string,
  details: PlatformFlowDetails = {},
) {
  console.error("[PlatformFlow]", formatPlatformFlow(flowId, event, details));
}
