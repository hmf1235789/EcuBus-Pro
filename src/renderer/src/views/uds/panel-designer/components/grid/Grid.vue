<template>
  <el-col :span="24">
    <div>
      <GridLayout
        v-model:layout="layout"
        :col-num="rule.col"
        :row-height="50"
        :is-draggable="false"
        :is-resizable="false"
        :vertical-compact="true"
        :use-css-transforms="true"
        :margin="[10, 10]"
        :auto-size="true"
      >
        <GridItem
          v-for="item in layout"
          :key="item.i"
          :x="item.x"
          :y="item.y"
          :w="item.w"
          :h="item.h"
          :i="item.i"
          :min-w="1"
          :min-h="1"
          :static="true"
          style="overflow: hidden; border: 0px solid #ebeef5"
        >
          <div>
            <slot :name="item.i"></slot>
          </div>
        </GridItem>
      </GridLayout>
    </div>
  </el-col>
</template>

<script>
import { GridLayout, GridItem } from 'vue-grid-layout-v3'
export default {
  name: 'Grid',
  components: {
    GridLayout,
    GridItem
  },
  props: {
    label: String,
    width: [Number, String],
    border: {
      type: Boolean,
      default: true
    },
    borderWidth: String,
    borderColor: String,
    rule: {
      type: Object,
      default: () => ({ row: 1, col: 1 })
    }
  },
  watch: {
    rule: {
      handler() {
        this.initRule()
        this.loadRule()
      },
      immediate: true,
      deep: true
    }
  },
  data() {
    return {
      layout: []
    }
  },
  computed: {
    gridStyle() {
      const style = {}
      if (this.width) {
        style.width = typeof this.width === 'number' ? `${this.width}px` : this.width
      } else {
        style.width = '100%'
      }
      return style
    }
  },
  methods: {
    initRule() {
      const rule = this.rule
      if (!rule.style) {
        rule.style = {}
      }
      if (!rule.layout) {
        rule.layout = []
      }
      if (!rule.row) {
        rule.row = 1
      }
      if (!rule.col) {
        rule.col = 1
      }
    },
    loadRule() {
      const layout = []
      const rule = this.rule
      console.log(rule)
      // Generate grid cells
      for (let y = 0; y < rule.row; y++) {
        for (let x = 0; x < rule.col; x++) {
          const slotKey = `${y}:${x}`

          // Check if this cell is part of a merged layout cell
          let isPartOfMerged = false
          for (const layoutItem of rule.layout || []) {
            if (!layoutItem.row && !layoutItem.col) continue

            if (
              y >= layoutItem.top &&
              y < layoutItem.top + (layoutItem.row || 1) &&
              x >= layoutItem.left &&
              x < layoutItem.left + (layoutItem.col || 1)
            ) {
              // Skip if not the top-left cell of the merged area
              if (y !== layoutItem.top || x !== layoutItem.left) {
                isPartOfMerged = true
                break
              }
            }
          }

          if (!isPartOfMerged) {
            // Find if this is a merged cell
            const mergedCell = (rule.layout || []).find((l) => l.top === y && l.left === x)
            const width = mergedCell ? mergedCell.col || 1 : 1
            const height = mergedCell ? mergedCell.row || 1 : 1

            layout.push({
              x: x,
              y: y,
              w: width,
              h: height,
              i: slotKey,
              static: false
            })
          }
        }
      }

      this.layout = layout
    }
  }
}
</script>

<style></style>
