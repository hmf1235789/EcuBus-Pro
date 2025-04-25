<template>
  <div class="_fd-grid-view">
    <GridLayout
      v-model:layout="gridLayout"
      :col-num="rule.col"
      :row-height="50"
      :is-draggable="true"
      :is-resizable="true"
      :vertical-compact="true"
      :use-css-transforms="true"
      :margin="[10, 10]"
      :auto-size="true"
    >
      <GridItem
        v-for="(item, index) in gridLayout"
        :key="item.i"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :i="item.i"
        :style="[tableColor, (style && style[item.i]) || {}]"
        :class="(rule.class && rule.class[item.i]) || ''"
        :static="activeId === item.i"
      >
        <div class="_fd-grid-view-cell">
          <button
            v-if="activeId === item.i"
            class="grid-item-delete-btn"
            @click.stop="deleteGridItem(item.i)"
          >
            ×
          </button>
          <DragTool :drag-btn="false" :handle-btn="false" @active="active(item.i)" :unique="item.i">
            <DragBox
              v-bind="dragProp"
              @add="(e) => dragAdd(e, item.i)"
              :ref="(el) => (dragRefs[item.i] = el)"
              @end="(e) => dragEnd(e, item.i)"
              @start="(e) => dragStart(e)"
              @unchoose="(e) => dragUnchoose(e)"
              :list="getSlotChildren([item.i])"
            >
              <slot :name="item.i"></slot>
            </DragBox>
          </DragTool>
        </div>
      </GridItem>
    </GridLayout>
  </div>
</template>

<script setup>
/* eslint-disable vue/no-mutating-props */
import DragTool from '../DragTool.vue'
import DragBox from '../DragBox.vue'
import { ref, computed, watch, onBeforeMount, inject, nextTick } from 'vue'
import uniqueId from '@form-create/utils/lib/unique'
import { GridLayout, GridItem } from 'vue-grid-layout-v3'
import deepClone from 'lodash/cloneDeep'

const props = defineProps({
  label: String,
  width: [Number, String],
  formCreateInject: Object,
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
})

const designer = inject('designer')

const unique = ref({})
const style = ref({})
const gridLayout = ref([])
const dragRefs = ref({})
const dragProp = ref({
  rule: {
    props: {
      tag: 'el-col',
      group: 'default',
      ghostClass: 'ghost',
      animation: 150,
      handle: '._fd-drag-btn',
      emptyInsertThreshold: 0,
      direction: 'vertical',
      itemKey: 'type'
    }
  },
  tag: 'tableCell'
})

const t = computed(() => designer.setupState.t)

const tableColor = computed(() => {
  const border = {}
  if (props.border === false) {
    border['border'] = '0 none'
  } else {
    if (props.borderColor) {
      border['borderColor'] = props.borderColor
    }
    if (props.borderWidth) {
      border['borderWidth'] = props.borderWidth
    }
  }
  return border
})

const getSlotChildren = (slots) => {
  const children = []
  props.formCreateInject.children.forEach((child) => {
    if (slots.indexOf(child.slot) > -1) {
      children.push(child)
    }
  })
  return children
}

const dragAdd = (e, key) => {
  const designerState = designer.setupState
  const children = props.formCreateInject.children
  const slot = key
  const rule = e.item._underlying_vm_
  const flag = designerState.addRule && designerState.addRule.children === designerState.moveRule
  if (flag) {
    designerState.moveRule.splice(designerState.moveRule.indexOf(rule), 1)
  }

  let idx = 0
  const dragBoxRef = dragRefs.value[key]
  console.log(dragBoxRef, e)
  if (dragBoxRef && dragBoxRef.list && dragBoxRef.list.length) {
    let beforeRule = dragBoxRef.list[!e.newIndex ? 0 : e.newIndex - 1]
    idx = children.indexOf(beforeRule) + (e.newIndex ? 1 : 0)
  } else if (children.length) {
    // Try to find a reasonable position by checking other refs
    const dragRefKeys = Object.keys(dragRefs.value)
    if (dragRefKeys.length > 0) {
      for (let i = 0; i < dragRefKeys.length; i++) {
        const currentRef = dragRefs.value[dragRefKeys[i]]
        if (currentRef && currentRef.list && currentRef.list.length) {
          idx = children.indexOf(currentRef.list[currentRef.list.length - 1]) + 1
          break
        }
      }
    }
  }
  console.log(idx)
  e.newIndex = idx
  if (flag) {
    rule.slot = slot
    children.splice(e.newIndex, 0, rule)
    designerState.added = true
    designerState.handleSortAfter({ rule })
  } else {
    designerState.dragAdd(children, e, slot)
  }
  nextTick(() => {
    console.log(dragRefs.value)
  })
}

