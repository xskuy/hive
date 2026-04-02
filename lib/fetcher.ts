type ErrorPayload = {
  detail?: string
}

// Shared JSON fetch helper for feature API modules.
export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const payload = (await response.json()) as ErrorPayload
      if (payload.detail) {
        message = payload.detail
      }
    } catch {
      // Ignore JSON parsing failures and keep the generic message.
    }

    throw new Error(message)
  }

  return (await response.json()) as T
}
