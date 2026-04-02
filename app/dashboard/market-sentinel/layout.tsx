import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function MarketSentinelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Market Sentinel</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,rgba(157,255,0,0.08),rgba(255,255,255,0.02)_42%,rgba(255,255,255,0.01))] p-6 shadow-sm shadow-black/5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(157,255,0,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_36%)]" />
          <div className="relative space-y-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-[0.72rem] uppercase tracking-[0.38em] text-primary/85">
                  Market Sentinel
                </p>
                <h1 className="max-w-3xl font-heading text-3xl font-semibold tracking-tight">
                  Split the signal workflow into clean routes, not one giant page.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Use the sidebar to move between overview, alerts, runs and
                  settings while this surface stays focused on context and the
                  current task.
                </p>
              </div>

              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div className="rounded-[1.25rem] border border-border/60 bg-background/55 px-3 py-2">
                  Detect
                </div>
                <div className="rounded-[1.25rem] border border-border/60 bg-background/55 px-3 py-2">
                  Explain
                </div>
                <div className="rounded-[1.25rem] border border-border/60 bg-background/55 px-3 py-2">
                  Tune
                </div>
              </div>
            </div>
          </div>
        </section>

        {children}
      </div>
    </>
  )
}
