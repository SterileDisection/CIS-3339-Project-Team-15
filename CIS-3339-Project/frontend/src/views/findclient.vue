<!-- This view displays a list of clients. The user can search for clients, and click on a client to redirect to another component to view that client's information -->
<template>
  <main>
    <div>
      <!--Header-->
      <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
        Find Client
      </h1>
    </div>
    <div class="px-10 pt-20">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <!--Search Client By selection-->
        <h2 class="text-2xl font-bold">Search Client By</h2>
        <!-- Displays Client Name search field -->
        <div class="flex flex-col">
          <select
            class="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            v-model="searchBy">
            <option value="Client Name">Client Name</option>
            <option value="Client Number">Client Number</option>
          </select>
        </div>
        <!--Input box for searching by Client First Name-->
        <div class="flex flex-col" v-if="searchBy === 'Client Name'">
          <label class="block">
            <input type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              v-model="firstName" v-on:keyup.enter="handleSubmitForm" placeholder="Enter first name" />
          </label>
        </div>
        <!--Input box for searching by Client Last Name-->
        <div class="flex flex-col" v-if="searchBy === 'Client Name'">
          <label class="block">
            <input type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              v-model="lastName" v-on:keyup.enter="handleSubmitForm" placeholder="Enter last name" />
          </label>
        </div>
        <!-- Displays Client Number search field -->
        <div class="flex flex-col" v-if="searchBy === 'Client Number'">
          <input
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            type="text" v-model="phoneNumber" v-on:keyup.enter="handleSubmitForm"
            placeholder="Enter Client Phone Number" />
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
          <!--Search Client button-->
          <button class="bg-red-700 text-white rounded" @click="handleSubmitForm" type="submit">
            Search Client
          </button>
        </div>
      </div>
    </div>

    <hr class="mt-10 mb-10" />
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
      <div class="ml-10">
        <h2 class="text-2xl font-bold">List of Clients</h2>
        <h3 class="italic">Click table row to view client details</h3>
      </div>
      <!--Table showing list of Clients-->
      <div class="flex flex-col col-span-2">
        <!-- F2: loading state, shown while the request is in flight -->
        <p v-if="loading" class="p-6 text-xl text-center text-gray-500 animate-pulse">Loading clients...</p>
        <!-- F2: error state with the interceptor's message and a Retry button -->
        <div v-else-if="error" class="p-6 bg-red-50 rounded shadow-md" role="alert">
          <p class="font-bold text-red-900">Could not load clients: {{ error }}</p>
          <button type="button" class="mt-3 bg-red-700 text-white rounded" @click="retry">Retry</button>
        </div>
        <table v-else class="min-w-full shadow-md rounded">
          <thead class="bg-gray-50 text-xl">
            <tr>
              <th class="p-4 text-left">Name</th>
              <th class="p-4 text-left">Phone number</th>
              <th class="p-4 text-left">City</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-300">
            <tr @click="router.push({ name: 'clientdetails', params: { id: client._id } })" v-for="client in clients"
              :key="client._id" class="cursor-pointer" :class="{ 'hoverRow': hoverId === client._id }"
              @mouseenter="hoverId = client._id" @mouseleave="hoverId = null">
              <td class="p-2 text-left">
                {{ client.firstName + ' ' + client.lastName }}
              </td>
              <td class="p-2 text-left">
                {{ client.phoneNumber.primary }}
              </td>
              <td class="p-2 text-left">{{ client.address.city }}</td>
            </tr>
            <!-- F2: empty-results message -->
            <tr v-if="!clients?.length">
              <td colspan="3" class="p-4 text-center italic text-gray-500">No clients found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script setup>
// MIGRATION: Options API -> Composition API (<script setup>)
// - data() { clients, searchBy, firstName, lastName, phoneNumber, hoverId } -> ref()
// - mounted()          -> the load call now runs directly in setup (see the F2 note below)
// - methods.loadData / handleSubmitForm -> plain functions
// - template $router.push(...) -> router.push(...) from useRouter()
// F2: loading the list now goes through the shared useApi() composable, so the view gets
//     loading / error / data for free, shows a Retry button on failure, and no longer has its
//     own try/catch + toast for errors (the api interceptor builds the message)
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getClients, searchClients } from '../api/api'
import { useApi } from '../composables/useApi'

// was: $router in the template
const router = useRouter()

// F2: one useApi() call drives the whole list.
// execute() with no query loads everything; execute(query) runs a search.
const {
  data: clients,
  loading,
  error,
  execute
} = useApi((query) => (query ? searchClients(query) : getClients()))

// Parameters for search to occur
const searchBy = ref('')
const firstName = ref('')
const lastName = ref('')
const phoneNumber = ref('')
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
  // Resets all the variables
  searchBy.value = ''
  firstName.value = ''
  lastName.value = ''
  phoneNumber.value = ''
  runQuery()
}

// was: methods.handleSubmitForm()
// called when user searches for clients
function handleSubmitForm() {
  // if user searched by client name
  if (searchBy.value === 'Client Name') {
    if (firstName.value || lastName.value) {
      runQuery({
        searchBy: 'name',
        firstName: firstName.value,
        lastName: lastName.value
      })
    }
    // if user searches by client phone number
  } else if (searchBy.value === 'Client Number') {
    if (phoneNumber.value) {
      runQuery({
        searchBy: 'number',
        phoneNumber: phoneNumber.value
      })
    }
  }
}

// was: mounted() { this.loadData() }
// F2: load right away in setup (before the first render) so the page shows "Loading..."
// immediately instead of flashing the empty message for a moment
loadData()
</script>