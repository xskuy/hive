import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getMarketSentinelConfigSnapshot,
  getMarketSentinelRuns,
  summarizeRunStats,
} from "@/features/market-sentinel/market-sentinel.server"
import { cn } from "@/lib/utils"

function formatDate(value: string | null) {
  if (!value) return "Running"
  return new Date(value).toLocaleString()
}

function formatDuration(startedAt: string, finishedAt: string | null) {
  if (!finishedAt) return "In progress"

  const started = new Date(startedAt).getTime()
  const finished = new Date(finishedAt).getTime()
  const seconds = Math.max(0, Math.round((finished - started) / 1000))

  if (seconds < 60) return `${seconds}s`

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

function toneFor(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-700"
  if (status === "failed") return "bg-destructive/10 text-destructive"
  return "bg-muted text-muted-foreground"
}

export default async function Page() {
  const [runs, config] = await Promise.all([
    getMarketSentinelRuns(12),
    getMarketSentinelConfigSnapshot(),
  ])
  const stats = summarizeRunStats(runs)

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardDescription>Total runs</CardDescription>
            <CardTitle className="text-3xl">{stats.totalRuns}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">{stats.completedRuns}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardDescription>Threshold candidates</CardDescription>
            <CardTitle className="text-3xl">
              {runs.reduce((sum, run) => sum + run.threshold_candidates, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardDescription>Noise discarded</CardDescription>
            <CardTitle className="text-3xl">
              {runs.reduce((sum, run) => sum + run.noise_discarded, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardDescription>Cooldown suppressed</CardDescription>
            <CardTitle className="text-3xl">
              {runs.reduce((sum, run) => sum + run.cooldown_suppressed, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardDescription>Failed tickers</CardDescription>
            <CardTitle className="text-3xl">
              {runs.reduce((sum, run) => sum + run.failed_tickers, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardDescription>Universe size</CardDescription>
            <CardTitle className="text-3xl">{config.configured_universe_size}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>Run ledger</CardTitle>
            <CardDescription>
              Follow scan cadence, output volume and execution status without
              leaving the Market Sentinel shell.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {runs.length === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed p-6 text-sm text-muted-foreground">
                No scan runs have been persisted yet.
              </div>
            ) : (
              runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-[1.6rem] border border-border/60 bg-background/65 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">Run #{run.id}</p>
                        <Badge className={cn("border-transparent", toneFor(run.status))}>
                          {run.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Started {new Date(run.started_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Universe
                        </p>
                        <p className="mt-1 font-medium">{run.universe_size}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Reviewed
                        </p>
                        <p className="mt-1 font-medium">{run.signals_reviewed}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Anomalies
                        </p>
                        <p className="mt-1 font-medium">{run.anomalies_found}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Candidates
                        </p>
                        <p className="mt-1 font-medium">{run.threshold_candidates}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Alerts
                        </p>
                        <p className="mt-1 font-medium">{run.alerts_created}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Noise
                        </p>
                        <p className="mt-1 font-medium">{run.noise_discarded}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Cooldown
                        </p>
                        <p className="mt-1 font-medium">{run.cooldown_suppressed}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Failures
                        </p>
                        <p className="mt-1 font-medium">{run.failed_tickers}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Duration
                        </p>
                        <p className="mt-1 font-medium">
                          {formatDuration(run.started_at, run.finished_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Finished {formatDate(run.finished_at)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>Operational notes</CardTitle>
            <CardDescription>
              Context that keeps the run history interpretable while the feature
              is still tightening signal quality.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-[1.4rem] border border-border/60 bg-background/65 p-4">
              Alerts are persisted per run, but repeated ticker and event pairs
              are now suppressed by the runtime cooldown window.
            </div>
            <div className="rounded-[1.4rem] border border-border/60 bg-background/65 p-4">
              The current scan universe is fixed to {config.configured_universe_size}{" "}
              tickers. More candidates means more yfinance calls and more agent
              work.
            </div>
            <div className="rounded-[1.4rem] border border-border/60 bg-background/65 p-4">
              This page is intentionally read-heavy and server-rendered so it
              stays cheap while the alert desk keeps the client interactivity.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
