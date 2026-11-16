// Internal resource budgets; text lengths use JavaScript UTF-16 code units.
export const LIMITS = Object.freeze({
  personalText: 1024,
  customLabel: 128,
  instructions: 8192,
  customFields: 64,
  environments: 64,
  profileName: 255,
  fieldIdentifier: 64,
  recordEntries: 69, // Five built-ins plus the maximum custom fields.
})
