export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ data }, { status: 200, ...init })
}

export function jsonError(
  message: string,
  opts?: { status?: number; details?: unknown },
) {
  return Response.json(
    { error: { message, details: opts?.details } },
    { status: opts?.status ?? 400 },
  )
}
