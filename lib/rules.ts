/**
 * HYBRID RESEARCH PROTOTYPE. General adult screening references are used for selected vital signs;
 * NASA OSD source-supplied laboratory intervals are used only for compatible lab analytes.
 * Neither is a mission-approved flight-medicine protocol; flight-surgeon rules must supersede these.
 * HR urgent cut-offs, temperature/glucose, sleep and wellbeing heuristics remain prototype rules.
 */
export const RULES = {
  hrDevPctAmber: 15, hrRed: 130, hrLowRed: 40,
  hrRisingReadings: 4, hrRisingTotalPct: 20,
  sysAmber: 130, diaAmber: 80, sysRed: 180, diaRed: 120, bpDevPctAmber: 15, // adult AHA categories; single readings are screening prompts, not diagnosis
  spo2Amber: 95, spo2Red: 90, // Typical healthy adult SpO₂ is 95–100%; <90 is an urgent screening prompt, not a diagnosis.
  spo2BaselineDrop: 3,
  tempAmber: 37.8, tempRed: 39.0, tempBaselineRise: 0.8,
  glucoseLow: 70, glucoseHigh: 180, glucoseRedLow: 54, glucoseRedHigh: 300,
  sleepLowH: 6, sleepBaselineDropH: 1.5,
  fatigueHigh: 7, moodLow: 3, stressHigh: 8, hydrationLow: 3, cognitionLow: 4,
  fatigueRise: 3, staleHours: 36,
  hrAbsLow: 60, hrAbsHigh: 100, // fallback ONLY when no personal baseline exists; general adult resting pulse reference
  minFreshCoreSignals: 2,
};

/** Symptoms that ALWAYS force RED regardless of any measurement or AI output. */
export const RED_SYMPTOMS: Record<string, string> = {
  chest_pain: 'Chest pain or pressure', difficulty_breathing: 'Difficulty breathing', loss_consciousness: 'Loss of consciousness',
  severe_dizziness: 'Severe dizziness', allergic_reaction: 'Severe allergic reaction', serious_injury: 'Serious injury',
  severe_bleeding: 'Severe bleeding', high_fever: 'High fever', sudden_confusion: 'Sudden confusion', other_urgent: 'Other urgent symptom',
};
export const AMBER_SYMPTOMS: Record<string, string> = {
  headache: 'Headache', nausea: 'Nausea', visual_changes: 'Change in vision', mild_dizziness: 'Mild dizziness',
  palpitations: 'Racing or irregular heartbeat', congestion: 'Congestion / cough', muscle_pain: 'Muscle or joint pain', rash: 'Skin rash or irritation',
};
export const CLINICAL_REFERENCE_SOURCES = [
  'AHA/ACC 2025 adult blood pressure categories: https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings',
  'MedlinePlus adult resting vital signs: https://medlineplus.gov/ency/article/002341.htm',
  'FDA pulse oximeter basics: https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics',
];
export const ASSESSMENT_VERSION = 'aethra-hybrid-0.3 (general adult references + NASA OSD lab intervals; research prototype)';
export const ALL_SYMPTOMS = { ...RED_SYMPTOMS, ...AMBER_SYMPTOMS };
