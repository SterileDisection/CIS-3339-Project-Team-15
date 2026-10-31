// F2: shared async-state composable
// Usage: const { data, loading, error, execute } = useApi(() => getClients())
//
// - data:    the result of the last successful call, null until then
// - loading: true while a request is in flight
// - error:   a short readable string when the call failed, null otherwise
// - execute: runs the call (on mount, after a search, or from a Retry button).
//            Any arguments passed to execute() are handed to the api call.
//
// The api layer's interceptor already turns every failure into one message string,
// so this composable never has to work out what went wrong itself.
import { ref } from 'vue'

export function useApi(apiCall) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function execute(...args) {
    loading.value = true
    error.value = null
    try {
      data.value = await apiCall(...args)
      return data.value
    } catch (err) {
      // the interceptor rejects with a string; anything else is a bug in our own code
      error.value = typeof err === 'string' ? err : err?.message || 'Something went wrong'
      return null
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
