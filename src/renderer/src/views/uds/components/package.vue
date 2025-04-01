<template>
  <div class="package-manager" :style="{ width: `${w - 5}px`, height: `${h}px` }">
    <div class="header">
      <h2>Package Manager</h2>
    </div>

    <div v-if="!hasPackageJson" class="no-package-json">
      <el-empty :image-size="50">
        <template #description>
          <div class="init-description">
            <p>No package.json found</p>
            <p class="sub-text">{{ initDescription }}</p>
            <el-button
              type="primary"
              class="init-button"
              :disabled="!canInitPackageJson"
              @click="handleInitPackageJson"
            >
              Initialize package.json
            </el-button>
          </div>
        </template>
      </el-empty>
    </div>

    <template v-else>
      <div class="content-container">
        <div class="install-section">
          <el-form :inline="true" class="install-form" @submit.prevent="installPackage">
            <el-form-item>
              <el-input
                v-model="packageName"
                placeholder="Enter package name"
                clearable
                :style="{ width: `${Math.min(300, w * 0.4)}px` }"
              />
            </el-form-item>
            <el-form-item>
              <el-select
                v-model="installType"
                placeholder="Install type"
                :style="{ width: `${Math.min(160, w * 0.2)}px` }"
              >
                <el-option label="Dependencies" value="dependencies" />
                <el-option label="Dev Dependencies" value="devDependencies" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="isInstalling" @click="installPackage"
                >Install</el-button
              >
            </el-form-item>
          </el-form>
        </div>

        <div v-show="showTerminal" class="terminal-container">
          <div class="terminal-header">
            <span>Installation Log</span>
            <el-button type="text" @click="clearTerminal">Clear</el-button>
          </div>
          <div ref="terminalElement" class="terminal"></div>
        </div>

        <div
          class="packages-list"
          :style="{ height: showTerminal ? `${h - 380}px` : `${h - 180}px` }"
        >
          <h3>Installed Packages</h3>

          <el-tabs v-model="activeTab">
            <el-tab-pane label="Dependencies" name="dependencies">
              <div class="table-container">
                <el-table :data="dependenciesList" :height="`${h - 250}px`" style="width: 100%">
                  <el-table-column prop="name" label="Package Name" min-width="180" />
                  <el-table-column prop="version" label="Version" width="180" />
                  <el-table-column label="Actions" width="120" fixed="right">
                    <template #default="scope">
                      <el-button
                        type="danger"
                        size="small"
                        @click="uninstallPackage(scope.row.name)"
                      >
                        Uninstall
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>

            <el-tab-pane label="Dev Dependencies" name="devDependencies">
              <div class="table-container">
                <el-table :data="devDependenciesList" :height="`${h - 250}px`" style="width: 100%">
                  <el-table-column prop="name" label="Package Name" min-width="180" />
                  <el-table-column prop="version" label="Version" width="180" />
                  <el-table-column label="Actions" width="120" fixed="right">
                    <template #default="scope">
                      <el-button
                        type="danger"
                        size="small"
                        @click="uninstallPackage(scope.row.name, true)"
                      >
                        Uninstall
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, toRef, onBeforeUnmount, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useProjectStore } from '@r/stores/project'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

const project = useProjectStore()
const packageName = ref('')
const installType = ref('dependencies')
const activeTab = ref('dependencies')
const packageJson = ref<any>(null)
const isInstalling = ref(false)
const showTerminal = ref(false)
const terminal = ref<Terminal>()
const fitAddon = ref<FitAddon>()
const terminalElement = ref<HTMLElement>()

const props = defineProps<{
  height: number
  width: number
}>()
const h = toRef(props, 'height')
const w = toRef(props, 'width')

const hasPackageJson = computed(() => packageJson.value !== null)

const canInitPackageJson = computed(() => !!project.projectInfo.path)
const initDescription = computed(() => {
  if (!project.projectInfo.path) {
    return 'Please save your project first before initializing package.json'
  }
  return 'Please initialize package.json first to manage dependencies'
})

const dependenciesList = computed(() => {
  if (!packageJson.value?.dependencies) return []
  return Object.entries(packageJson.value.dependencies).map(([name, version]) => ({
    name,
    version
  }))
})

const devDependenciesList = computed(() => {
  if (!packageJson.value?.devDependencies) return []
  return Object.entries(packageJson.value.devDependencies).map(([name, version]) => ({
    name,
    version
  }))
})

