<!-- This view allows a user to update a specific service's information. -->
<template>
  <main>
    <!--Header-->
    <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
      Service Details
    </h1>
    <div class="px-10 py-20">
        <!-- grid container -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
          <h2 class="text-2xl font-bold">Service Details</h2>
          <!-- Service Name input field -->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Service Name</span>
              <span style="color: #ff0000">*</span>
              <input type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                v-model="service.name" />
            </label>
            <span v-if="v$.service.name.$error" class="text-red-500">
              Service Name is required
            </span>
          </div>

          <!-- Description input field -->
          <div class="flex flex-col">
            <label>
              <span class="text-gray-700">Description:</span>
              <textarea
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                v-model="service.description"></textarea>
            </label>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
          <div></div>
          <!-- form field: update service description -->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Service Status</span>
              <span style="color: #ff0000">*</span>
              <div class="mt-1">
                <label class="inline-flex items-center">
                  <input type="radio" class="form-radio" value="Active" v-model="service.status">
                  <span class="ml-2">Active</span>
                </label>
                <label class="inline-flex items-center ml-6">
                  <input type="radio" class="form-radio" value="Inactive" v-model="service.status">
                  <span class="ml-2">Inactive</span>
                </label>
              </div>
            </label>
          </div>
        </div>

        <!-- grid container -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
          <div></div>
          <!-- Update Service button -->
          <div class="flex justify-between mt-10 mr-20">
            <div class="flex justify-between mt-10 mr-25">
              <button @click="submitServiceUpdate" type="submit" class="bg-green-700 disabled:opacity-50 text-white rounded"
                :disabled="user.role === 'viewer'">
                Update Service
              </button>
            </div>
          </div>
          <!--Delete Service button-->
          <div class="flex justify-between mt-20 mr-20">
            <button @click="submitDeleteService" type="submit" class="bg-red-700 disabled:opacity-50 text-white rounded"
              :disabled="user.role === 'viewer'">
              Delete Service
            </button>
          </div>
          <!--Go back button-->
          <div class="flex justify-between mt-20 mr-20">
            <button type="reset" class="border border-red-700 bg-white text-red-700 rounded" @click="router.back()">
              Go back
            </button>
          </div>
        </div>
    </div>

    <hr class="mt-10 mb-10" />
    <!-- Display Found Data -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
      <!--List of Events table-->
      <div class="ml-10">
        <h2 class="text-2xl font-bold">List of Events</h2>
        <h3 class="italic">Click table row to view event details</h3>
      </div>
      <div class="flex flex-col col-span-2">
        <table class="min-w-full shadow-md rounded">
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
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script setup>
// Sprint 2 migration owner: Quoc Pham
// MIGRATION: Options API -> Composition API (<script setup>)
// - data() { service, events, hoverId } -> ref()
// - setup() + validations() -> useVuelidate(rules, { service }) with state passed explicitly
// - mounted()             -> onMounted()
// - methods.*             -> plain functions
// - methods.formatDate    -> imported from utils/formatDate.js
// - this.$route / this.$router (and $router in the template) -> useRoute() / useRouter()
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import useVuelidate from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { useLoggedInUserStore } from '../store/loggedInUser'
import { getServiceById, getEventsByServiceId, updateService, deleteService } from '../api/api'
import { formatDate } from '../utils/formatDate'
import { useApi } from '../composables/useApi'
import { useToast } from 'vue-toastification'

// Notifications
const toast = useToast()
// was: this.$route and this.$router
const route = useRoute()
const router = useRouter()
// was: setup() { const user = useLoggedInUserStore() ... }
const user = useLoggedInUserStore()

// was: data() { return { ... } }
// service information
const service = ref({
  name: null,
  description: null,
  status: null
})
// all events that host the service
const events = ref([])
// variable stores the ID of the row that the mouse is currently hovering over (to highlight the row red)
const hoverId = ref(null)

// was: validations() { return { service: { name: { required } } } }
const rules = {
  service: {
    name: { required }
  }
}

// was: setup() { const v$ = useVuelidate(); ... }
const v$ = useVuelidate(rules, { service })

// F2: every API call in this view goes through useApi(), so there is no try/catch here.
// error.value is the readable message the api interceptor already built. This also fixes
// toast.error('error updating service', error), which passed the real message as toast
// OPTIONS and threw it away.
const { error: loadError, execute: loadService } = useApi((id) =>
  Promise.all([getServiceById(id), getEventsByServiceId(id)])
)
const { error: updateError, execute: saveService } = useApi(updateService)
const { error: deleteError, execute: removeService } = useApi(deleteService)

// was: async mounted() { ... }
// when component is mounted, load the service and the events that use it
onMounted(async () => {
  const result = await loadService(route.params.id)
  if (loadError.value) return toast.error(loadError.value)
  ;[service.value, events.value] = result
})

// was: methods.submitServiceUpdate()
// called when user attempts to update the service
async function submitServiceUpdate() {
  // Trigger validation (was: this.v$.$validate(); if (this.v$.$error) return)
  const isValid = await v$.value.$validate()
  if (!isValid) {
    // Form is invalid, do not proceed
    return
  }

  const response = await saveService(route.params.id, service.value)
  if (updateError.value) return toast.error(updateError.value)
  router.push('/findservice')
  toast.success(response)
}

// was: methods.submitDeleteService()
// deletes the service - can only be deleted if no event uses it
async function submitDeleteService() {
  if (events.value.length !== 0) {
    toast.info('Service can not be deleted since it is being used by events.')
    return
  }
  const response = await removeService(route.params.id)
  if (deleteError.value) return toast.error(deleteError.value)
  toast.success(response)
  router.push('/findservice')
}
</script>