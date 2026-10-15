import { z } from "zod";
import {
  date,
  ProfileSchema,
  CoachingSchema,
  FoodSchema,
  BodyMetricsSchema,
  CoachSchema,
  ImageSchema,
} from "./coach";
import { SourceSchema } from "./research";
const bounded = z.number().finite().min(0).max(20000);
export const PlanSchema = z.object({
  startingWeightKg: z.number().min(20).max(400).optional(),
  targetsChangedAt: date.optional(),
  profile: ProfileSchema.extend({
    age: z.number().int().min(18).max(120),
    heightCm: z.number().min(80).max(250),
    weightKg: z.number().min(20).max(400),
  }),
  targets: z.object({
    calories: bounded,
    proteinG: bounded,
    carbsG: bounded,
    fatG: bounded,
    bmr: bounded,
    tdee: bounded,
    weeklyRateKg: z.number().finite().min(-10).max(10),
    projectedDate: date.nullable(),
  }),
  copy: z.object({
    summary: z.string(),
    burnNote: z.string(),
    proteinNote: z.string(),
    carbsNote: z.string(),
    fatNote: z.string(),
  }),
  createdAt: z.string(),
  coaching: CoachingSchema.optional(),
  demo: z.boolean().optional(),
});
export const EntrySchema = z.object({
  id: z.string().min(1),
  date,
  time: z.string(),
  text: z.string().max(12000),
  items: z.array(FoodSchema).max(100),
  demo: z.boolean().optional(),
});
export const WeightSchema = z.object({
  date,
  weightKg: z.number().min(20).max(400),
});
export const MemorySchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      date,
      title: z.string().max(2000),
      detail: z.string().max(2000),
    }),
  ),
  reflections: z.array(z.object({ date, text: z.string().max(12000) })),
  practices: z.array(z.object({ date, focus: z.string().max(2000) })),
});
export const DataSchema = z.object({
  bodyMetrics: z.array(BodyMetricsSchema).max(20000).default([]),
  plan: PlanSchema.nullable(),
  entries: z.array(EntrySchema).max(50000),
  weighIns: z.array(WeightSchema).max(20000),
  memory: MemorySchema,
  completedDays: z.array(date).max(20000),
  history: z
    .array(
      z.object({
        user: z.string().max(12000),
        assistant: z.string().max(24000),
      }),
    )
    .max(100),
});
export const BackupSchema = z.object({
  version: z.literal(2),
  data: DataSchema,
});

export const CoachUpdateSchema = CoachSchema.omit({
  profile: true, coaching: true, requiresProfessionalSupport: true, nutritionLookup: true,
}).extend({
  plan: PlanSchema.nullable(), demo: z.boolean(),
  meals: z.array(z.object({ operation: z.enum(["add", "replace", "remove"]),
    entryId: z.string().nullable(), date, label: z.string().max(12000), items: z.array(FoodSchema).max(100) })).max(10),
  research: z.object({ status: z.enum(["found", "no_results", "unavailable"]),
    sources: z.array(SourceSchema).max(12), note: z.string().max(2000) }).optional(),
});

export const DraftSchema = z.object({
  logDate: date.optional(),
  text: z.string().max(12000), images: z.array(ImageSchema).max(2),
  selectedId: z.string().nullable(), update: CoachUpdateSchema.nullable(),
});
