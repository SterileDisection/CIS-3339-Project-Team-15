<!-- This is the home view - which shows a dashboard -->
<template>
  <main>
    <div>
      <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
        Dashboard
      </h1>
      <br />
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div class="ml-10"></div>
        <div class="flex flex-col col-span-2">
          <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
            Events Attendance
          </h1>

          <!-- F2: loading state (was hidden behind the "has events" check, so it never showed) -->
          <p v-if="attendanceLoading" class="mt-10 text-2xl font-bold text-center text-gray-500 animate-pulse">
            Loading...
          </p>
          <!-- F2: error state with Retry (before, a failed request just looked like "No events found.") -->
          <div v-else-if="attendanceError" class="mt-10 p-6 bg-red-50 rounded shadow-md" role="alert">
            <p class="font-bold text-red-900">Could not load attendance: {{ attendanceError }}</p>
            <button type="button" class="mt-3 bg-red-700 text-white rounded" @click="loadAttendance()">Retry</button>
          </div>
          <!-- F2: empty state -->
          <div v-else-if="!recentEvents.length" class="flex justify-center mt-10">No events found.</div>
          <template v-else>
            <table class="min-w-full shadow-md rounded">
              <thead class="bg-gray-50 text-xl">
                <tr class="p-4 text-left">
                  <th class="p-4 text-left">Event Name</th>
                  <th class="p-4 text-left">Event Date</th>
                  <th class="p-4 text-left">Number of Attendees</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-300">
                <tr @click="editEvent(event._id)" v-for="event in recentEvents" :key="event._id" class="cursor-pointer">
                  <td class="p-2 text-left">{{ event.name }}</td>
                  <td class="p-2 text-left">{{ formatDate(event.date) }}</td>
                  <td class="p-2 text-left">{{ event.attendees.length }}</td>
                </tr>
              </tbody>
            </table>
            <AttendanceChart :label="labels" :chart-data="chartData"></AttendanceChart>
          </template>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div class="ml-10"></div>
        <div class="flex flex-col col-span-2">
          <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
            Clients by Zip Code
          </h1>

          <!-- F2: loading / error / empty states for the zip code section -->
          <p v-if="zipLoading" class="mt-10 text-2xl font-bold text-center text-gray-500 animate-pulse">
            Loading...
          </p>
          <div v-else-if="zipError" class="mt-10 p-6 bg-red-50 rounded shadow-md" role="alert">
            <p class="font-bold text-red-900">Could not load clients by zip code: {{ zipError }}</p>
            <button type="button" class="mt-3 bg-red-700 text-white rounded" @click="loadZips()">Retry</button>
          </div>
          <div v-else-if="!zips.length" class="flex justify-center mt-10">No clients found.</div>
          <template v-else>
            <table class="min-w-full shadow-md rounded">
              <thead class="bg-gray-50 text-xl">
                <tr class="p-4 text-left">
                  <th class="p-4 text-left">Zip Number</th>
                  <th class="p-4 text-left">Client Count</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-300">
                <tr v-for="zip in zips" :key="zip._id">
                  <td class="p-2 text-left">{{ zip._id }}</td>
                  <td class="p-2 text-left">{{ zip.count }}</td>
                </tr>
              </tbody>
            </table>
            <div class="flex justify-center mt-10">
              <ZipChart :label="zipLabels" :chart-data="zipChartData"></ZipChart>
            </div>
          </template>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
// MIGRATION: Options API -> Composition API (<script setup>)
// - components: { AttendanceChart, ZipChart } -> imports are registered automatically
// - data() { recentEvents, zips, labels, ... } -> ref() / computed()
// - mounted()            -> the load call now runs directly in setup (see the F2 note below)
// - methods.formatDate   -> imported from utils/formatDate.js
// - NEW editEvent()      -> the table rows already called editEvent(event._id) but the
//                           method never existed, so clicking a row threw an error.
//                           It now opens that event's details page.
// F2: both dashboard requests now go through the shared useApi() composable.
//     - removed the two hand-written loading/error/try-catch blocks (getAttendanceData, getZipData)
//       and the error-type checks; the api interceptor builds one readable message instead
//     - labels and chart data are computed() from the loaded data instead of being copied by hand
//     - fixed the render race: loading starts true as soon as the request starts, and the
//       loading/error/empty/data states are separate v-if branches, so a failed request now shows
//       an error with a Retry button instead of "No events found."
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AttendanceChart from '../components/barChart.vue'
import ZipChart from '../components/donutZipChart.vue'
import { getAttendance, getClientsByZipCode } from '../api/api'
import { formatDate } from '../utils/formatDate'
import { useApi } from '../composables/useApi'

const router = useRouter()

// F2: events from the last two months (table + bar chart)
const {
  data: attendance,
  loading: attendanceLoading,
  error: attendanceError,
  execute: loadAttendance
} = useApi(getAttendance)

// F2: client counts per zip code (table + donut chart)
const {
  data: zipData,
  loading: zipLoading,
  error: zipError,
  execute: loadZips
} = useApi(getClientsByZipCode)

// was: data() recentEvents / labels / chartData, filled in by hand inside getAttendanceData()
const recentEvents = computed(() => attendance.value || [])
const labels = computed(() => recentEvents.value.map((item) => `${item.name} (${formatDate(item.date)})`))
const chartData = computed(() => recentEvents.value.map((item) => item.attendees.length))

// was: data() zips / zipLabels / zipChartData, filled in by hand inside getZipData()
const zips = computed(() => zipData.value || [])
const zipLabels = computed(() => zips.value.map((item) => item._id))
const zipChartData = computed(() => zips.value.map((item) => item.count))

// the attendance rows call this when clicked
function editEvent(eventId) {
  router.push({ name: 'eventdetails', params: { id: eventId } })
}

// was: mounted() { this.getAttendanceData(); this.getZipData() }
// F2: start both requests right away in setup (before the first render) so the page shows
// "Loading..." immediately instead of flashing "No events found." for a moment
loadAttendance()
loadZips()
</script>
