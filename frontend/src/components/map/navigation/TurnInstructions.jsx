
import {
  formatNavigationDistance,
  getTurnIcon,
} from "../../../utils/navigation/routeInstructions";

/**
 * Displays the upcoming navigation maneuver
 * and the remaining route distance.
 */
export default function TurnInstructions({
  navigation,
}) {
  if (!navigation) return null;

  const {
    nextInstruction,
    distanceToNextTurn,
    remainingDistance,
    hasReliablePosition,
  } = navigation;

  if (!nextInstruction) {
    return (
      <div className="alert alert-secondary mt-3 mb-0 small">
        Turn-by-turn instructions are unavailable
        for this route.
      </div>
    );
  }

  const icon = getTurnIcon(nextInstruction.type);

  return (
    <section
      className="border rounded-3 p-3 mt-3 bg-light"
      aria-label="Upcoming navigation instruction"
    >
      <div className="small fw-semibold text-primary mb-2">
        <i className="bi bi-signpost-2 me-2" />
        NEXT DIRECTION
      </div>

      <div className="d-flex align-items-start gap-3">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 bg-primary text-white flex-shrink-0"
          style={{ width: 54, height: 54 }}
        >
          <i className={`bi ${icon} fs-3`} />
        </div>

        <div className="flex-grow-1">
          <div className="fw-bold fs-6">
            {nextInstruction.instruction}
          </div>

          <div className="fw-semibold text-primary mt-1">
            {hasReliablePosition &&
            Number.isFinite(distanceToNextTurn)
              ? formatNavigationDistance(
                  distanceToNextTurn
                )
              : "Waiting for GPS..."}
          </div>
        </div>
      </div>

      <div className="border-top mt-3 pt-2 d-flex justify-content-between align-items-center">
        <span className="small text-secondary">
          Remaining route
        </span>

        <span className="small fw-semibold">
          {hasReliablePosition &&
          Number.isFinite(remainingDistance)
            ? formatNavigationDistance(
                remainingDistance
              )
            : "--"}
        </span>
      </div>
    </section>
  );
}
