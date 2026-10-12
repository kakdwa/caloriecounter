import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseWeightRecord,
  mergeHealthRecords,
  readHealthExport,
} from "../src/lib/health";
const record = (
  value: string,
  unit = "kg",
  date = "2026-10-12 08:00:00 +0800",
  type = "HKQuantityTypeIdentifierBodyMass",
) =>
  `<Record type="${type}" value="${value}" unit="${unit}" startDate="${date}"/>`;
test("Apple Health kilograms and pounds normalize, preserving recorded local day", () => {
  assert.equal(parseWeightRecord(record("80"))?.weightKg, 80);
  assert.equal(parseWeightRecord(record("180", "lb"))?.weightKg, 81.647);
  assert.equal(
    parseWeightRecord(record("80", "kg", "2026-10-12 23:59:00 -0800"))?.date,
    "2026-10-12",
  );
});
test("only valid body mass records are accepted", () => {
  for (const r of [
    record("NaN"),
    record("-1"),
    record("800"),
    record("80", "oz"),
    record("80", "kg", "2099-01-01 00:00:00 +0000"),
    record("80", "kg", "2026-02-30 00:00:00 +0000"),
    record("80", "kg", undefined, "HKQuantityTypeIdentifierHeartRate"),
  ])
    assert.equal(parseWeightRecord(r), null);
});
test("latest daily weight wins, imports sort chronologically", () => {
  const list = [
    parseWeightRecord(record("81"))!,
    parseWeightRecord(record("80", "kg", "2026-10-12 09:00:00 +0800"))!,
    parseWeightRecord(record("82", "kg", "2026-10-11 08:00:00 +0800"))!,
  ];
  assert.deepEqual(mergeHealthRecords(list), [
    { date: "2026-10-11", weightKg: 82 },
    { date: "2026-10-12", weightKg: 80 },
  ]);
});
test("streaming import ignores unrelated records and rejects wrong files", async () => {
  const file = new File(
    [
      `<?xml version="1.0"?><HealthData>${record("80")}${record("72", "count/min", undefined, "HKQuantityTypeIdentifierHeartRate")}</HealthData>`,
    ],
    "export.xml",
  );
  assert.deepEqual(await readHealthExport(file), [
    { date: "2026-10-12", weightKg: 80 },
  ]);
  await assert.rejects(
    readHealthExport(new File(["bad"], "export.zip")),
    /Unzip/,
  );
  await assert.rejects(
    readHealthExport(new File(["bad"], "export.xml")),
    /Choose/,
  );
});
test("record split across input chunks is not lost", async () => {
  const text = `<HealthData>${record("80")}</HealthData>`,
    encoded = new TextEncoder().encode(text);
  const fake = {
    name: "export.xml",
    size: encoded.length,
    stream: () =>
      new ReadableStream({
        start(c) {
          for (let i = 0; i < encoded.length; i += 7)
            c.enqueue(encoded.slice(i, i + 7));
          c.close();
        },
      }),
  } as File;
  assert.equal((await readHealthExport(fake))[0].weightKg, 80);
});

import {
  parseHealthRecord,
  mergeMeasurements,
  readHealthMeasurements,
} from "../src/lib/health";
test("Apple percent fractions convert exactly once, BMI and lean mass retain proper units", () => {
  const fat = parseHealthRecord(
    record(
      "0.235",
      "%",
      undefined,
      "HKQuantityTypeIdentifierBodyFatPercentage",
    ),
  );
  assert.equal(fat?.value, 23.5);
  assert.equal(fat?.metric, "bodyFatPercent");
  assert.equal(
    parseHealthRecord(
      record(
        "26.1",
        "count",
        undefined,
        "HKQuantityTypeIdentifierBodyMassIndex",
      ),
    )?.value,
    26.1,
  );
  assert.equal(
    parseHealthRecord(
      record("140", "lb", undefined, "HKQuantityTypeIdentifierLeanBodyMass"),
    )?.value,
    63.503,
  );
  assert.equal(
    parseHealthRecord(
      record(
        "23.5",
        "%",
        undefined,
        "HKQuantityTypeIdentifierBodyFatPercentage",
      ),
    ),
    null,
  );
});
test("body-only days survive import and latest value is chosen per measurement", () => {
  const records = [
    parseHealthRecord(
      record(
        "0.24",
        "%",
        undefined,
        "HKQuantityTypeIdentifierBodyFatPercentage",
      ),
    )!,
    parseHealthRecord(
      record(
        "0.235",
        "%",
        "2026-10-12 09:00:00 +0800",
        "HKQuantityTypeIdentifierBodyFatPercentage",
      ),
    )!,
    parseHealthRecord(
      record("63.2", "kg", undefined, "HKQuantityTypeIdentifierLeanBodyMass"),
    )!,
    parseHealthRecord(
      record(
        "26.1",
        "count",
        undefined,
        "HKQuantityTypeIdentifierBodyMassIndex",
      ),
    )!,
  ];
  const r = mergeMeasurements(records);
  assert.deepEqual(r.weighIns, []);
  assert.deepEqual(r.bodyMetrics, [
    {
      date: "2026-10-12",
      bodyFatPercent: 23.5,
      leanBodyMassKg: 63.2,
      bmi: 26.1,
    },
  ]);
});
test("streaming full body-composition import", async () => {
  const f = new File(
    [
      `<HealthData>${record("80")}${record("0.235", "%", undefined, "HKQuantityTypeIdentifierBodyFatPercentage")}${record("63.2", "kg", undefined, "HKQuantityTypeIdentifierLeanBodyMass")}</HealthData>`,
    ],
    "export.xml",
  );
  const r = await readHealthMeasurements(f);
  assert.equal(r.weighIns.length, 1);
  assert.equal(r.bodyMetrics[0].bodyFatPercent, 23.5);
  assert.equal(r.bodyMetrics[0].leanBodyMassKg, 63.2);
});
