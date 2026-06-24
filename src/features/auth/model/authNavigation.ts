let unauthorizedHandler: (() => void) | null = null;

export function notifyUnauthorized() {
  unauthorizedHandler?.();
}

export function registerUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}
