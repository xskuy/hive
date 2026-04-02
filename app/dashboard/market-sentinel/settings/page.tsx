import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketSentinelSettingsForm } from "@/features/market-sentinel/components/MarketSentinelSettingsForm"
import { getMarketSentinelConfigSnapshot } from "@/features/market-sentinel/market-sentinel.server"

const NEXT_STAGE_ITEMS = [
  "Promote multiple universes or watchlists instead of one fixed JSON profile.",
  "Expose news quality controls, relevance floors and suppression windows.",
  "Add audit history so operators can see who changed scan sensitivity and when.",
] as const

export default async function Page() {
  const config = await getMarketSentinelConfigSnapshot()

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <Card className="h-full border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>Live scan profile</CardTitle>
            <CardDescription>
              Edit runtime thresholds from the dashboard instead of touching env
              files between scans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MarketSentinelSettingsForm config={config} />
          </CardContent>
        </Card>

        <Card className="h-full border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>Profile notes</CardTitle>
            <CardDescription>
              Supporting context for the live runtime profile and the next scan.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-1 flex-col text-sm text-muted-foreground">
            <div className="space-y-3">
              <div className="rounded-[1.4rem] border border-border/60 bg-background/65 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Universe source
                </p>
                <p className="mt-2 break-all font-mono text-xs text-foreground">
                  {config.universe_path}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-border/60 bg-background/65 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Request timeout
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {config.request_timeout_seconds.toFixed(0)} seconds
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-border/60 bg-background/65 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Last updated
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {config.updated_at
                    ? new Date(config.updated_at).toLocaleString()
                    : "Using defaults"}
                </p>
              </div>
            </div>
            <div className="mt-auto rounded-[1.4rem] border border-dashed p-4">
              Splitting this screen out now avoids mixing sensitivity controls
              into the alert desk and keeps future edits isolated to one route.
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle>Next upgrades</CardTitle>
          <CardDescription>
            The most natural extensions now that this route owns real controls.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-3">
          {NEXT_STAGE_ITEMS.map((item) => (
            <div
              key={item}
              className="rounded-[1.4rem] border border-border/60 bg-background/65 p-4 text-sm leading-6 text-muted-foreground"
            >
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
