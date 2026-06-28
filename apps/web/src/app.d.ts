declare global {
  namespace App {
    interface Platform {
      env?: {
        MBTA_API_STATE?: KVNamespace;
      };
      context?: {
        waitUntil(promise: Promise<unknown>): void;
      };
    }
  }
}

export {};
