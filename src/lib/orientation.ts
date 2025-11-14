export const ORIENTATIONS = ["north", "south", "east", "west", "up", "down"] as const;

export type Orientation = (typeof ORIENTATIONS)[number];

const OPPOSITE: Record<Orientation, Orientation> = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
  up: "down",
  down: "up",
};

export function getOppositeOrientation(orientation: Orientation): Orientation {
  return OPPOSITE[orientation] ?? orientation;
}

