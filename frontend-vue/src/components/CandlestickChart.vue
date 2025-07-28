<template>
  <div class="candlestick-chart">
    <div ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { VChart } from '@visactor/vchart'

const chartContainer = ref<HTMLElement>()
const chart = ref<VChart | null>(null)

const props = defineProps<{
  data: any[]
  title?: string
}>()

const createChart = () => {
  if (!chartContainer.value || !props.data.length) return

  const spec = {
    type: 'candlestick',
    data: [
      {
        values: props.data
      }
    ],
    xField: 'date',
    yField: ['open', 'high', 'low', 'close'],
    title: {
      text: props.title || 'Candlestick Chart',
      style: { fontSize: 16, fontWeight: 'bold' }
    },
    axes: [
      { type: 'band', orient: 'bottom' },
      { type: 'linear', orient: 'left' }
    ],
    tooltip: {
      style: { fontSize: 12 }
    }
  }

  chart.value = new VChart(spec, chartContainer.value)
  chart.value.render()
}

onMounted(() => {
  createChart()
})

watch(() => props.data, () => {
  if (chart.value) {
    chart.value.updateSpec({
      data: [{ values: props.data }]
    })
  } else {
    createChart()
  }
})

onUnmounted(() => {
  if (chart.value) {
    chart.value.destroy()
  }
})
</script>

<style scoped>
.candlestick-chart {
  width: 100%;
  height: 100%;
}

.chart-container {
  width: 100%;
  height: 400px;
}
</style>
