export type Status = 'GREEN' | 'AMBER' | 'RED' | 'UNKNOWN';
export type Env = 'Spacecraft' | 'Space Station' | 'Lunar Surface Base' | 'Mars Surface Base' | 'Rover / Surface Operations';
export const ENVS: Env[] = ['Spacecraft', 'Space Station', 'Lunar Surface Base', 'Mars Surface Base', 'Rover / Surface Operations'];
export type ScenarioId = 'stable' | 'fatigue' | 'hrtrend' | 'sleep' | 'chest';
export type Source = 'simulated' | 'manual';

export interface Baseline { hr: number; sys: number; dia: number; spo2: number; temp: number; sleepH: number }
export interface Profile {
  id: string; name: string; age: number; history: string; allergies: string; meds: string;
  baseline: Baseline;
  mission: { name: string; day: number; durationDays: number; destination: string; env: Env };
  simulated: boolean;
}
export type NumKey = 'hr' | 'sys' | 'dia' | 'spo2' | 'temp' | 'glucose' | 'sleepH' | 'sleepQ' | 'mood' | 'fatigue' | 'stress' | 'hydration' | 'cognition' | 'social' | 'exerciseMin';
export interface LabResult { id: string; key: string; value: number; unit: string; ts: number; source: 'manual'; method?: string }
export interface Reading {
  id: string; ts: number; source: Source; device?: string; recordedBy?: string;
  hr?: number; sys?: number; dia?: number; spo2?: number; temp?: number; glucose?: number;
  sleepH?: number; sleepQ?: number; mood?: number; fatigue?: number; stress?: number; hydration?: number; cognition?: number; social?: number; exerciseMin?: number;
}
export interface JournalEntry { id: string; ts: number; astroId: string; text: string }
export interface TimelineEntry { at: number; text: string }
export interface Report {
  id: string; ts: number; astroId: string; kind: 'emergency' | 'routine'; title: string;
  body: Record<string, any>; transmitted: boolean; transmittedAt?: number; // "transmitted" = manually marked as sent by the user; AETHRA never transmits
}
export interface Settings { largeText: boolean; reduceMotion: boolean; reminders: Record<string, boolean>; viewerRole: 'astronaut' | 'medical' | 'crew' }
export type OpsStatus = 'Available' | 'Limited' | 'Unavailable' | 'Not set';
export interface AppState {
  schema: number; loaded: boolean; onboarded: boolean; profiles: Profile[]; activeId: string;
  scenarios: Record<string, ScenarioId>; readings: Record<string, Reading[]>; labResults: Record<string, LabResult[]>;
  symptoms: Record<string, { ts: number; ids: string[] }>;
  journal: JournalEntry[]; reports: Report[]; ops: Record<string, OpsStatus>;
  taskLog: Record<string, string[]>; settings: Settings;
}
export interface Observation {
  level: 0 | 1 | 2; label: string; detail: string; key?: NumKey | 'pattern' | 'symptom';
  value?: string; baseline?: string; deviation?: string; at?: number; source?: Source; why?: string;
}
export interface Assessment {
  status: Status; statusReason: string; observations: Observation[]; factors: string[]; quality: string[];
  reassess: string; next: string[]; escalation: string[]; completeness: number; patterns: string[];
  version: string; asOf: number; freshSignals: number;
}
