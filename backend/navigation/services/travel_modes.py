
from dataclasses import dataclass


@dataclass(frozen=True)
class TravelMode:
    id: str
    label: str
    icon: str
    ors_profile: str


TRAVEL_MODES = {
    "driving": TravelMode(
        id="driving",
        label="Car",
        icon="car",
        ors_profile="driving-car",
    ),
    "cycling": TravelMode(
        id="cycling",
        label="Bicycle",
        icon="bike",
        ors_profile="cycling-regular",
    ),
    "walking": TravelMode(
        id="walking",
        label="Walking",
        icon="footprints",
        ors_profile="foot-walking",
    ),
}


def get_travel_mode(mode_id: str) -> TravelMode:
    """Return a supported travel mode or raise ValueError."""
    try:
        return TRAVEL_MODES[mode_id]
    except KeyError:
        raise ValueError(
            f"Unsupported travel mode: {mode_id}"
        ) from None


def get_available_travel_modes() -> list[dict]:
    """Return public travel mode information for React."""
    return [
        {
            "id": mode.id,
            "label": mode.label,
            "icon": mode.icon,
        }
        for mode in TRAVEL_MODES.values()
    ]
