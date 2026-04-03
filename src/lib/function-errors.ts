type FunctionErrorLike = {
  message?: string;
  context?: {
    json?: () => Promise<unknown>;
  };
};

export async function extractFunctionErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const functionError = error as FunctionErrorLike;

  try {
    const body = await functionError.context?.json?.();

    if (body && typeof body === 'object' && 'error' in body) {
      const message = (body as { error?: unknown }).error;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  } catch {
    // Ignore body parsing errors and fall back below.
  }

  if (typeof functionError.message === 'string' && functionError.message.trim()) {
    return functionError.message;
  }

  return fallback;
}