// This pinia store contains state with respect to whether a user is logged in
import { defineStore } from 'pinia'
import { useToast } from 'vue-toastification'
import { loginUser, logoutUser, setAuthHeader } from '../api/api' // import API calls
import jwt_decode from 'jwt-decode' // import JSON Web Token decoder to decode the token into the user's information

//Notifications
const toast = useToast()

// F4: the logged-out state in one place, so login, logout, restore and session expiry all agree
const loggedOutState = () => ({
  name: '',
  role: '',
  isLoggedIn: false
})

// F4: decodes a JWT and checks its exp claim.
// Returns the payload for a usable token, or null for a missing, corrupted or expired one.
function readToken(token) {
  if (!token) return null
  try {
    const payload = jwt_decode(token)
    // exp is in seconds since 1970; a token with no exp is treated as invalid
    if (!payload.exp || payload.exp * 1000 <= Date.now()) return null
    return payload
  } catch (error) {
    // jwt_decode throws on anything that isn't a well-formed token
    return null
  }
}

// Defining a store
export const useLoggedInUserStore = defineStore({
  id: 'loggedInUser',
  state: loggedOutState,
  actions: {
    async login(username, password) {
      try {
        const token = await loginUser(username, password)
        // Get the user's name and role from the JWT token
        const decodedToken = jwt_decode(token)
        this.$patch({
          isLoggedIn: true,
          role: decodedToken.role,
          name: decodedToken.name
        })
        // F4: if the route guard sent the user to /login, take them back to the page they wanted
        const redirect = this.$router.currentRoute.value.query.redirect
        this.$router.push(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/')
        toast.success('Login Successful!')
      } catch (error) {
        toast.error(error.message)
      }
    },

    // F4: called once at app startup (main.js), before the router runs its first navigation.
    // A valid saved token restores the Authorization header and the login state, so a page
    // refresh no longer logs the user out. A missing, expired or corrupted token is removed
    // and the app starts cleanly logged out instead of crashing.
    restoreSession() {
      const token = localStorage.getItem('authToken')
      const payload = readToken(token)
      if (!payload) {
        // clears any bad token and the Authorization header
        logoutUser()
        this.$patch(loggedOutState())
        return false
      }
      setAuthHeader(token)
      this.$patch({
        isLoggedIn: true,
        role: payload.role,
        name: payload.name
      })
      return true
    },

    logout() {
      // F4: clears both the stored token (and Authorization header) and the Pinia state
      logoutUser()
      this.$patch(loggedOutState())
      this.$router.push('/')
      toast.info('You have been logged out!')
    },

    // F2/F4: the api interceptor calls this (through main.js) when the server answers 401,
    // which means the token expired or was rejected while the user was working
    sessionExpired() {
      logoutUser()
      this.$patch(loggedOutState())
      this.$router.push('/login')
      toast.info('Your session has ended. Please log in again.')
    }
  }
})
