// Receives streamed model output for a single chat request.
export interface StreamSink {
  chunk: (text: string) => void
  done: () => void
  error: (message: string) => void
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'APIUserAbortError')
}