const dragEnd = (e, key) => {
  const designerState = designer.setupState
  const children = props.formCreateInject.children
  const rule = e.item._underlying_vm_
  const oldIdx = children.indexOf(rule)
  e.newIndex = oldIdx + (e.newIndex - e.oldIndex)
  e.oldIndex = oldIdx
  designerState.dragEnd(props.formCreateInject.children, e, key)
}

const dragStart = () => {
  designer.setupState.dragStart(props.formCreateInject.children)
}

const dragUnchoose = (e) => {
  designer.setupState.dragUnchoose(props.formCreateInject.children, e)
}

const initRule = () => {
  const rule = props.rule
  if (!rule.style) {
    rule.style = {}
  }
  if (!rule.class) {
    rule.class = {}
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
}

const active = (key) => {
  console.log(key)
  activeId.value = key
  designer.setupState.customActive({
    name: 'GridItem',
    onPaste: (rule) => {
      rule.slot = key
      props.formCreateInject.children.push(rule)
    },
    style: {
      formData: {
        style: props.rule.style[key] || {},
        class: props.rule.class[key] || ''
      },
      change: (field, value) => {
        props.rule[field][key] = value || {}
      }
    }
  })
}

const activeId = ref(null)
const loadRule = () => {
  const tmpGridLayout = []
  const rule = props.rule || { row: 1, col: 1 }

  // Create grid layout items
  for (let y = 0; y < rule.row; y++) {
    for (let x = 0; x < rule.col; x++) {
      const id = uniqueId()

      // Check if this cell is part of a merged cell (skip if it is)
      let isPartOfMerged = false
      for (const layout of rule.layout || []) {
        if (!layout.row && !layout.col) continue

        if (
          y >= layout.top &&
          y < layout.top + (layout.row || 1) &&
          x >= layout.left &&
          x < layout.left + (layout.col || 1)
        ) {
          // Skip if not the top-left cell of the merged area
          if (y !== layout.top || x !== layout.left) {
            isPartOfMerged = true
            break
          }
        }
      }

      if (!isPartOfMerged) {
        // Find if this is a merged cell
        const mergedLayout = (rule.layout || []).find((l) => l.top === y && l.left === x)
        const width = mergedLayout ? mergedLayout.col || 1 : 1
        const height = mergedLayout ? mergedLayout.row || 1 : 1

        tmpGridLayout.push({
          x: x,
          y: y,
          w: width,
          h: height,
          i: id
        })
      }
    }
  }

  gridLayout.value = tmpGridLayout
  props.formCreateInject.rule.props.rule = rule
}

const rmSlot = (key) => {
  const children = props.formCreateInject.children
  let del = 0
  console.log(deepClone(children))
  ;[...children].forEach((child, index) => {
    if (!child.slot) {
      return
    }
    if (child.slot === key) {
      children.splice(index - del, 1)
      del++
    }
  })
}

const deleteGridItem = (key) => {
  console.log('Deleting grid item with key:', key)

  // Find the corresponding item in the gridLayout
  const layoutIndex = gridLayout.value.findIndex((item) => item.i === key)

  if (layoutIndex > -1) {
    // Remove children and styles using rmSlot
    rmSlot(key)

    // Find and remove from rule.layout if it exists
    const ruleLayoutIndex = props.rule.layout.findIndex((layout) => layout.i === key)

    if (ruleLayoutIndex > -1) {
      props.rule.layout.splice(ruleLayoutIndex, 1)
    }

    // Remove the item from gridLayout
    gridLayout.value.splice(layoutIndex, 1)

    // Reset active item if it was the deleted one
    if (activeId.value === key) {
      activeId.value = null
    }
  }
}

watch(
  () => props.rule,
  () => {
    initRule()
    style.value = props.rule.style
    loadRule()
  },
  { immediate: true, deep: true }
)

onBeforeMount(() => {
  loadRule()
})
</script>

<style scoped>
.vue-grid-layout {
  background-color: transparent;
  height: 100%;
}

._fd-grid-view-cell {
  height: 100%;
  width: 100%;
  border: 1px dashed #dcdfe6;
  background-color: white;
  position: relative;
}

.grid-item-delete-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  background: transparent;
  color: #666;
  border: none;
  border-radius: 0;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  z-index: 10;
  transition: color 0.2s;
  padding: 0;
}

.grid-item-delete-btn:hover {
  color: #f56c6c;
}

.vue-grid-item {
  margin-bottom: 10px;
  transition: all 200ms ease;
  box-sizing: border-box;
}

.vue-grid-item:not(.vue-grid-placeholder) {
  background: #fff;
  border: 1px solid #ebeef5;
}

.vue-grid-item.vue-grid-placeholder {
  background: #f0f9eb;
  opacity: 0.5;
}
</style>
