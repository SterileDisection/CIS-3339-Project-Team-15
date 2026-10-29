<!-- This is the login view. Users can login by entering a correct username and password -->
<template>
  <div>
    <!--Header-->
    <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">Welcome</h1>
      <!--Form-->
      <form @submit.prevent="store.login(username, password)" novalidate="true">
        <div class="flex justify-center mt-10">
          <label>
            <span class="text-gray-700">Username</span>
            <span style="color: #ff0000">*</span>
            <input type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              placeholder v-model="username" />
          </label>
        </div>
        <div class="flex justify-center mt-10">
          <label>
            <span class="text-gray-700">Password</span>
            <span style="color: #ff0000">*</span>
            <input type="password"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              placeholder v-model="password" />
          </label>
        </div>
        <!--Login button-->
        <div class="flex justify-center mt-10">
          <button class="bg-red-700 text-white rounded" type="submit">Login</button>
        </div>
      </form>
    </div>
</template>

<script setup>
// MIGRATION: Options API -> Composition API (<script setup>)
// - data() { username, password } -> ref()
// - setup() { store }             -> top-level const used directly by the template
// The template still calls store.login(username, password). Refs are unwrapped
// automatically in the template, so the store gets plain strings like before.
import { ref } from 'vue'
import { useLoggedInUserStore } from '../store/loggedInUser'

// was: setup() { const store = useLoggedInUserStore(); return { store } }
const store = useLoggedInUserStore()

// was: data() { return { username: "", password: "" } }
const username = ref('')
const password = ref('')
</script>

