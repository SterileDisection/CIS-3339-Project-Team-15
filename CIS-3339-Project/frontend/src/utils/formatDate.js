// MIGRATION: shared helper pulled out during the Composition API migration.
// The same formatDate() method used to be copy-pasted into the methods block of
// home.vue, findevents.vue, clientdetails.vue and servicedetails.vue.
// With <script setup> each view imports this one function instead.

// Formats an ISO date string as MM/DD/YYYY (uses UTC so the day doesn't shift by time zone)
export function formatDate(date) {
  const isoDate = new Date(date)
  const year = isoDate.getUTCFullYear()
  const month = String(isoDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(isoDate.getUTCDate()).padStart(2, '0')
  return `${month}/${day}/${year}`
}
