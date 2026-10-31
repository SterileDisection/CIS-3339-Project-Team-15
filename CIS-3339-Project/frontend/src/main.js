import { createApp, markRaw } from 'vue'
import router from './router'
import App from './App.vue'
import './index.css'
import Toast from 'vue-toastification'
// Import the CSS or use your own!
import 'vue-toastification/dist/index.css'
//state management library
import { createPinia } from 'pinia'
import { useLoggedInUserStore } from './store/loggedInUser'
import { setUnauthorizedHandler } from './api/api'

const app = createApp(App)

//create a pinia root store
const pinia = createPinia()
//pinia should be able to use router - has to be setup as plugin
pinia.use(({ store }) => {
  store.$router = markRaw(router)
})

//add pinia object to our instance
app.use(pinia)

// F4: restore a saved login BEFORE the router is installed, so the very first navigation guard
// already knows whether the user is logged in (and as which role) after a page refresh
const user = useLoggedInUserStore()
user.restoreSession()

// F2/F4: when any API call comes back 401, clear the login state and go to /login.
// Registered here because api.js can't import the store without a circular import.
setUnauthorizedHandler(() => user.sessionExpired())

app.use(router)

const options = {
  position: 'bottom-right'
}
app.use(Toast, options)
app.mount('#app')
