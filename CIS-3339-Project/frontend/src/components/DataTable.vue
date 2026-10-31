<!-- F3: one reusable table for the client, event and service lists.
     Before this, each list view had its own copy of almost the same <table> markup and hover logic. -->
<template>
  <div>
    <table class="min-w-full shadow-md rounded">
      <thead class="bg-gray-50 text-xl">
        <tr>
          <!-- clicking a header cycles: ascending -> descending -> unsorted -->
          <th v-for="column in columns" :key="column.field" class="p-4 text-left select-none" :style="column.style"
            :aria-sort="ariaSort(column.field)">
            <button type="button" class="font-bold text-left w-full flex items-center gap-1"
              style="padding: 0" @click="toggleSort(column.field)">
              {{ column.label }}
              <span class="text-sm text-gray-500" aria-hidden="true">{{ sortIcon(column.field) }}</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-300">
        <!-- rows are reachable with Tab and open with Enter, not only with a mouse click -->
        <tr v-for="row in pageRows" :key="row[rowKey]" tabindex="0"
          class="cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-700"
          :class="{ hoverRow: hoverKey === row[rowKey] }" @mouseenter="hoverKey = row[rowKey]"
          @mouseleave="hoverKey = null" @click="emit('row-click', row)" @keyup.enter="emit('row-click', row)">
          <td v-for="column in columns" :key="column.field" class="p-2 text-left" :class="column.cellClass">
            {{ cellText(row, column) }}
          </td>
        </tr>
        <!-- clear empty state instead of a blank table -->
        <tr v-if="!sortedRows.length">
          <td :colspan="columns.length" class="p-4 text-center italic text-gray-500">{{ emptyText }}</td>
        </tr>
      </tbody>
    </table>

    <!-- pagination -->
    <div v-if="sortedRows.length" class="flex items-center justify-between mt-3">
      <span class="text-sm text-gray-700">Showing {{ firstShown }}-{{ lastShown }} of {{ sortedRows.length }}</span>
      <div class="flex items-center gap-2">
        <button type="button" class="border border-red-700 bg-white text-red-700 rounded disabled:opacity-50"
          :disabled="page === 1" @click="page--">
          Previous
        </button>
        <span class="text-sm">Page {{ page }} of {{ pageCount }}</span>
        <button type="button" class="border border-red-700 bg-white text-red-700 rounded disabled:opacity-50"
          :disabled="page === pageCount" @click="page++">
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// F3: DataTable
// Props:
//   columns: [{ label: 'City', field: 'address.city', render?: (row) => text, style?, cellClass? }]
//            field can be a dotted path for nested values; render (optional) only changes what is
//            displayed, sorting always uses the raw field value (so dates sort as dates)
//   rows:    the array of records already loaded on the page (sorting and paging are client-side)
//   rowKey:  unique field per row, defaults to the Mongo _id
//   pageSize: rows per page, defaults to 10
//   emptyText: message shown in the table when there are no rows
// Emits:
//   row-click(row) when a row is clicked or Enter is pressed on it
import { ref, computed, watch } from 'vue'

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: String, default: '_id' },
  pageSize: { type: Number, default: 10 },
  emptyText: { type: String, default: 'No results' }
})

const emit = defineEmits(['row-click'])

const sortField = ref(null)
const sortDir = ref(null) // 'asc' | 'desc' | null
const page = ref(1)
const hoverKey = ref(null)

// reads a value like 'address.city' out of a row
function valueAt(row, field) {
  return field.split('.').reduce((obj, key) => (obj == null ? undefined : obj[key]), row)
}

function cellText(row, column) {
  if (column.render) return column.render(row)
  const value = valueAt(row, column.field)
  return value == null ? '' : value
}

// header click: asc -> desc -> unsorted
function toggleSort(field) {
  if (sortField.value !== field) {
    sortField.value = field
    sortDir.value = 'asc'
  } else if (sortDir.value === 'asc') {
    sortDir.value = 'desc'
  } else {
    sortField.value = null
    sortDir.value = null
  }
  page.value = 1
}

function sortIcon(field) {
  if (sortField.value !== field) return '↕'
  return sortDir.value === 'asc' ? '▲' : '▼'
}

function ariaSort(field) {
  if (sortField.value !== field) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

// numbers compare as numbers, text compares case-insensitively ("Item 2" before "Item 10"),
// empty values always go last
function compare(a, b) {
  if (a == null || a === '') return 1
  if (b == null || b === '') return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

const sortedRows = computed(() => {
  const rows = props.rows || []
  if (!sortField.value) return rows
  const direction = sortDir.value === 'desc' ? -1 : 1
  return [...rows].sort((r1, r2) => {
    const a = valueAt(r1, sortField.value)
    const b = valueAt(r2, sortField.value)
    // keep empty values last in both directions
    if (a == null || a === '') return 1
    if (b == null || b === '') return -1
    return direction * compare(a, b)
  })
})

const pageCount = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / props.pageSize)))
const pageRows = computed(() => {
  const start = (page.value - 1) * props.pageSize
  return sortedRows.value.slice(start, start + props.pageSize)
})
const firstShown = computed(() => (page.value - 1) * props.pageSize + 1)
const lastShown = computed(() => Math.min(page.value * props.pageSize, sortedRows.value.length))

// new rows (a search, Clear Search, a reload) always start back on page 1,
// so rows from an old page can never stay on screen
watch(
  () => props.rows,
  () => {
    page.value = 1
  }
)
</script>
