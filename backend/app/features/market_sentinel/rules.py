from __future__ import annotations


PRICE_WEIGHT = 0.4
VOLUME_WEIGHT = 0.3
NEWS_WEIGHT = 0.3


def is_price_anomaly(price_change_pct: float, threshold: float) -> bool:
    """Flag large directional price moves."""
    return abs(price_change_pct) >= threshold


def is_volume_anomaly(volume_ratio: float, threshold: float) -> bool:
    """Flag abnormal volume against the rolling baseline."""
    return volume_ratio >= threshold


def classify_event(
    price_change_pct: float,
    volume_ratio: float,
    price_threshold: float,
    volume_threshold: float,
) -> str | None:
    """Turn raw metrics into a stable event taxonomy."""
    price_triggered = is_price_anomaly(price_change_pct, price_threshold)
    volume_triggered = is_volume_anomaly(volume_ratio, volume_threshold)

    if price_triggered and volume_triggered:
        return "price_volume_spike"
    if price_triggered:
        return "price_spike_up" if price_change_pct > 0 else "price_spike_down"
    if volume_triggered:
        return "volume_spike"
    return None


def compute_confidence(
    price_change_pct: float,
    volume_ratio: float,
    price_threshold: float,
    volume_threshold: float,
    has_news_support: bool,
) -> float:
    """Keep the MVP scoring transparent and deterministic."""
    score = 0.0

    if is_price_anomaly(price_change_pct, price_threshold):
        score += PRICE_WEIGHT
    if is_volume_anomaly(volume_ratio, volume_threshold):
        score += VOLUME_WEIGHT
    if has_news_support:
        score += NEWS_WEIGHT

    return max(0.0, min(1.0, round(score, 2)))
