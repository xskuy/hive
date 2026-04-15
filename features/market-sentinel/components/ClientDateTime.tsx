"use client"

import { useSyncExternalStore } from "react"

type ClientDateTimeProps = {
  value: string | null
  emptyLabel?: string
}

const serverDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "UTC",
})

function formatServerDateTime(value: string) {
  return `${serverDateTimeFormatter.format(new Date(value))} UTC`
}

function formatClientDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function subscribe() {
  return () => {}
}

function getClientSnapshot() {
  return true
}

function getServerSnapshot() {
  return false
}

export function ClientDateTime({
  value,
  emptyLabel = "Still running",
}: ClientDateTimeProps) {
  const isMounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  )

  if (!value) {
    return <>{emptyLabel}</>
  }

  const label = isMounted
    ? formatClientDateTime(value)
    : formatServerDateTime(value)

  return (
    <time dateTime={value} suppressHydrationWarning>
      {label}
    </time>
  )
}
