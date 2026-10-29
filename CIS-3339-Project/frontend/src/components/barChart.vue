<template>
  <div>
    <!-- MIGRATION: ref="attendanceChart" now points to a ref() declared in <script setup> instead of this.$refs -->
    <canvas class="p-10" ref="attendanceChart"></canvas>
  </div>
</template>

<script setup>
// MIGRATION: Options API -> Composition API (<script setup>)
// - props: {...}            -> defineProps()
// - this.$refs.attendanceChart -> template ref created with ref(null)
// - mounted()               -> onMounted()
// - NEW onBeforeUnmount()   -> destroys the Chart.js instance so the canvas and its
//                              listeners don't leak every time we leave the dashboard
// - NEW watch()             -> redraws the chart when label/chartData change
//                              (the old version only drew once and went stale)
// - removed the 'await' in front of new Chart(...) since a constructor isn't a promise
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, registerables, Colors } from 'chart.js'

Chart.register(...registerables)
Chart.register(Colors)

// was: props: { label: { type: Array }, chartData: { type: Array } }
const props = defineProps({
  label: {
    type: Array
  },
  chartData: {
    type: Array
  }
})

// was: this.$refs.attendanceChart
const attendanceChart = ref(null)
// holds the Chart.js instance so we can update or destroy it later
let chart = null

// was: async mounted() { await new Chart(this.$refs.attendanceChart, {...}) }
onMounted(() => {
  chart = new Chart(attendanceChart.value, {
    type: 'bar',
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
      scales: {
        y: {
          ticks: {
            stepSize: 1
          }
        },
        x: {
          gridLines: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Attendance Chart'
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