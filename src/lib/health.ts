import type { BodyMetrics, WeighIn } from "../../shared/types";
import { localDate } from "./format";
export interface HealthRecord extends WeighIn {
  timestamp: string;
}
export type HealthMetric =
  "weightKg" | "bmi" | "bodyFatPercent" | "leanBodyMassKg";
export interface MetricRecord {
  date: string;
  timestamp: string;
  metric: HealthMetric;
  value: number;
}
export interface HealthImport {
  weighIns: WeighIn[];
  bodyMetrics: BodyMetrics[];
}
const types: Record<string, HealthMetric> = {
  HKQuantityTypeIdentifierBodyMass: "weightKg",
  HKQuantityTypeIdentifierBodyMassIndex: "bmi",
  HKQuantityTypeIdentifierBodyFatPercentage: "bodyFatPercent",
  HKQuantityTypeIdentifierLeanBodyMass: "leanBodyMassKg",
};
/** Only the four requested measurements are read; XML entities and other health data are never evaluated. */
export function parseHealthRecord(
  tag: string,
  today = localDate(),
): MetricRecord | null {
  const attrs: Record<string, string> = {};
  for (const m of tag.matchAll(/([A-Za-z]+)\s*=\s*"([^"<>]*)"/g))
    attrs[m[1]] = m[2];
  const metric = types[attrs.type];
  if (!metric) return null;
  let value = Number(attrs.value);
  const date = attrs.startDate?.slice(0, 10);
  if (
    !attrs.value ||
    !Number.isFinite(value) ||
    !date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date > today
  )
    return null;
  const d = new Date(date + "T12:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date)
    return null;
  if (metric === "weightKg" || metric === "leanBodyMassKg") {
    const multiplier =
      attrs.unit === "kg"
        ? 1
        : attrs.unit === "lb"
          ? 0.45359237
          : attrs.unit === "st"
            ? 6.35029318
            : attrs.unit === "g"
              ? 0.001
              : 0;
    if (!multiplier) return null;
    value *= multiplier;
    if (
      value < (metric === "weightKg" ? 20 : 5) ||
      value > (metric === "weightKg" ? 400 : 300)
    )
      return null;
  } else if (metric === "bodyFatPercent") {
    // HealthKit percent is a fraction, including in Apple's XML: 0.235 = 23.5%.
    if (attrs.unit !== "%" || value < 0.01 || value > 0.75) return null;
    value *= 100;
  } else if (attrs.unit !== "count" || value < 5 || value > 150) return null;
  return {
    date,
    metric,
    value: Math.round(value * 1000) / 1000,
    timestamp: attrs.startDate,
  };
}
export function parseWeightRecord(
  tag: string,
  today = localDate(),
): HealthRecord | null {
  const r = parseHealthRecord(tag, today);
  return r?.metric === "weightKg"
    ? { date: r.date, weightKg: r.value, timestamp: r.timestamp }
    : null;
}
export function mergeMeasurements(records: MetricRecord[]): HealthImport {
  const latest = new Map<string, MetricRecord>();
  for (const r of records) {
    const key = r.date + "/" + r.metric;
    if (!latest.has(key) || latest.get(key)!.timestamp < r.timestamp)
      latest.set(key, r);
  }
  const weighIns: WeighIn[] = [],
    body = new Map<string, BodyMetrics>();
  for (const r of latest.values()) {
    if (r.metric === "weightKg")
      weighIns.push({ date: r.date, weightKg: r.value });
    else
      body.set(r.date, {
        ...body.get(r.date),
        date: r.date,
        [r.metric]: r.value,
      });
  }
  return {
    weighIns: weighIns.sort((a, b) => a.date.localeCompare(b.date)),
    bodyMetrics: [...body.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  };
}
export function mergeHealthRecords(records: HealthRecord[]): WeighIn[] {
  return mergeMeasurements(
    records.map((r) => ({
      date: r.date,
      timestamp: r.timestamp,
      metric: "weightKg",
      value: r.weightKg,
    })),
  ).weighIns;
}
export async function readHealthMeasurements(
  file: File,
): Promise<HealthImport> {
  if (!file.name.toLowerCase().endsWith(".xml"))
    throw new Error(
      "Unzip your Apple Health export, then choose export.xml from the apple_health_export folder.",
    );
  if (file.size > 1024 * 1024 * 1024)
    throw new Error("This export is larger than 1 GB. Use a smaller export.");
  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  const records: MetricRecord[] = [];
  let foundHealth = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      foundHealth = foundHealth || buffer.includes("<HealthData");
      let start = buffer.indexOf("<Record ");
      while (start !== -1) {
        const end = buffer.indexOf(">", start);
        if (end === -1) {
          buffer = buffer.slice(start);
          break;
        }
        const record = parseHealthRecord(buffer.slice(start, end + 1));
        if (record) records.push(record);
        buffer = buffer.slice(end + 1);
        start = buffer.indexOf("<Record ");
      }
      if (start === -1) buffer = buffer.slice(-128);
      if (buffer.length > 65536)
        throw new Error("This does not look like an Apple Health export.");
    }
  } finally {
    reader.releaseLock();
  }
  if (!foundHealth)
    throw new Error("Choose the export.xml file from Apple Health.");
  const result = mergeMeasurements(records);
  if (!result.weighIns.length && !result.bodyMetrics.length)
    throw new Error(
      "No supported body measurements were found in this export. Check that your scale shares them with Apple Health.",
    );
  return result;
}
export async function readHealthExport(file: File) {
  return (await readHealthMeasurements(file)).weighIns;
}
