// Half-open intervals [start, end) in epoch ms.
// Half-open means a booking ending at 11:00 and one starting at 11:00 do NOT overlap.

export interface Interval {
  start: number;
  end: number;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Sort and merge touching/overlapping intervals. */
export function merge(list: Interval[]): Interval[] {
  const sorted = list.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** Remove every interval in `cut` from `base`. */
export function subtract(base: Interval[], cut: Interval[]): Interval[] {
  let result = merge(base);
  for (const c of merge(cut)) {
    const next: Interval[] = [];
    for (const b of result) {
      if (!overlaps(b, c)) {
        next.push(b);
        continue;
      }
      if (c.start > b.start) next.push({ start: b.start, end: c.start });
      if (c.end < b.end) next.push({ start: c.end, end: b.end });
    }
    result = next;
  }
  return result;
}

export function contains(outer: Interval, inner: Interval): boolean {
  return inner.start >= outer.start && inner.end <= outer.end;
}
