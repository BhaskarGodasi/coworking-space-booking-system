/**
 * Two ranges [aStart, aEnd) and [bStart, bEnd) overlap iff
 * aStart < bEnd AND bStart < aEnd. This is the single source of truth for
 * that predicate, shared by booking/maintenance overlap checks and by
 * space-listing's date-availability filter, so the interval math is never
 * re-derived (and never risks drifting) in more than one place.
 */
export function overlapsRange(startTime: Date, endTime: Date) {
  return {
    startTime: { lt: endTime },
    endTime: { gt: startTime },
  };
}
