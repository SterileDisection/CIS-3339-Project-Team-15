<template>
  <div>
    <!-- MIGRATION: ref="zipChart" now points to a ref() declared in <script setup> instead of this.$refs -->
    <canvas class="p-10" ref="zipChart"></canvas>
  </div>
</template>

<script setup>
// MIGRATION: Options API -> Composition API (<script setup>)
// - props: {...}       -> defineProps()
// - this.$refs.zipChart -> template ref created with ref(null)
// - mounted()          -> onMounted()
// - NEW onBeforeUnmount() destroys the chart so it doesn't leak memory
// - NEW watch() redraws the chart when the zip data changes
// - removed the 'await' in front of new Chart(...) since a constructor isn't a promise
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

// was: props: { label: { type: Array }, chartData: { type: Array } }
const props = defineProps({
  label: {
    type: Array
  },
  chartData: {
    type: Array
  }
})

// was: this.$refs.zipChart
const zipChart = ref(null)
// holds the Chart.js instance so we can update or destroy it later
let chart = null

// was: async mounted() { await new Chart(this.$refs.zipChart, {...}) }
onMounted(() => {
  // uses the data to load the chart's values
  chart = new Chart(zipChart.value, {
    type: 'doughnut',
    data: {
      labels: props.label,
      datasets: [
        {
          borderWidth: 1,
          data: props.chartData
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Clients by Zip Code'
        }
      },
      responsive: true,
      maintainAspectRatio: true
    }
  })
})

// NEW: keep the chart in sync with its props
watch(
  () => [props.label, props.chartData],
  ([newLabels, newData]) => {
    if (!chart) return
    chart.data.labels = newLabels
    chart.data.datasets[0].data = newData
    chart.update()
  }
)

// NEW: clean up the Chart.js instance when the component goes away
onBeforeUnmount(() => {
  if (chart) chart.destroy()
})
</script>
