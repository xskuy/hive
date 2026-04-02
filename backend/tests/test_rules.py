from app.features.market_sentinel.rules import classify_event, compute_confidence


def test_classify_event_prefers_combined_signal() -> None:
    assert classify_event(3.2, 2.9, 2.0, 2.5) == "price_volume_spike"


def test_classify_event_handles_directional_price_move() -> None:
    assert classify_event(-2.6, 1.4, 2.0, 2.5) == "price_spike_down"


def test_compute_confidence_clamps_to_one() -> None:
    score = compute_confidence(4.0, 3.0, 2.0, 2.5, True)
    assert score == 1.0
