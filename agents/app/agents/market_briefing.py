from __future__ import annotations

from typing import Any

from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.store.memory import InMemoryStore
from langgraph.types import RetryPolicy
from typing_extensions import TypedDict

from app.market_sentinel.schemas import BriefingDraft
from config import settings


# ── Store (module-level singleton — persists within process lifetime) ─────────

briefing_store = InMemoryStore()

_TICKER_NS_PREFIX = ("market_sentinel", "ticker_history")
_MAX_TICKER_HISTORY = 5

retry = RetryPolicy(max_attempts=3, initial_interval=1.0)

# ── Sector maps ───────────────────────────────────────────────────────────────

_TECH = {
    "AAPL","MSFT","NVDA","AMD","INTC","GOOGL","GOOG","META","AMZN","TSLA",
    "NFLX","AVGO","ORCL","ADBE","CRM","NOW","SNPS","CDNS","KLAC","LRCX",
    "AMAT","MU","QCOM","TXN","ADI","MCHP","PANW","CRWD","FTNT","ZS",
}
_FINANCE = {
    "JPM","BAC","WFC","GS","MS","C","USB","PNC","AXP","BK","TFC","COF",
    "SCHW","BLK","CB","MMC","AON","MET","PRU","AIG","ICE","CME","SPGI","MCO",
}
_HEALTH = {
    "JNJ","UNH","PFE","ABBV","MRK","TMO","ABT","DHR","BMY","AMGN","GILD",
    "ISRG","VRTX","REGN","ZTS","BSX","EW","IQV","A","DXCM","HUM","CVS","CI",
}
_ENERGY = {
    "XOM","CVX","COP","EOG","SLB","PXD","MPC","PSX","VLO","OXY","HES","DVN",
    "FANG","BKR","HAL","KMI","WMB","OKE","ET","EPD",
}


def _detect_sector_patterns(tickers: set[str]) -> list[str]:
    patterns: list[str] = []
    for label, sector in (
        ("tecnología", _TECH),
        ("finanzas", _FINANCE),
        ("salud", _HEALTH),
        ("energía", _ENERGY),
    ):
        count = len(tickers & sector)
        if count >= 2:
            patterns.append(
                f"{count} empresas de {label} alertaron simultáneamente"
            )
    return patterns


# ── State ─────────────────────────────────────────────────────────────────────

class MarketBriefingState(TypedDict):
    scan_run_id: int
    current_alerts: list[dict[str, Any]]
    # populated by memory_reader
    ticker_histories: dict[str, list[dict[str, Any]]]
    sector_patterns: list[str]
    # output
    briefing: str
    standout_ticker: str | None
    noise_warning: str | None


# ── Nodes ─────────────────────────────────────────────────────────────────────

def _memory_reader_node(state: MarketBriefingState) -> dict[str, Any]:
    """Read per-ticker alert history from the store."""
    tickers = {a["ticker"] for a in state["current_alerts"]}
    histories: dict[str, list[dict[str, Any]]] = {}

    for ticker in tickers:
        ns = (*_TICKER_NS_PREFIX, ticker)
        items = briefing_store.search(ns)
        if items:
            histories[ticker] = [item.value for item in items]

    sector_patterns = _detect_sector_patterns(tickers)

    return {
        "ticker_histories": histories,
        "sector_patterns": sector_patterns,
    }


async def _briefing_generator_node(state: MarketBriefingState) -> dict[str, Any]:
    """Generate a concise scan briefing using current alerts and memory."""
    llm = ChatOpenAI(
        model=settings.market_sentinel_model_name,
        api_key=settings.openai_api_key,
        temperature=0,
    ).with_structured_output(BriefingDraft)

    alerts_lines = "\n".join(
        f"- {a['ticker']} ({a['company_name']}): {a['event_type']} | "
        f"confianza={a['confidence_score']:.2f} | "
        f"noticias={'sí' if a['has_news_support'] else 'no'} | "
        f"{a['que_paso']}"
        for a in state["current_alerts"]
    )

    history_lines: list[str] = []
    for ticker, history in state["ticker_histories"].items():
        noise_count = sum(1 for h in history if h.get("was_noise"))
        total = len(history)
        history_lines.append(
            f"- {ticker}: {total} alerta(s) previa(s), {noise_count} fue(ron) ruido"
        )
    history_block = (
        "Historial reciente de estos tickers:\n" + "\n".join(history_lines)
        if history_lines
        else "Sin historial previo para estos tickers (primer scan)."
    )

    sector_block = (
        "Patrones detectados: " + "; ".join(state["sector_patterns"])
        if state["sector_patterns"]
        else ""
    )

    response = await llm.ainvoke(
        f"""Eres un analista de mercado senior. Acabas de recibir los resultados de un scan automatizado.

ALERTAS DEL SCAN ({len(state['current_alerts'])} en total):
{alerts_lines}

{history_block}

{sector_block}

Genera un briefing con:
- summary: 2-3 oraciones directas sobre qué pasó, qué destaca y si hay patrones sectoriales. Menciona tickers por nombre. Sin frases genéricas.
- sector_patterns: lista de patrones multi-empresa si los hay (puede ser vacía)
- standout_ticker: el ticker más notable del scan, o null si no hay uno claro
- noise_warning: advertencia breve si algún ticker tiene historial alto de falsas alarmas, o null

Sé específico. Usa los datos reales."""
    )

    payload = BriefingDraft.model_validate(response)
    return {
        "briefing": payload.summary,
        "standout_ticker": payload.standout_ticker,
        "noise_warning": payload.noise_warning,
        # sector_patterns already set by memory_reader; merge LLM additions
        "sector_patterns": list(
            dict.fromkeys(state["sector_patterns"] + (payload.sector_patterns or []))
        ),
    }


def _memory_writer_node(state: MarketBriefingState) -> dict[str, Any]:
    """Persist this scan's alerts so future briefings have historical context."""
    for alert in state["current_alerts"]:
        ticker = alert["ticker"]
        ns = (*_TICKER_NS_PREFIX, ticker)

        existing = briefing_store.search(ns)
        if len(existing) >= _MAX_TICKER_HISTORY:
            oldest = min(existing, key=lambda x: x.value.get("scan_run_id", 0))
            briefing_store.delete(ns, oldest.key)

        briefing_store.put(
            ns,
            key=f"{state['scan_run_id']}_{ticker}",
            value={
                "ticker": ticker,
                "event_type": alert["event_type"],
                "confidence_score": alert["confidence_score"],
                "was_noise": alert.get("is_noise", False),
                "scan_run_id": state["scan_run_id"],
            },
        )

    return {}


# ── Graph ─────────────────────────────────────────────────────────────────────

def build_briefing_graph():
    graph = StateGraph(MarketBriefingState)

    graph.add_node("memory_reader", _memory_reader_node)
    graph.add_node(
        "briefing_generator",
        _briefing_generator_node,
        retry_policy=retry,
    )
    graph.add_node("memory_writer", _memory_writer_node)

    graph.add_edge(START, "memory_reader")
    graph.add_edge("memory_reader", "briefing_generator")
    graph.add_edge("briefing_generator", "memory_writer")
    graph.add_edge("memory_writer", END)

    return graph.compile()


briefing_graph = build_briefing_graph()
