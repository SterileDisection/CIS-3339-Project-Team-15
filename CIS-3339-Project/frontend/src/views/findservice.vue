<!-- This view shows a list of services. Users can search for services and click on a service to be redirected to another component that displays the service's details -->
<template>
  <main>
    <div>
      <!--Header-->
      <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
        Find Services
      </h1>
    </div>
    <div class="px-10 pt-20">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <h2 class="text-2xl font-bold">Search Service By</h2>
        <!-- Displays Service Name and Description selection -->
        <div class="flex flex-col">
          <select
            class="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            v-model="searchBy">
            <option value="Service Name">Service Name</option>
            <option value="Service Description">Service Description</option>
          </select>
        </div>
        <!--Display service name search field-->
        <div class="flex flex-col" v-if="searchBy === 'Service Name'">
          <label class="block">
            <input type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              v-model="name" v-on:keyup.enter="handleSubmitForm" placeholder="Enter service name" />
          </label>
        </div>
        <!--Display service description search field-->
        <div class="flex flex-col" v-if="searchBy === 'Service Description'">
          <label class="block">
            <input type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              v-model="description" v-on:keyup.enter="handleSubmitForm" placeholder="Enter service description" />
          </label>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div></div>
        <div></div>
        <div class="mt-5 grid-cols-2">
          <!--Clear Search button-->
          <button class="mr-10 border border-red-700 bg-white text-red-700 rounded" @click="loadData" type="submit">
            Clear Search
          </button>
          <!--Search Service button-->
          <button class="bg-red-700 text-white rounded" @click="handleSubmitForm" type="submit">
            Search Service
          </button>
        </div>
      </div>
    </div>

    <hr class="mt-10 mb-10" />
    <!-- Display Found Data -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
      <!--List of Services table-->
      <div class="ml-10">
        <h2 class="text-2xl font-bold">List of Services</h2>
        <h3 class="italic">Click table row to view service details</h3>
      </div>
      <div class="flex flex-col col-span-2">
        <!-- F2: loading state, shown while the request is in flight -->
        <p v-if="loading" class="p-6 text-xl text-center text-gray-500 animate-pulse">Loading services...</p>
        <!-- F2: error state with the interceptor's message and a Retry button -->
        <div v-else-if="error" class="p-6 bg-red-50 rounded shadow-md" role="alert">
          <p class="font-bold text-red-900">Could not load services: {{ error }}</p>
          <button type="button" class="mt-3 bg-red-700 text-white rounded" @click="retry">Retry</button>
        </div>
        <!-- F3: shared DataTable (sorting, 10 rows per page, "Showing X-Y of Z", empty message) -->
        <DataTable v-else :columns="columns" :rows="services || []" empty-text="No services found"
          @row-click="openDetails" />
      </div>
    </div>
  </main>
</template>

<script setup>
// MIGRATION: Options API -> Composition API (<script setup>)
// - data() { services, searchBy, name, description, hoverId } -> ref()
// - mounted()          -> the load call now runs directly in setup (see the F2 note below)
// - methods.loadData / handleSubmitForm -> plain functions
// - template $router.push(...) -> router.push(...) from useRouter()
// F2: loading the list now goes through the shared useApi() composable, so the view gets
//     loading / error / data for free, shows a Retry button on failure, and no longer has its
//     own try/catch + toast for errors (the api interceptor builds the message)
// F3: the hand-written <table> was replaced by the shared DataTable component (sorting + paging)
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getServices, searchServices } from '../api/api'
import { useApi } from '../composables/useApi'
import DataTable from '../components/DataTable.vue'

// was: $router in the template
const router = useRouter()

// F2: one useApi() call drives the whole list.
// execute() with no query loads everything; execute(query) runs a search.
const {
  data: services,
  loading,
  error,
  execute
} = useApi((query) => (query ? searchServices(query) : getServices()))

// Parameters for search to occur
const searchBy = ref(null)
const name = ref(null)
const description = ref(null)
// F3: columns for the shared DataTable
const columns = [
  { label: 'Service Name', field: 'name', style: 'width: 25%;' },
  { label: 'Service Description', field: 'description', style: 'width: 75%;', cellClass: 'text-sm' }
]

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
  // Resets all the variables
  searchBy.value = ''
  name.value = ''
  description.value = ''
  runQuery()
}

// was: methods.handleSubmitForm()
// called when user searches for a service
function handleSubmitForm() {
  // if user searches by service name
  if (searchBy.value === 'Service Name') {
    if (name.value) {
      runQuery({
        searchBy: 'name',
        name: name.value
      })
    }
    // if user searches by service description
  } else if (searchBy.value === 'Service Description') {
    if (description.value) {
      runQuery({
        searchBy: 'description',
        description: description.value
      })
    }
  }
}

// F3: DataTable emits row-click (mouse click or Enter key) with the clicked record
function openDetails(row) {
  router.push({ name: 'servicedetails', params: { id: row._id } })
}

// was: mounted() { this.loadData() }
// F2: load right away in setup (before the first render) so the page shows "Loading..."
// immediately instead of flashing the empty message for a moment
loadData()
</script>
