<!-- This view displays a list of events. Users can search for events, and click on an event to be redirected to another component to view that event's details -->
<template>
  <main>
    <div>
      <!--Header-->
      <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
        List of Events
      </h1>
    </div>
    <div class="px-10 pt-20">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <h2 class="text-2xl font-bold">Search Event By</h2>
        <!-- Displays Event Name or Event Date selection -->
        <div class="flex flex-col">
          <select
            class="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            v-model="searchBy">
            <option value="Event Name">Event Name</option>
            <option value="Event Date">Event Date</option>
          </select>
        </div>
        <!--Displays event name search field-->
        <div class="flex flex-col" v-if="searchBy === 'Event Name'">
          <label class="block">
            <input type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              v-model="name" v-on:keyup.enter="handleSubmitForm" placeholder="Enter event name" />
          </label>
        </div>
        <!-- Displays event date search field -->
        <div class="flex flex-col" v-if="searchBy === 'Event Date'">
          <input
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            type="date" v-model="eventDate" v-on:keyup.enter="handleSubmitForm" />
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div></div>
        <div></div>
        <!--Clear Search button-->
        <div class="mt-5 grid-cols-2">
          <button class="mr-10 border border-red-700 bg-white text-red-700 rounded" @click="loadData" type="submit">
            Clear Search
          </button>
          <!--Search Event button-->
          <button class="bg-red-700 text-white rounded" @click="handleSubmitForm" type="submit">
            Search Event
          </button>
        </div>
      </div>
    </div>

    <hr class="mt-10 mb-10" />
    <!-- Display Found Data -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
      <!--Table showing List of Events-->
      <div class="ml-10">
        <h2 class="text-2xl font-bold">List of Events</h2>
        <h3 class="italic">Click table row to view event details</h3>
      </div>
      <div class="flex flex-col col-span-2">
        <!-- F2: loading state, shown while the request is in flight -->
        <p v-if="loading" class="p-6 text-xl text-center text-gray-500 animate-pulse">Loading events...</p>
        <!-- F2: error state with the interceptor's message and a Retry button -->
        <div v-else-if="error" class="p-6 bg-red-50 rounded shadow-md" role="alert">
          <p class="font-bold text-red-900">Could not load events: {{ error }}</p>
          <button type="button" class="mt-3 bg-red-700 text-white rounded" @click="retry">Retry</button>
        </div>
        <table v-else class="min-w-full shadow-md rounded">
          <thead class="bg-gray-50 text-xl">
            <tr>
              <th class="p-4 text-left">Event Name</th>
              <th class="p-4 text-left">Event Date</th>
              <th class="p-4 text-left">Event Address</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-300">
            <tr @click="router.push({name: 'eventdetails', params: { id: event._id } })"
              v-for="event in events" :key="event._id" class="cursor-pointer"
              :class="{ 'hoverRow': hoverId === event._id }" @mouseenter="hoverId = event._id"
              @mouseleave="hoverId = null">
              <td class="p-2 text-left">{{ event.name }}</td>
              <td class="p-2 text-left">{{ formatDate(event.date) }}</td>
              <td class="p-2 text-left">{{ event.address.line1 }}</td>
            </tr>
            <!-- F2: empty-results message -->
            <tr v-if="!events?.length">
              <td colspan="3" class="p-4 text-center italic text-gray-500">No events found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script setup>
// MIGRATION: Options API -> Composition API (<script setup>)
// - data() { events, searchBy, name, eventDate, hoverId } -> ref()
// - mounted()            -> the load call now runs directly in setup (see the F2 note below)
// - methods.loadData / handleSubmitForm -> plain functions
// - methods.formatDate   -> imported from utils/formatDate.js (was copy-pasted in 4 views)
// - this.isLoading       -> REMOVED, it was set but never declared or used in the template
// - template $router.push(...) -> router.push(...) from useRouter()
// F2: loading the list now goes through the shared useApi() composable, so the view gets
//     loading / error / data for free, shows a Retry button on failure, and no longer has its
//     own try/catch + toast for errors (the api interceptor builds the message)
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getEvents, searchEvents } from '../api/api'
import { useApi } from '../composables/useApi'
import { formatDate } from '../utils/formatDate'

// was: $router in the template
const router = useRouter()

// F2: one useApi() call drives the whole list.
// execute() with no query loads everything; execute(query) runs a search.
const {
  data: events,
  loading,
  error,
  execute
} = useApi((query) => (query ? searchEvents(query) : getEvents()))

// Parameters for search to occur
const searchBy = ref(null)
const name = ref(null)
const eventDate = ref(null)
// variable stores the ID of the row that the mouse is currently hovering over (to highlight the row red)
const hoverId = ref(null)

// F2: remember the last request so Retry repeats exactly that (the full list or the same search)
let lastQuery = null
function runQuery(query = null) {
  lastQuery = query
  return execute(query)
}
function retry() {
  execute(lastQuery)
}

// was: methods.loadData()
// loads the full list; also used by the Clear Search button
function loadData() {
  // Resets variables used for search
  searchBy.value = null
  name.value = null
  eventDate.value = null
  runQuery()
}

// was: methods.handleSubmitForm()
// called when user searches for an event
function handleSubmitForm() {
  // if user searches by event name
  if (searchBy.value === 'Event Name') {
    if (name.value) {
      runQuery({
        searchBy: 'name',
        name: name.value
      })
    }
    // if user searches by event date
  } else if (searchBy.value === 'Event Date') {
    if (eventDate.value) {
      const date = new Date(eventDate.value)
      runQuery({
        searchBy: 'date',
        eventDate: date.toISOString().substring(0, 10)
      })
    }
  }
}

// was: mounted() { this.loadData() }
// F2: load right away in setup (before the first render) so the page shows "Loading..."
// immediately instead of flashing the empty message for a moment
loadData()
</script>
