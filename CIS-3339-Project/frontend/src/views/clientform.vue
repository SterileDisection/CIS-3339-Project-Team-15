<!-- This view allows a user to create client information. -->
<template>
  <main>
    <!--Header-->
    <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
      Client Intake Form
    </h1>
    <div class="px-10 py-20">
      <!-- form field -->
      <!-- @submit.prevent stops the submit event from reloading the page-->
      <form @submit.prevent="submitForm">
        <!-- grid container -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
          <h2 class="text-2xl font-bold">Personal Details</h2>
          <!--First Name Input Field-->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">First Name</span>
              <span style="color: #ff0000">*</span>
              <input type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                v-model="client.firstName" />
            </label>
            <!-- Validation error messages -->
            <span v-if="v$.client.firstName.$error" class="text-red-500">
              First Name is required
            </span>
          </div>

          <!--Middle Name Input Field-->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Middle Name</span>
              <input type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder v-model="client.middleName" />
            </label>
          </div>

          <!--Last Name Input Field-->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Last Name</span>
              <span style="color: #ff0000">*</span>
              <input type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder v-model="client.lastName" />
            </label>
            <!-- Validation error messages -->
            <span v-if="v$.client.lastName.$error" class="text-red-500">
              Last Name is required
            </span>
          </div>

          <div></div>
          <!--Email Input Field-->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Email</span>
              <span style="color: #ff0000">*</span>
              <input type="email"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                v-model="client.email" />
            </label>
            <!-- Validation error messages -->
            <span v-if="v$.client.email.$error" class="text-red-500">
              Valid Email is required
            </span>
          </div>
          <!-- Phone Number Input Field -->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Phone Number</span>
              <span style="color: #ff0000">*</span>
              <input type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                pattern="[0-9]{3}[0-9]{3}[0-9]{4}" v-model="client.phoneNumber.primary" />
            </label>
            <!-- Validation error messages -->
            <span v-if="v$.client.phoneNumber.primary.$error" class="text-red-500">
              <span v-if="v$.client.phoneNumber.primary.required.$invalid">
                Phone Number is required
              </span>
              <span
                v-else-if="!v$.client.phoneNumber.primary.required.$invalid && v$.client.phoneNumber.primary.numeric.$invalid">
                Phone Number must contain only digits
              </span>
              <span
                v-else-if="!v$.client.phoneNumber.primary.required.$invalid && !v$.client.phoneNumber.primary.numeric.$invalid && (v$.client.phoneNumber.primary.minLength.$invalid || v$.client.phoneNumber.primary.maxLength.$invalid)">
                Phone Number must be exactly 10 digits
              </span>
            </span>
          </div>

          <!-- Alternative Phone Number Input Field -->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Alternative Phone Number</span>
              <input type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                pattern="[0-9]{3}[0-9]{3}[0-9]{4}" v-model="client.phoneNumber.alternate" />
            </label>
          </div>
        </div>

        <!-- grid container -->
        <div class="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
          <h2 class="text-2xl font-bold">Address Details</h2>
          <!-- Address 1 Input Field -->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Address Line 1</span>
              <input type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                v-model="client.address.line1" />
            </label>
          </div>

          <!-- Address 2 Input Field -->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Address Line 2</span>
              <input type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                v-model="client.address.line2" />
            </label>
          </div>

          <!-- City Input Field -->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">City</span>
              <span style="color: #ff0000">*</span>
              <input type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                v-model="client.address.city" />
            </label>
            <!-- Validation error messages -->
            <span v-if="v$.client.address.city.$error" class="text-red-500">
              City is required
            </span>
          </div>
          <div></div>

          <!-- County Input Field -->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">County</span>
              <input type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                v-model="client.address.county" />
            </label>
          </div>

          <!-- Zip Code Input Field -->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Zip Code</span>
              <input type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                v-model="client.address.zip" />
            </label>
          </div>
          <div></div>

          <!-- Add Client Submit Button -->
          <div class="flex justify-between mt-10 mr-20">
            <button class="bg-red-700 text-white rounded" type="submit">
              Add Client
            </button>
          </div>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup>
// MIGRATION: Options API -> Composition API (<script setup>)
// - data() { client }       -> ref()
// - setup() + validations() -> useVuelidate(rules, { client }) with state passed explicitly
// - methods.submitForm      -> plain function
// - this.$router            -> useRouter()
import { ref } from 'vue'
import { useRouter } from 'vue-router'
//import functionalities for validation
import useVuelidate from '@vuelidate/core'
import { required, email, numeric, minLength, maxLength } from '@vuelidate/validators'
import { createClient } from '../api/api'
import { useApi } from '../composables/useApi'
import { useToast } from 'vue-toastification'

// Notifications
const toast = useToast()
// was: this.$router
const router = useRouter()

// was: data() { return { client: {...} } }
// client variable to hold new client information
const client = ref({
  firstName: null,
  middleName: null,
  lastName: null,
  email: null,
  phoneNumber: {
    primary: null,
    alternate: null
  },
  address: {
    line1: null,
    line2: null,
    city: null,
    county: null,
    zip: null
  }
})

// was: validations() { return { client: {...} } }
const rules = {
  client: {
    firstName: { required },
    lastName: { required },
    email: { required, email },
    phoneNumber: {
      primary: {
        required,
        numeric,
        minLength: minLength(10),
        maxLength: maxLength(10)
      }
    },
    address: {
      city: { required }
    }
  }
}

// was: setup() { const v$ = useVuelidate(); return { v$ } }
const v$ = useVuelidate(rules, { client })

// F2: the create call goes through useApi(), so there is no try/catch here; error.value is the
// readable message the api interceptor already built
const { error: createError, execute: saveClient } = useApi(createClient)

// was: methods.submitForm()
// called when user submits the form
async function submitForm() {
  // Trigger validation (was: this.v$.$validate(); if (this.v$.$error) return)
  const isValid = await v$.value.$validate()
  if (!isValid) {
    // Form is invalid, do not proceed
    return
  }

  const response = await saveClient(client.value)
  if (createError.value) return toast.error(createError.value)
  router.push('/findclient')
  toast.success(response)
}
</script>