// 初始化终端
const initTerminal = () => {
  if (terminalElement.value) {
    terminal.value = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      lineHeight: 1.2,
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff'
      }
    })
    fitAddon.value = new FitAddon()
    terminal.value.loadAddon(fitAddon.value)
    terminal.value.open(terminalElement.value)
    fitAddon.value.fit()
  }
}

// 清空终端
const clearTerminal = () => {
  terminal.value?.clear()
}

// 写入日志到终端
const writeToTerminal = (data: string) => {
  terminal.value?.writeln(data)
  fitAddon.value?.fit()
}

let close
// 监听安装日志事件
const setupLogListener = () => {
  close = window.electron.ipcRenderer.on('ipc-pnpm-log', (_event, log) => {
    writeToTerminal(log)
  })
}

// 初始化 package.json
const initPackageJson = async () => {
  try {
    showTerminal.value = true
    isInstalling.value = true
    await window.electron.ipcRenderer.invoke('ipc-pnpm-init', project.projectInfo.path)
    ElMessage.success('package.json initialized successfully')
    await loadPackageJson()
  } catch (error) {
    ElMessage.error('Failed to initialize package.json')
    console.error(error)
  } finally {
    isInstalling.value = false
  }
}

// 安装包
const installPackage = async () => {
  if (!packageName.value) {
    ElMessage.warning('Please enter a package name')
    return
  }

  try {
    showTerminal.value = true
    isInstalling.value = true
    await window.electron.ipcRenderer.invoke(
      'ipc-pnpm-install',
      project.projectInfo.path,
      packageName.value,
      installType.value === 'devDependencies'
    )
    ElMessage.success(`Package ${packageName.value} installed successfully`)
    packageName.value = ''
    await loadPackageJson()
  } catch (error) {
    ElMessage.error(`Failed to install package ${packageName.value}`)
    console.error(error)
  } finally {
    isInstalling.value = false
  }
}

// 卸载包
const uninstallPackage = async (name: string, isDev: boolean = false) => {
  try {
    showTerminal.value = true
    isInstalling.value = true
    await window.electron.ipcRenderer.invoke('ipc-pnpm-uninstall', project.projectInfo.path, name)
    ElMessage.success(`Package ${name} uninstalled successfully`)
    await loadPackageJson()
  } catch (error) {
    ElMessage.error(`Failed to uninstall package ${name}`)
    console.error(error)
  } finally {
    isInstalling.value = false
  }
}

// 读取 package.json
const loadPackageJson = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke(
      'ipc-pnpm-read',
      project.projectInfo.path
    )
    packageJson.value = result
  } catch (error) {
    console.error('Failed to load package.json:', error)
  }
}

const handleInitPackageJson = async () => {
  await initPackageJson()
}

watch([h, w], () => {
  fitAddon.value?.fit()
})

onMounted(() => {
  loadPackageJson()
  initTerminal()
  setupLogListener()
})

onBeforeUnmount(() => {
  // 清理事件监听
  close()
  // 销毁终端
  terminal.value?.dispose()
})
</script>

<style scoped>
.package-manager {
  box-sizing: border-box;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  flex-shrink: 0;
}

.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.install-section {
  margin-bottom: 16px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
  flex-shrink: 0;
}

.install-form {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.packages-list {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-container {
  flex: 1;
  overflow: hidden;
}

.no-package-json {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
  height: calc(100% - 56px); /* 减去header高度和margin-top */
  min-height: 250px;
  border-radius: 4px;
  padding: 20px;
  box-sizing: border-box;
}

.init-description {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.init-description p {
  margin: 0;
  color: #303133;
  font-size: 16px;
}

.init-description .sub-text {
  color: #909399;
  font-size: 14px;
}

.init-button {
  margin-top: 16px;
}

.el-form-item {
  margin-bottom: 0;
  margin-right: 10px;
}

h3 {
  margin: 0 0 16px 0;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

:deep(.el-tab-pane) {
  height: 100%;
}

:deep(.el-empty__image) {
  margin-bottom: 16px;
}

.terminal-container {
  margin-bottom: 16px;
  background-color: #1e1e1e;
  border-radius: 4px;
  overflow: hidden;
  height: 200px;
  display: flex;
  flex-direction: column;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #2d2d2d;
  color: #ffffff;
}

.terminal {
  flex: 1;
  padding: 8px;
}
</style>
