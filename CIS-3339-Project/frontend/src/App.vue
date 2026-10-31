<!-- This is the main frontend file. It displays a navigation bar and rendered components. -->

<template>
  <main class="flex flex-row">
    <div id="_container" class="min-h-screen">
      <header class="w-full">
        <section class="text-center">
          <!-- MIGRATION fix: forward slashes so the logo resolves on Mac/Linux too, plus alt text -->
          <img class="m-auto" src="@/assets/DanPersona.svg" alt="Data Platform logo" />
        </section>
        <!--Navigation bar-->
        <nav class="mt-10">
          <ul class="flex flex-col gap-4">
            <!-- Dashboard link -->
            <li>
              <router-link to="/">
                <span style="position: relative; top: 6px" class="material-icons">dashboard</span>
                Dashboard
              </router-link>
            </li>
            <!--Login link - Link only shows is user is logged out-->
            <li v-if="!user.isLoggedIn">
              <router-link to="/login">
                <span style="position:relative; top: 6px" class="material-icons">login</span>
                Login
              </router-link>
            </li>
            <!--Logout link - Link only shows is user is logged in-->
            <li v-if="user.isLoggedIn" @click.prevent="user.logout" style="cursor: pointer;">
              <span style="position:relative; top: 6px" class="material-icons">logout</span>
              Logout
            </li>
            <!--Client Intake Form link - only shows if user is an editor-->
            <li v-if="user.isEditor">
              <router-link to="/clientform">
                <span style="position: relative; top: 6px" class="material-icons">people</span>
                Client Intake Form
              </router-link>
            </li>
            <!--Create Event link - only shows if user is an editor-->
            <li v-if="user.isEditor">
              <router-link to="/eventform">
                <span style="position: relative; top: 6px" class="material-icons">event</span>
                Create Event
              </router-link>
            </li>
            <!--Create Service link - only shows if user is an editor-->
            <li v-if="user.isEditor">
              <router-link to="/serviceform">
                <span style="position: relative; top: 6px" class="material-icons">volunteer_activism</span>
                Create Service
              </router-link>
            </li>
            <!--Find Client link - only shows if user is logged in-->
            <li v-if="user.isLoggedIn">
              <router-link to="/findclient">
                <span style="position: relative; top: 6px" class="material-icons">search</span>
                Find Client
              </router-link>
            </li>
            <!--Find Event link - only shows if user is logged in-->
            <li v-if="user.isLoggedIn">
              <router-link to="/findevents">
                <span style="position: relative; top: 6px" class="material-icons">search</span>
                Find Event
              </router-link>
            </li>
            <!--Find Service link - only shows if user is logged in-->
            <li v-if="user.isLoggedIn">
              <router-link to="/findservice">
                <span style="position: relative; top: 6px" class="material-icons">search</span>
                Find Service
              </router-link>
            </li>
          </ul>
        </nav>
      </header>
    </div>
    <div class="grow w-4/5">
      <!--Organization Name Header-->
      <section class="justify-end items-center h-24 flex"
        style="background: linear-gradient(250deg, #c8102e 70%, #efecec 50.6%)">
        <h1 class="mr-20 text-3xl text-white"> {{ orgName }}</h1>
      </section>
      <!--Page Content-->
      <div>
        <router-view></router-view>
      </div>
    </div>
  </main>
</template>

<script setup>
// MIGRATION: Options API -> Composition API (<script setup>)
// - export default { setup(), data(), created(), methods } -> one <script setup> block
// - data() { orgName }  -> ref()
// - setup() { user }    -> top-level const, the template can use it directly
// - created()           -> the call now runs directly in setup (same timing as created())
// - methods.logout()    -> REMOVED. It called this.$store.dispatch(...), which is Vuex.
//                          This project uses Pinia, and the nav already calls user.logout
//                          from the store, so the old method was dead code.
import { ref } from 'vue'
import { useLoggedInUserStore } from './store/loggedInUser'
import { getOrgName } from './api/api'
import { useToast } from 'vue-toastification'

// Notifications
const toast = useToast()

// was: setup() { const user = useLoggedInUserStore(); return { user } }
const user = useLoggedInUserStore()

// was: data() { return { orgName: "Dataplatform" } }
const orgName = ref('Dataplatform')

// was: async created() { try { this.orgName = await getOrgName() } catch { throw (error) } }
// The old catch threw a variable that was never declared, which hid the real error.
// Now we keep the default name, log the real error and show a readable toast.
getOrgName()
  .then((name) => {
    orgName.value = name
  })
  .catch((error) => {
    console.error(error)
    toast.error('Could not load the organization name')
  })
</script>

<style scoped>
#_container {
  background-color: #c8102e;
  color: white;
  padding: 18px;
}
</style>
