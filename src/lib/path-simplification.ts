
type Point = { x: number; y: number };

// Helper function to calculate the square of the distance between two points
function getSquareDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return dx * dx + dy * dy;
}

// Helper function to calculate the square of the perpendicular distance from a point to a line segment
function getSquareSegmentDistance(p: Point, p1: Point, p2: Point): number {
  let { x, y } = p1;
  let dx = p2.x - x;
  let dy = p2.y - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

    if (t > 1) {
      x = p2.x;
      y = p2.y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;

  return dx * dx + dy * dy;
}

// Simplification function using the Ramer-Douglas-Peucker algorithm
function simplifyRadialDistance(points: Point[], tolerance: number): Point[] {
  let prevPoint = points[0];
  const newPoints = [prevPoint];
  let point: Point;

  for (let i = 1, len = points.length; i < len; i++) {
    point = points[i];
    if (getSquareDistance(point, prevPoint) > tolerance) {
      newPoints.push(point);
      prevPoint = point;
    }
  }

  if (prevPoint !== point!) newPoints.push(point!);

  return newPoints;
}

function simplifyDouglasPeucker(points: Point[], tolerance: number): Point[] {
  const len = points.length;
  if (len <= 2) return points;

  let maxDist = 0;
  let index = 0;

  for (let i = 1; i < len - 1; i++) {
    const dist = getSquareSegmentDistance(points[i], points[0], points[len - 1]);
    if (dist > maxDist) {
      index = i;
      maxDist = dist;
    }
  }

  if (maxDist > tolerance) {
    const recResults1 = simplifyDouglasPeucker(points.slice(0, index + 1), tolerance);
    const recResults2 = simplifyDouglasPeucker(points.slice(index), tolerance);

    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  } else {
    return [points[0], points[len - 1]];
  }
}

export function simplify(points: Point[], tolerance: number, highestQuality = false): Point[] {
  if (points.length === 0) return [];
  const sqTolerance = tolerance * tolerance;

  points = highestQuality ? points : simplifyRadialDistance(points, sqTolerance);
  points = simplifyDouglasPeucker(points, sqTolerance);

  return points;
}
