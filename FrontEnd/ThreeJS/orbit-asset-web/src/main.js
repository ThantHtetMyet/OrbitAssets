import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { buildOrbitPackage } from './orbitPackage.js'

// ── Import 3D Assets from modular folders ──────
import { chairAsset } from './3d_assets/chair/chair.js'
import { tableAsset } from './3d_assets/table/table.js'
import { deskAsset } from './3d_assets/desk/desk.js'
import { wallAsset } from './3d_assets/wall/wall.js'
import { cctvAsset } from './3d_assets/cctv/cctv.js'
import { barrierAsset } from './3d_assets/barrier/barrier.js'
import { fenceAsset } from './3d_assets/fence/fence.js'
import { gateAsset } from './3d_assets/gate/gate.js'
import { grassAsset } from './3d_assets/grass/grass.js'
import { lightPoleAsset } from './3d_assets/lightpole/lightpole.js'
import { roadAsset } from './3d_assets/road/road.js'
import { signboardAsset } from './3d_assets/signboard/signboard.js'
import { treeAsset } from './3d_assets/tree/tree.js'
import { typographyAsset } from './3d_assets/typography/typography.js'
import { buildingAsset } from './3d_assets/building/building.js'
import cctvOneIcon from './icons/3d_icon/cctv-one.png'
import cctvTwoIcon from './icons/3d_icon/cctv-two.png'
import cctvThreeIcon from './icons/3d_icon/cctv-three.png'
import signboardOneIcon from './icons/3d_icon/protected_area_signboard_1.png'
import signboardTwoIcon from './icons/3d_icon/protected_area_signboard_2.png'

// ── Asset Registry ─────────────────────────────
const ASSETS = [
  chairAsset,
  tableAsset,
  deskAsset,
  wallAsset,
  cctvAsset,
  barrierAsset,
  fenceAsset,
  gateAsset,
  grassAsset,
  lightPoleAsset,
  roadAsset,
  signboardAsset,
  treeAsset,
  typographyAsset,
  buildingAsset,
]

// ── Application State ──────────────────────────
let activeAssetIndex = null
let isDayTheme = true
const LAYOUT_MODE_STORAGE_KEY = 'orbit-asset-layout-mode'
const AVAILABLE_LAYOUT_MODES = new Set(['compact', 'cozy', 'showcase'])
let activeLayoutMode = getSavedLayoutMode()
const LAYOUT_MODE_ORDER = {
  compact: 0,
  cozy: 1,
  showcase: 2,
}

// Main Preview Scene variables
let previewScene, previewCamera, previewRenderer, previewControls
let previewActiveGroup = null

// Array to track card viewports
let cardViewports = []
let activeCardViewport = null

// Shared reusable materials for the active preview overlay
const primaryMaterial = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 })
const secondaryMaterial = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.15 })

// ── DOM References ─────────────────────────────
const galleryGrid = document.querySelector('#gallery-grid')
const searchInput = document.querySelector('#asset-search')
const assetCountLabel = document.querySelector('#asset-count')
const layoutSelector = document.querySelector('#layout-selector')
const layoutModeButtons = [...document.querySelectorAll('[data-layout-mode]')]
const themeToggleBtn = document.querySelector('#theme-toggle')
const themeIconMoon = document.querySelector('#theme-icon-moon')
const themeIconSun = document.querySelector('#theme-icon-sun')

// Preview overlay/modal elements
const previewOverlay = document.querySelector('#preview-overlay')
const previewCloseBtn = document.querySelector('#preview-close')
const previewCanvas = document.querySelector('#preview-canvas')
const previewLabel = document.querySelector('#preview-label')
const previewResetCamBtn = document.querySelector('#preview-reset-cam')
const downloadOrbitBtn = document.querySelector('#download-orbit-btn')
const customizerForm = document.querySelector('#customizer-form')
const extraParamsGroup = document.querySelector('#group-extra-params')

const inputColorPrimary = document.querySelector('#param-color-primary')
const inputColorSecondary = document.querySelector('#param-color-secondary')
const hexColorPrimary = document.querySelector('#hex-color-primary')
const hexColorSecondary = document.querySelector('#hex-color-secondary')

// Shape customization DOM references
const groupShapeCustomizer = document.querySelector('#group-shape-customizer')
const btnDrawShape = document.querySelector('#btn-draw-shape')
const shapeDrawOverlay = document.querySelector('#shape-draw-overlay')
const shapeDrawClose = document.querySelector('#shape-draw-close')
const shapeDrawContainer = document.querySelector('#shape-draw-container')
const shapeDrawCancel = document.querySelector('#shape-draw-cancel')
const shapeDrawConfirm = document.querySelector('#shape-draw-confirm')
const shapeDrawTitle = document.querySelector('#shape-draw-title')
const shapeDrawBackdrop = document.querySelector('#shape-draw-backdrop')

// State to store custom shape points
let activeShapePoints = null
let activeDashPolylines = null
const gltfExporter = new GLTFExporter()

function wrapRenderableAssetNode(node) {
  if (node?.isObject3D) {
    return node
  }
  const group = new THREE.Group()
  if (node) {
    group.add(node)
  }
  return group
}

function cloneRenderableAsset(asset, objectConfig, extrasData) {
  const primaryMaterial = new THREE.MeshStandardMaterial({
    color: objectConfig.colorHex || asset.colorPrimary || '#9aa8b8',
    roughness: 0.5,
    metalness: 0.1,
  })
  const secondaryMaterial = new THREE.MeshStandardMaterial({
    color: objectConfig.colorSecondaryHex || asset.colorSecondary || objectConfig.colorHex || '#475569',
    roughness: 0.5,
    metalness: 0.15,
  })
  const built = asset.build(
    {
      width: objectConfig.widthM,
      depth: objectConfig.depthM,
      height: objectConfig.heightM,
      extras: extrasData,
    },
    primaryMaterial,
    secondaryMaterial
  )
  const root = wrapRenderableAssetNode(built)
  root.position.set(0, 0, 0)
  root.rotation.set(0, 0, 0)
  root.updateMatrixWorld(true)
  return root
}

function disposeExportNode(object) {
  object?.traverse?.((node) => {
    if (node.geometry) {
      node.geometry.dispose()
    }
    const materials = Array.isArray(node.material)
      ? node.material
      : (node.material ? [node.material] : [])
    for (const material of materials) {
      if (material?.map) {
        material.map.dispose?.()
      }
      material?.dispose?.()
    }
  })
}

function exportRenderableToGlbBuffer(renderable) {
  return new Promise((resolve, reject) => {
    gltfExporter.parse(
      renderable,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result)
          return
        }
        reject(new Error('GLB export did not return binary data.'))
      },
      (error) => reject(error),
      { binary: true, onlyVisible: false, maxTextureSize: 2048 }
    )
  })
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

async function buildOrbitExportData({ asset, object, extras, resizable, exportMode }) {
  const renderable = cloneRenderableAsset(asset, object, extras)
  try {
    const glbBuffer = await exportRenderableToGlbBuffer(renderable)
    const packageId = `orbit-${asset.id}-${Date.now()}`
    return buildOrbitPackage({
      asset,
      object,
      extras,
      resizable,
      exportMode,
      packageId,
      render: {
        kind: 'embedded-glb',
        assetId: asset.id,
        model: {
          mimeType: 'model/gltf-binary',
          encoding: 'base64',
          data: arrayBufferToBase64(glbBuffer),
        },
      },
      capabilities: {
        supportsPlacement: true,
        supportsResize: true,
        supportsPrimaryColor: false,
        supportsSecondaryColor: false,
        supportsShapeEditor: false,
      },
    })
  } finally {
    disposeExportNode(renderable)
  }
}

// ── Clean Up Interactive Card Viewports ────────
function clearCardViewports() {
  activeCardViewport = null
  cardViewports.forEach((vp) => {
    if (vp.controls) vp.controls.dispose()
    if (vp.group) {
      vp.group.traverse((node) => {
        if (node.geometry) node.geometry.dispose()
      })
    }
    if (vp.primaryMat) vp.primaryMat.dispose()
    if (vp.secondaryMat) vp.secondaryMat.dispose()
    if (vp.renderer) vp.renderer.dispose()
  })
  cardViewports = []
}

function setActiveCardViewport(nextViewport) {
  activeCardViewport = nextViewport || null
  cardViewports.forEach((vp) => {
    const isActive = vp === activeCardViewport
    if (vp.controls) {
      vp.controls.enabled = isActive
      vp.controls.enableRotate = isActive
      vp.controls.enableZoom = isActive
      vp.controls.enablePan = false
    }
    vp.card?.classList.toggle('asset-card--interactive-active', isActive)
    vp.card?.classList.toggle('asset-card--interactive-ready', !isActive)
    if (vp.canvas) {
      vp.canvas.style.cursor = isActive ? 'grab' : 'pointer'
    }
  })
}

function getSavedLayoutMode() {
  try {
    const saved = window.localStorage.getItem(LAYOUT_MODE_STORAGE_KEY)
    if (saved && AVAILABLE_LAYOUT_MODES.has(saved)) {
      return saved
    }
  } catch {
    // Ignore storage access failures and fall back to the default layout.
  }
  return 'cozy'
}

function applyLayoutMode(mode) {
  const normalized = AVAILABLE_LAYOUT_MODES.has(mode) ? mode : 'cozy'
  activeLayoutMode = normalized
  if (galleryGrid) {
    galleryGrid.dataset.layout = normalized
  }
  if (layoutSelector) {
    layoutSelector.dataset.activeLayout = normalized
  }
  layoutModeButtons.forEach((button) => {
    const isActive = button.dataset.layoutMode === normalized
    button.classList.toggle('is-active', isActive)
    button.setAttribute('aria-pressed', String(isActive))
    button.style.order = isActive ? '-1' : String((LAYOUT_MODE_ORDER[button.dataset.layoutMode] ?? 0) + 1)
  })
  try {
    window.localStorage.setItem(LAYOUT_MODE_STORAGE_KEY, normalized)
  } catch {
    // Ignore storage access failures and keep the selected layout for this session.
  }
}

function getSignboardTypeOptions() {
  return [
    { value: 1, label: 'Protected Area', src: signboardOneIcon },
    { value: 2, label: 'Protected Place', src: signboardTwoIcon },
  ]
}

function getCctvTypeOptions() {
  return [
    { value: 1, label: 'Bullet', src: cctvOneIcon },
    { value: 2, label: 'Compact', src: cctvTwoIcon },
    { value: 3, label: 'Dome', src: cctvThreeIcon },
  ]
}

// ── Initialize Card Viewport ───────────────────
function initCardViewport(canvas, asset) {
  const width = canvas.clientWidth || 300
  const height = canvas.clientHeight || 225

  const scene = new THREE.Scene()
  scene.background = null // Transparent background

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true, // Blend with card backgrounds
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(width, height, false)
  renderer.shadowMap.enabled = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1

  // Individual lighting to highlight details
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(3, 5, 2)
  scene.add(dirLight)

  const fillLight = new THREE.DirectionalLight(0x6366f1, 0.4)
  fillLight.position.set(-3, 2, -2)
  scene.add(fillLight)

  // Card-specific materials
  const primaryMat = new THREE.MeshStandardMaterial({
    color: asset.colorPrimary,
    roughness: 0.5,
    metalness: 0.1,
  })
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: asset.colorSecondary,
    roughness: 0.5,
    metalness: 0.15,
  })

  // Gather default asset extra variables
  const defaultExtras = {}
  if (asset.extras) {
    asset.extras.forEach((extra) => {
      defaultExtras[extra.id] = extra.value
    })
  }

  // Build model geometry
  const group = asset.build(
    {
      width: asset.width,
      depth: asset.depth,
      height: asset.height,
      extras: defaultExtras,
    },
    primaryMat,
    secondaryMat,
  )

  // Center group base
  const box = new THREE.Box3().setFromObject(group)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  group.position.x = -center.x
  group.position.y = -box.min.y
  group.position.z = -center.z

  // Start with nice default angle
  group.rotation.y = Math.PI / 5
  group.rotation.x = 0.08

  scene.add(group)

  // Fit camera inside the canvas nicely
  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = camera.fov * (Math.PI / 180)
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))

  // Camera bounds heuristics
  let zoomMult = asset.thumbZoom || 2.3
  let pitchAngle = 0.75 // y offset multiplier
  let yawOffset = 0.9 // x offset multiplier
  let rollOffset = 1.1 // z offset multiplier

  if (size.y < 0.3) {
    // Flat assets: grass, road
    zoomMult = asset.thumbZoom || 1.8
    pitchAngle = 1.3 // look down steeply
    yawOffset = 0.5
    rollOffset = 0.8
  } else if (size.y > 1.5 && size.y > Math.max(size.x, size.z) * 1.8) {
    // Tall assets: light pole, cctv
    zoomMult = asset.thumbZoom || 1.6 // Zoom closer
    pitchAngle = 0.5 // Lower angle
    yawOffset = 0.9
    rollOffset = 1.0
  }

  cameraZ *= zoomMult

  camera.position.set(cameraZ * yawOffset, cameraZ * pitchAngle, cameraZ * rollOffset)
  camera.lookAt(0, size.y / 2, 0)

  // Mini cards only become interactive after click so wheel keeps scrolling normally.
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false // Keep the model centered
  controls.enabled = false
  controls.enableRotate = false
  controls.enableZoom = false
  controls.minDistance = cameraZ * 0.4 // Prevent clipping inside model
  controls.maxDistance = cameraZ * 2.5 // Prevent zooming too far out
  controls.target.set(0, size.y / 2, 0)
  controls.update()

  const card = canvas.closest('.asset-card')
  const viewport = {
    card,
    canvas,
    asset,
    scene,
    camera,
    renderer,
    controls,
    group,
    primaryMat,
    secondaryMat,
  }

  card?.classList.add('asset-card--interactive-ready')
  canvas.style.cursor = 'pointer'
  card?.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.card-action-btn')) {
      return
    }
    setActiveCardViewport(viewport)
  })
  canvas.addEventListener('wheel', (event) => {
    if (activeCardViewport !== viewport) {
      return
    }
    event.preventDefault()
  }, { passive: false })

  cardViewports.push(viewport)
}

// ── Asset Gallery Grid Builder ────────────────
function buildAssetList() {
  // Clear any existing 3D contexts on card search/rebuild
  clearCardViewports()

  galleryGrid.innerHTML = ''
  galleryGrid.dataset.layout = activeLayoutMode
  const query = searchInput ? searchInput.value.toLowerCase().trim() : ''
  let visibleCount = 0

  const cardsToInit = []

  ASSETS.forEach((asset, index) => {
    if (
      query &&
      !asset.name.toLowerCase().includes(query) &&
      !asset.tag.toLowerCase().includes(query)
    ) {
      return
    }
    visibleCount++

    // Generate customization badges
    const badges = []
    if (asset.colorPrimary || asset.colorSecondary) {
      badges.push('🎨 Color')
    }
    if (asset.extras) {
      asset.extras.forEach((extra) => {
        if (extra.id === 'camera-angle') badges.push('📹 Tilt')
        else if (extra.id === 'sight-angle') badges.push('💡 Light Tilt')
        else if (extra.id === 'open-angle') badges.push('🚪 Open')
        else if (extra.id === 'arm-angle') badges.push('🚧 Arm')
        else if (extra.id === 'canopy-scale') badges.push('🌳 Canopy')
        else if (extra.id === 'blade-density') badges.push('🌱 Density')
        else if (extra.id === 'lane-count') badges.push('🛣️ Lanes')
        else if (extra.id === 'post-height') badges.push('📏 Height')
        else if (extra.id === 'trim-height') badges.push('📏 Trim')
        else if (extra.id === 'backrest-height') badges.push('🪑 Backrest')
        else if (extra.id === 'cushion-thickness') badges.push('🪑 Cushion')
        else if (extra.id === 'top-thickness') badges.push('📐 Thickness')
        else if (extra.id === 'leg-width') badges.push('📐 Legs')
        else if (extra.id === 'panel-depth') badges.push('📏 Depth')
        else if (extra.id === 'drawer-side') badges.push('🗄️ Drawer')
        else if (extra.id === 'is-cylinder') badges.push('🏢 Shape')
        else badges.push(`📐 ${extra.name}`)
      })
    }
    const badgesHtml = badges.map(b => `<span class="custom-badge">${b}</span>`).join('')

    const card = document.createElement('div')
    card.className = 'asset-card'
    card.dataset.index = index

    card.innerHTML = `
      <div class="asset-card__thumb">
        <span class="asset-card__tag-badge">${asset.tag}</span>
        <span class="asset-card__interaction-hint">Click to zoom</span>
        <canvas class="asset-card__canvas" style="width: 100%; height: 100%; display: block;"></canvas>
      </div>
      <div class="asset-card__footer">
        <div class="asset-card__info">
          <div class="asset-card__title-row" style="display: flex; align-items: center; gap: 8px;">
            <span class="asset-card__icon">${asset.icon}</span>
            <span class="asset-card__name">${asset.name}</span>
          </div>
          <div class="asset-card__customization-badges" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
            ${badgesHtml}
          </div>
        </div>
        <div class="asset-card__actions">
          <button class="card-action-btn card-action-btn--expand" title="Expand View">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </button>
          <button class="card-action-btn card-action-btn--download" title="Download .orbit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>
      </div>
    `

    // Expand action click handler
    card.querySelector('.card-action-btn--expand').addEventListener('click', (e) => {
      e.stopPropagation()
      openPreviewModal(index)
    })

    // Direct download click handler
    card.querySelector('.card-action-btn--download').addEventListener('click', async (e) => {
      e.stopPropagation()
      try {
        await downloadDefaultOrbit(asset)
      } catch (error) {
        console.error('Failed to export default .orbit package:', error)
        window.alert(`Failed to export .orbit package: ${error.message || error}`)
      }
    })

    galleryGrid.appendChild(card)

    const canvas = card.querySelector('.asset-card__canvas')
    cardsToInit.push({ canvas, asset })
  })

  if (visibleCount === 0) {
    const noResults = document.createElement('div')
    noResults.className = 'no-results'
    noResults.textContent = 'No assets match your search.'
    galleryGrid.appendChild(noResults)
  }

  assetCountLabel.textContent = `${visibleCount} asset${visibleCount !== 1 ? 's' : ''}`

  // Initialize interactive 3D canvases after browser layout paint
  requestAnimationFrame(() => {
    cardsToInit.forEach(({ canvas, asset }) => {
      initCardViewport(canvas, asset)
    })
  })
}

// ── Direct Download Default Orbit ─────────────
async function downloadDefaultOrbit(asset) {
  const defaultExtras = {}
  if (asset.extras) {
    asset.extras.forEach((extra) => {
      defaultExtras[extra.id] = extra.value
    })
  }

  const orbitData = await buildOrbitExportData({
    asset,
    object: {
      type: asset.id,
      widthM: asset.width,
      depthM: asset.depth,
      heightM: asset.height,
      yawDeg: 0,
      colorHex: asset.colorPrimary,
      colorSecondaryHex: asset.colorSecondary,
    },
    extras: defaultExtras,
    resizable: {
      widthM: { min: 0.1, max: 5.0, step: 0.05, default: asset.width },
      depthM: { min: 0.1, max: 5.0, step: 0.05, default: asset.depth },
      heightM: { min: 0.1, max: 10.0, step: 0.05, default: asset.height },
    },
    exportMode: 'default',
  })

  triggerDownload(asset.id, orbitData)
}

function triggerDownload(assetId, orbitData) {
  const jsonStr = JSON.stringify(orbitData, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${assetId}_custom.orbit`
  link.click()
}

// ── Three.js Modal Preview Canvas Init ────────
function initPreviewThree() {
  if (previewRenderer) return

  const width = previewCanvas.clientWidth
  const height = previewCanvas.clientHeight

  previewScene = new THREE.Scene()
  syncSceneBg()

  previewCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  previewCamera.position.set(2, 2.2, 2.8)

  previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true })
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  previewRenderer.setSize(width, height, false)
  previewRenderer.shadowMap.enabled = true
  previewRenderer.toneMapping = THREE.ACESFilmicToneMapping
  previewRenderer.toneMappingExposure = 1.1

  previewControls = new OrbitControls(previewCamera, previewRenderer.domElement)
  previewControls.enableDamping = true
  previewControls.dampingFactor = 0.08
  previewControls.maxPolarAngle = Math.PI * 0.85
  previewControls.minDistance = 0.4
  previewControls.maxDistance = 15
  previewControls.target.set(0, 0.5, 0)
  previewControls.update()

  // High quality lighting setup
  previewScene.add(new THREE.AmbientLight(0xffffff, 0.75))

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
  dirLight.position.set(3, 6, 2.5)
  dirLight.castShadow = true
  previewScene.add(dirLight)

  const fillLight = new THREE.DirectionalLight(0x6366f1, 0.35)
  fillLight.position.set(-3, 2, -2.5)
  previewScene.add(fillLight)

  const rimLight = new THREE.DirectionalLight(0x22d3ee, 0.2)
  rimLight.position.set(0, 1, -4)
  previewScene.add(rimLight)
}

// ── Overlay Modal Open & Close ────────────────
function openPreviewModal(index) {
  activeAssetIndex = index
  const asset = ASSETS[index]

  previewLabel.textContent = asset.name

  // Reset shape customization state
  activeShapePoints = null
  activeDashPolylines = null

  // Show or hide shape customization options
  if (asset.id === 'grass' || asset.id === 'road') {
    groupShapeCustomizer.classList.remove('hidden')
  } else {
    groupShapeCustomizer.classList.add('hidden')
  }

  // Show container
  previewOverlay.classList.remove('hidden')

  // Initialize renderer on modal canvas if first time
  initPreviewThree()

  // Set default form values
  inputColorPrimary.value = asset.colorPrimary
  inputColorSecondary.value = asset.colorSecondary
  updateLabelTexts()

  // Build the secondary sliders for extra parameters
  buildExtraInputs(asset)

  // Draw 3D Asset
  renderPreviewAsset()

  // Position camera correctly
  resetPreviewCamera()

  // Force aspect ratio adjustments
  handleResize()
}

function closePreviewModal() {
  previewOverlay.classList.add('hidden')
  activeAssetIndex = null

  if (previewActiveGroup) {
    previewScene.remove(previewActiveGroup)
    previewActiveGroup.traverse((node) => {
      if (node.geometry) node.geometry.dispose()
      if (node.material && node.material !== primaryMaterial && node.material !== secondaryMaterial) {
        if (Array.isArray(node.material)) {
          node.material.forEach((m) => m.dispose())
        } else {
          node.material.dispose()
        }
      }
    })
    previewActiveGroup = null
  }
}

function resetPreviewCamera() {
  if (!previewControls || activeAssetIndex === null) return
  
  previewControls.reset()
  const asset = ASSETS[activeAssetIndex]
  const sizeY = asset.height
  const maxDim = Math.max(asset.width, asset.height, asset.depth)
  const fov = previewCamera.fov * (Math.PI / 180)
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
  
  let multiplier = 2.0
  let pitchAngle = 0.75
  let yawOffset = 0.9
  let rollOffset = 1.1
  
  if (sizeY < 0.3) {
    // Flat assets
    multiplier = 1.6
    pitchAngle = 1.3
    yawOffset = 0.5
    rollOffset = 0.8
  } else if (sizeY > 1.5 && sizeY > Math.max(asset.width, asset.depth) * 1.8) {
    // Tall assets
    multiplier = 1.5
    pitchAngle = 0.5
    yawOffset = 0.9
    rollOffset = 1.0
  }
  
  cameraZ *= multiplier
  previewCamera.position.set(cameraZ * yawOffset, cameraZ * pitchAngle, cameraZ * rollOffset)
  previewControls.target.set(0, sizeY / 2, 0)
  previewControls.update()
}

// ── Extra Inputs Builders ──────────────────────
function buildExtraInputs(asset) {
  extraParamsGroup.innerHTML = '<h3>Asset Details</h3>'

  if (!asset.extras || asset.extras.length === 0) {
    extraParamsGroup.classList.add('hidden')
    return
  }
  extraParamsGroup.classList.remove('hidden')

  asset.extras.forEach((extra) => {
    if (asset.id === 'cctv' && extra.id === 'cctv-type') {
      const row = document.createElement('div')
      row.className = 'control-row control-row--stacked'
      const options = getCctvTypeOptions()
      row.innerHTML = `
        <label>${extra.name}</label>
        <div class="cctv-type-picker" data-extra-picker="${extra.id}" data-selected-value="${extra.value}">
          ${options.map((option) => `
            <button
              type="button"
              class="cctv-type-picker__item"
              data-extra-option="${extra.id}"
              data-extra-value="${option.value}"
              aria-label="${option.label}"
              aria-pressed="${Number(extra.value) === option.value ? 'true' : 'false'}"
              title="${option.label}"
            >
              <img class="cctv-type-picker__image" src="${option.src}" alt="${option.label}" />
              <span class="cctv-type-picker__label">${option.label}</span>
            </button>
          `).join('')}
        </div>
      `
      const picker = row.querySelector(`[data-extra-picker="${extra.id}"]`)
      const optionButtons = [...row.querySelectorAll(`[data-extra-option="${extra.id}"]`)]
      const updateSelectionUi = (selectedValue) => {
        if (picker) {
          picker.dataset.selectedValue = String(selectedValue)
        }
        optionButtons.forEach((button) => {
          const isSelected = Number(button.dataset.extraValue) === Number(selectedValue)
          button.classList.toggle('is-selected', isSelected)
          button.setAttribute('aria-pressed', isSelected ? 'true' : 'false')
        })
      }
      optionButtons.forEach((button) => {
        button.addEventListener('click', () => {
          updateSelectionUi(Number(button.dataset.extraValue) || extra.value)
          renderPreviewAsset()
        })
      })
      updateSelectionUi(extra.value)
      extraParamsGroup.appendChild(row)
      return
    }

    if (asset.id === 'typography' && extra.id === 'typography-text') {
      const row = document.createElement('div')
      row.className = 'control-row control-row--stacked'
      row.innerHTML = `
        <label for="extra-${extra.id}">${extra.name}</label>
        <input
          type="text"
          id="extra-${extra.id}"
          class="text-input-control"
          maxlength="64"
          value="${String(extra.value || '').replace(/"/g, '&quot;')}"
          placeholder="Type here..."
        />
      `
      const input = row.querySelector('input')
      input.addEventListener('input', () => {
        renderPreviewAsset()
      })
      extraParamsGroup.appendChild(row)
      return
    }

    if (asset.id === 'signboard' && extra.id === 'signboard-type') {
      const row = document.createElement('div')
      row.className = 'control-row control-row--stacked'
      const options = getSignboardTypeOptions()
      row.innerHTML = `
        <label>${extra.name}</label>
        <div class="signboard-type-picker" data-extra-picker="${extra.id}" data-selected-value="${extra.value}">
          ${options.map((option) => `
            <button
              type="button"
              class="signboard-type-picker__item"
              data-extra-option="${extra.id}"
              data-extra-value="${option.value}"
              aria-label="${option.label}"
              aria-pressed="${Number(extra.value) === option.value ? 'true' : 'false'}"
              title="${option.label}"
            >
              <img class="signboard-type-picker__image" src="${option.src}" alt="${option.label}" />
              <span class="signboard-type-picker__label">${option.label}</span>
            </button>
          `).join('')}
        </div>
      `
      const picker = row.querySelector(`[data-extra-picker="${extra.id}"]`)
      const optionButtons = [...row.querySelectorAll(`[data-extra-option="${extra.id}"]`)]
      const updateSelectionUi = (selectedValue) => {
        if (picker) {
          picker.dataset.selectedValue = String(selectedValue)
        }
        optionButtons.forEach((button) => {
          const isSelected = Number(button.dataset.extraValue) === Number(selectedValue)
          button.classList.toggle('is-selected', isSelected)
          button.setAttribute('aria-pressed', isSelected ? 'true' : 'false')
        })
      }
      optionButtons.forEach((button) => {
        button.addEventListener('click', () => {
          updateSelectionUi(Number(button.dataset.extraValue) || extra.value)
          renderPreviewAsset()
        })
      })
      updateSelectionUi(extra.value)
      extraParamsGroup.appendChild(row)
      return
    }

    const row = document.createElement('div')
    row.className = 'control-row'
    row.innerHTML = `
      <label for="extra-${extra.id}">${extra.name}</label>
      <input type="range" id="extra-${extra.id}" min="${extra.min}" max="${extra.max}" step="${extra.step}" value="${extra.value}" />
      <span class="param-val" id="val-extra-${extra.id}">${extra.value}</span>
    `

    const input = row.querySelector('input')
    const valDisplay = row.querySelector('.param-val')
    input.addEventListener('input', () => {
      valDisplay.textContent = Number(input.value).toFixed(2)
      renderPreviewAsset()
    })
    extraParamsGroup.appendChild(row)
  })
}

function gatherExtras(asset) {
  const extrasData = {}
  if (asset.extras) {
    asset.extras.forEach((extra) => {
      if (asset.id === 'signboard' && extra.id === 'signboard-type') {
        const picker = document.querySelector(`[data-extra-picker="${extra.id}"]`)
        extrasData[extra.id] = picker ? Number(picker.dataset.selectedValue) || extra.value : extra.value
        return
      }
      if (asset.id === 'cctv' && extra.id === 'cctv-type') {
        const picker = document.querySelector(`[data-extra-picker="${extra.id}"]`)
        extrasData[extra.id] = picker ? Number(picker.dataset.selectedValue) || extra.value : extra.value
        return
      }
      if (asset.id === 'typography' && extra.id === 'typography-text') {
        const input = document.querySelector(`#extra-${extra.id}`)
        extrasData[extra.id] = input ? String(input.value || '').trim().slice(0, 64) : String(extra.value || '')
        return
      }
      const el = document.querySelector(`#extra-${extra.id}`)
      extrasData[extra.id] = el ? Number(el.value) : extra.value
    })
  }
  return extrasData
}

// ── Render active customized asset ────────────
function renderPreviewAsset() {
  if (activeAssetIndex === null || !previewScene) return

  if (previewActiveGroup) {
    previewScene.remove(previewActiveGroup)
    previewActiveGroup.traverse((node) => {
      if (node.geometry) node.geometry.dispose()
      if (node.material && node.material !== primaryMaterial && node.material !== secondaryMaterial) {
        if (Array.isArray(node.material)) {
          node.material.forEach((m) => m.dispose())
        } else {
          node.material.dispose()
        }
      }
    })
  }

  const asset = ASSETS[activeAssetIndex]

  primaryMaterial.color.set(inputColorPrimary.value)
  secondaryMaterial.color.set(inputColorSecondary.value)

  const extrasData = gatherExtras(asset)
  if (activeShapePoints) {
    extrasData.shapePoints = activeShapePoints
  }
  if (activeDashPolylines) {
    extrasData.dashPolylines = activeDashPolylines
  }

  previewActiveGroup = asset.build(
    {
      width: asset.width,
      depth: asset.depth,
      height: asset.height,
      extras: extrasData,
    },
    primaryMaterial,
    secondaryMaterial,
  )

  previewActiveGroup.position.y = 0.01
  previewScene.add(previewActiveGroup)
}

// ── Download Customized Payload ──────────────
async function downloadCustomizedOrbit() {
  if (activeAssetIndex === null) return

  const asset = ASSETS[activeAssetIndex]
  const extrasData = gatherExtras(asset)
  
  if (activeShapePoints) {
    extrasData.shapePoints = activeShapePoints
  }
  if (activeDashPolylines) {
    extrasData.dashPolylines = activeDashPolylines
  }

  let widthM = asset.width
  let depthM = asset.depth
  if (activeShapePoints) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const p of activeShapePoints) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minZ = Math.min(minZ, p.z)
      maxZ = Math.max(maxZ, p.z)
    }
    widthM = Math.max(0.1, Number((maxX - minX).toFixed(3)))
    depthM = Math.max(0.1, Number((maxZ - minZ).toFixed(3)))
  }

  const orbitData = await buildOrbitExportData({
    asset,
    object: {
      type: asset.id,
      widthM,
      depthM,
      heightM: asset.height,
      yawDeg: 0,
      colorHex: inputColorPrimary.value,
      colorSecondaryHex: inputColorSecondary.value,
    },
    extras: extrasData,
    resizable: {
      widthM: { min: 0.1, max: 15.0, step: 0.05, default: widthM },
      depthM: { min: 0.1, max: 15.0, step: 0.05, default: depthM },
      heightM: { min: 0.1, max: 10.0, step: 0.05, default: asset.height },
    },
    exportMode: 'customized',
  })

  triggerDownload(asset.id, orbitData)
}

// ── Sync UI Text & Background colors ───────────
function updateLabelTexts() {
  hexColorPrimary.textContent = inputColorPrimary.value.toUpperCase()
  hexColorSecondary.textContent = inputColorSecondary.value.toUpperCase()
}

function syncSceneBg() {
  const style = getComputedStyle(document.documentElement)
  const bgHex = style.getPropertyValue('--scene-bg').trim()
  if (bgHex && previewScene) {
    previewScene.background = new THREE.Color(bgHex)
  }
}

function toggleTheme() {
  isDayTheme = !isDayTheme
  document.documentElement.setAttribute('data-theme', isDayTheme ? 'day' : '')
  themeIconMoon.classList.toggle('hidden', isDayTheme)
  themeIconSun.classList.toggle('hidden', !isDayTheme)
  requestAnimationFrame(syncSceneBg)
}

function handleResize() {
  // Resize card viewports
  cardViewports.forEach((vp) => {
    const canvas = vp.canvas
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (canvas.width !== width || canvas.height !== height) {
      vp.camera.aspect = width / height
      vp.camera.updateProjectionMatrix()
      vp.renderer.setSize(width, height, false)
    }
  })

  // Resize main overlay canvas
  if (previewRenderer && previewCamera && previewCanvas) {
    const w = previewCanvas.clientWidth
    const h = previewCanvas.clientHeight
    previewCamera.aspect = w / h
    previewCamera.updateProjectionMatrix()
    previewRenderer.setSize(w, h, false)
  }
}

// ── Bind Listeners ─────────────────────────────
function bindListeners() {
  const onColorInput = () => {
    updateLabelTexts()
    renderPreviewAsset()
  }

  inputColorPrimary.addEventListener('input', onColorInput)
  inputColorSecondary.addEventListener('input', onColorInput)

  previewCloseBtn.addEventListener('click', closePreviewModal)
  previewResetCamBtn.addEventListener('click', resetPreviewCamera)
  downloadOrbitBtn.addEventListener('click', async () => {
    try {
      await downloadCustomizedOrbit()
    } catch (error) {
      console.error('Failed to export customized .orbit package:', error)
      window.alert(`Failed to export .orbit package: ${error.message || error}`)
    }
  })
  themeToggleBtn.addEventListener('click', toggleTheme)
  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.asset-card')) {
      return
    }
    setActiveCardViewport(null)
  })
  document.addEventListener('wheel', (event) => {
    if (!activeCardViewport?.card) {
      return
    }
    if (event.target.closest('.asset-card') === activeCardViewport.card) {
      return
    }
    setActiveCardViewport(null)
  }, { passive: true })
  layoutSelector?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-layout-mode]')
    if (!button) {
      return
    }
    const nextLayoutMode = button.dataset.layoutMode
    if (!AVAILABLE_LAYOUT_MODES.has(nextLayoutMode) || nextLayoutMode === activeLayoutMode) {
      return
    }
    applyLayoutMode(nextLayoutMode)
    buildAssetList()
  })

  btnDrawShape.addEventListener('click', async () => {
    if (activeAssetIndex === null) return
    const asset = ASSETS[activeAssetIndex]
    const result = await openShapeEditor(asset.id, activeShapePoints, activeDashPolylines)
    if (result) {
      if (asset.id === 'grass') {
        activeShapePoints = result
        activeDashPolylines = null
      } else {
        activeShapePoints = result.shapePoints
        activeDashPolylines = result.dashPolylines
      }
      renderPreviewAsset()
      resetPreviewCamera()
    }
  })

  searchInput.addEventListener('input', () => {
    buildAssetList()
  })

  window.addEventListener('resize', handleResize)
}

// ── Unified Animation Loop ─────────────────────
function animate() {
  requestAnimationFrame(animate)
  const blinkPhase = (Math.sin(performance.now() * 0.008) + 1) * 0.5
  const ledIntensity = 0.2 + (blinkPhase * 1.4)

  // Update OrbitControls & render each active mini container
  cardViewports.forEach((vp) => {
    if (vp.controls) vp.controls.update()
    if (vp.group) {
      vp.group.traverse((node) => {
        if (node?.userData?.blinkingLed && node.material?.emissive) {
          node.material.emissiveIntensity = ledIntensity
        }
      })
    }
    if (vp.renderer && vp.scene && vp.camera) {
      vp.renderer.render(vp.scene, vp.camera)
    }
  })

  // Update OrbitControls & render the full preview modal if open
  if (previewOverlay && !previewOverlay.classList.contains('hidden')) {
    if (previewControls) previewControls.update()
    if (previewActiveGroup) {
      previewActiveGroup.traverse((node) => {
        if (node?.userData?.blinkingLed && node.material?.emissive) {
          node.material.emissiveIntensity = ledIntensity
        }
      })
    }
    if (previewRenderer && previewScene && previewCamera) {
      previewRenderer.render(previewScene, previewCamera)
    }
  }
}

// ── SVG Shape Editor Modal Controller ────────────
function openShapeEditor(assetId, initialShapePoints, initialDashPolylines) {
  return new Promise((resolve) => {
    shapeDrawOverlay.classList.remove('hidden')
    shapeDrawTitle.textContent = assetId === 'grass' ? 'Draw Grass Shape' : 'Draw Road Shape'
    shapeDrawContainer.innerHTML = ''

    const editorSize = assetId === 'road'
      ? { width: 440, height: 280, padding: 18, pixelsPerMeter: 26 }
      : { width: 420, height: 280, padding: 18, pixelsPerMeter: 30 }

    const center = { x: editorSize.width / 2, y: editorSize.height / 2 }
    const minX = editorSize.padding
    const maxX = editorSize.width - editorSize.padding
    const minY = editorSize.padding
    const maxY = editorSize.height - editorSize.padding

    const editorState = { points: [] }
    const dashEditorState = { polylines: [], activeLineIndex: 0 }
    let shapeScale = editorSize.pixelsPerMeter
    let shapeCenterX = 0
    let shapeCenterZ = 0

    function clampPoint(point) {
      return {
        x: Math.min(maxX, Math.max(minX, point.x)),
        y: Math.min(maxY, Math.max(minY, point.y)),
      }
    }

    function distanceToSegment(point, a, b) {
      const abX = b.x - a.x
      const abY = b.y - a.y
      const abLenSq = (abX * abX) + (abY * abY)
      if (abLenSq <= 0.000001) {
        return {
          distance: Math.hypot(point.x - a.x, point.y - a.y),
          projectedPoint: { x: a.x, y: a.y },
        }
      }
      const t = Math.min(1, Math.max(0, (((point.x - a.x) * abX) + ((point.y - a.y) * abY)) / abLenSq))
      const projectedPoint = { x: a.x + (abX * t), y: a.y + (abY * t) }
      return {
        distance: Math.hypot(point.x - projectedPoint.x, point.y - projectedPoint.y),
        projectedPoint,
      }
    }

    function toWorldPoints(points) {
      return points.map((point) => ({
        x: (point.x - center.x) / editorSize.pixelsPerMeter,
        z: (center.y - point.y) / editorSize.pixelsPerMeter,
      }))
    }

    function computeCentroid(points) {
      const centroid = points.reduce(
        (acc, point) => ({ x: acc.x + point.x, z: acc.z + point.z }),
        { x: 0, z: 0 }
      )
      centroid.x /= Math.max(points.length, 1)
      centroid.z /= Math.max(points.length, 1)
      return centroid
    }

    function getShapeArea(points) {
      let sum = 0
      for (let i = 0; i < points.length; i += 1) {
        const current = points[i]
        const next = points[(i + 1) % points.length]
        sum += (current.x * next.z) - (next.x * current.z)
      }
      return Math.abs(sum) / 2
    }

    function orientation(a, b, c) {
      const value = ((b.y - a.y) * (c.x - b.x)) - ((b.x - a.x) * (c.y - b.y))
      if (Math.abs(value) < 0.000001) {
        return 0
      }
      return value > 0 ? 1 : 2
    }

    // Intersection utilities
    function onSegment(a, b, c) {
      return (
        b.x <= Math.max(a.x, c.x) + 0.000001 &&
        b.x + 0.000001 >= Math.min(a.x, c.x) &&
        b.y <= Math.max(a.y, c.y) + 0.000001 &&
        b.y + 0.000001 >= Math.min(a.y, c.y)
      )
    }

    function doSegmentsIntersect(p1, q1, p2, q2) {
      const o1 = orientation(p1, q1, p2)
      const o2 = orientation(p1, q1, q2)
      const o3 = orientation(p2, q2, p1)
      const o4 = orientation(p2, q2, q1)
      if ((o1 !== o2) && (o3 !== o4)) {
        return true
      }
      if (o1 === 0 && onSegment(p1, p2, q1)) return true
      if (o2 === 0 && onSegment(p1, q2, q1)) return true
      if (o3 === 0 && onSegment(p2, p1, q2)) return true
      if (o4 === 0 && onSegment(p2, q1, q2)) return true
      return false
    }

    function isAdjacentEdge(i, j, edgeCount) {
      if (i === j) {
        return true
      }
      if (Math.abs(i - j) === 1) {
        return true
      }
      return (i === 0 && j === (edgeCount - 1)) || (j === 0 && i === (edgeCount - 1))
    }

    function hasSelfIntersection(points) {
      if (!Array.isArray(points) || points.length < 4) {
        return false
      }
      const edgeCount = points.length
      for (let i = 0; i < edgeCount; i += 1) {
        const a1 = points[i]
        const a2 = points[(i + 1) % edgeCount]
        for (let j = i + 1; j < edgeCount; j += 1) {
          if (isAdjacentEdge(i, j, edgeCount)) {
            continue
          }
          const b1 = points[j]
          const b2 = points[(j + 1) % edgeCount]
          if (doSegmentsIntersect(a1, a2, b1, b2)) {
            return true
          }
        }
      }
      return false
    }

    function isPointInsidePolygon(point, polygon) {
      let inside = false
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
        const a = polygon[i]
        const b = polygon[j]
        const intersects = ((a.y > point.y) !== (b.y > point.y)) &&
          (point.x < (((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 0.000001)) + a.x)
        if (intersects) {
          inside = !inside
        }
      }
      return inside
    }

    function toEditorPointFromLocal(point) {
      return clampPoint({
        x: center.x + ((point.x - shapeCenterX) * shapeScale),
        y: center.y - ((point.z - shapeCenterZ) * shapeScale),
      })
    }

    // Set initial editor points
    if (assetId === 'grass') {
      const defaultHalfWidth = 90
      const defaultHalfHeight = 70
      if (!initialShapePoints || initialShapePoints.length < 3) {
        editorState.points = [
          { x: center.x - defaultHalfWidth, y: center.y - defaultHalfHeight },
          { x: center.x + defaultHalfWidth, y: center.y - defaultHalfHeight },
          { x: center.x + defaultHalfWidth, y: center.y + defaultHalfHeight },
          { x: center.x - defaultHalfWidth, y: center.y + defaultHalfHeight },
        ]
      } else {
        const parsed = initialShapePoints.map(p => ({ x: Number(p.x), z: Number(p.z) }))
        let minX_ = Infinity, maxX_ = -Infinity, minZ_ = Infinity, maxZ_ = -Infinity
        for (const p of parsed) {
          minX_ = Math.min(minX_, p.x); maxX_ = Math.max(maxX_, p.x)
          minZ_ = Math.min(minZ_, p.z); maxZ_ = Math.max(maxZ_, p.z)
        }
        const shapeWidth = Math.max(0.001, maxX_ - minX_)
        const shapeDepth = Math.max(0.001, maxZ_ - minZ_)
        const maxEditorWidth = editorSize.width - (editorSize.padding * 2)
        const maxEditorHeight = editorSize.height - (editorSize.padding * 2)
        const scale = Math.min(maxEditorWidth / shapeWidth, maxEditorHeight / shapeDepth, editorSize.pixelsPerMeter * 1.1)
        const sCenterX = (minX_ + maxX_) / 2
        const sCenterZ = (minZ_ + maxZ_) / 2
        editorState.points = parsed.map(p => clampPoint({
          x: center.x + ((p.x - sCenterX) * scale),
          y: center.y - ((p.z - sCenterZ) * scale),
        }))
      }
    } else {
      const fallback = [
        { x: center.x - 70, y: center.y - 110 },
        { x: center.x + 70, y: center.y - 110 },
        { x: center.x + 70, y: center.y + 110 },
        { x: center.x - 70, y: center.y + 110 },
      ]
      if (!initialShapePoints || initialShapePoints.length < 3) {
        editorState.points = fallback
        shapeScale = editorSize.pixelsPerMeter
        shapeCenterX = 0
        shapeCenterZ = 0
      } else {
        const parsed = initialShapePoints.map(p => ({ x: Number(p.x), z: Number(p.z) }))
        let minShapeX = Infinity, maxShapeX = -Infinity, minShapeZ = Infinity, maxShapeZ = -Infinity
        for (const point of parsed) {
          minShapeX = Math.min(minShapeX, point.x); maxShapeX = Math.max(maxShapeX, point.x)
          minShapeZ = Math.min(minShapeZ, point.z); maxShapeZ = Math.max(maxShapeZ, point.z)
        }
        const shapeWidth = Math.max(0.001, maxShapeX - minShapeX)
        const shapeDepth = Math.max(0.001, maxShapeZ - minShapeZ)
        const maxEditorWidth = editorSize.width - (editorSize.padding * 2)
        const maxEditorHeight = editorSize.height - (editorSize.padding * 2)
        shapeScale = Math.min(maxEditorWidth / shapeWidth, maxEditorHeight / shapeDepth, editorSize.pixelsPerMeter * 1.1)
        shapeCenterX = (minShapeX + maxShapeX) / 2
        shapeCenterZ = (minShapeZ + maxShapeZ) / 2
        editorState.points = parsed.map(point => toEditorPointFromLocal(point))
      }

      if (initialDashPolylines && Array.isArray(initialDashPolylines)) {
        for (const polyline of initialDashPolylines) {
          if (!Array.isArray(polyline) || polyline.length < 2) continue
          const mapped = polyline
            .map(point => toEditorPointFromLocal(point))
            .filter(point => isPointInsidePolygon(point, editorState.points))
          if (mapped.length >= 2) {
            dashEditorState.polylines.push(mapped)
          }
        }
      }
    }

    // Insert Layout HTML
    if (assetId === 'grass') {
      shapeDrawContainer.innerHTML = `
        <div class="grass-shape-editor">
          <div class="road-shape-editor__mini-actions">
            <button id="grass-shape-undo" type="button" class="road-shape-editor__mini-button road-shape-editor__mini-button--icon" title="Undo" aria-label="Undo">
              <span class="history-icon history-icon--undo history-icon--mini" aria-hidden="true">⤺</span>
            </button>
            <button id="grass-shape-redo" type="button" class="road-shape-editor__mini-button road-shape-editor__mini-button--icon" title="Redo" aria-label="Redo">
              <span class="history-icon history-icon--redo history-icon--mini" aria-hidden="true">⤻</span>
            </button>
          </div>
          <svg class="grass-shape-editor__canvas" viewBox="0 0 ${editorSize.width} ${editorSize.height}" preserveAspectRatio="none">
            <rect class="grass-shape-editor__grid-bg" x="0" y="0" width="${editorSize.width}" height="${editorSize.height}"></rect>
            <path class="grass-shape-editor__shape-fill"></path>
            <path class="grass-shape-editor__shape-stroke"></path>
            <g class="grass-shape-editor__handles"></g>
          </svg>
          <p class="grass-shape-editor__hint">Tip: drag a handle, or drag any border line to add and move a new border point.</p>
        </div>
      `
    } else {
      shapeDrawContainer.innerHTML = `
        <div class="road-shape-editor">
          <div class="road-shape-editor__mini-actions">
            <button id="road-shape-undo" type="button" class="road-shape-editor__mini-button road-shape-editor__mini-button--icon" title="Undo" aria-label="Undo">
              <span class="history-icon history-icon--undo history-icon--mini" aria-hidden="true">⤺</span>
            </button>
            <button id="road-shape-redo" type="button" class="road-shape-editor__mini-button road-shape-editor__mini-button--icon" title="Redo" aria-label="Redo">
              <span class="history-icon history-icon--redo history-icon--mini" aria-hidden="true">⤻</span>
            </button>
            <button id="road-add-dash-line" type="button" class="road-shape-editor__mini-button">+ Dash Line</button>
          </div>
          <svg class="road-shape-editor__canvas" viewBox="0 0 ${editorSize.width} ${editorSize.height}" preserveAspectRatio="none">
            <rect class="road-shape-editor__grid-bg" x="0" y="0" width="${editorSize.width}" height="${editorSize.height}"></rect>
            <path class="road-shape-editor__shape-fill"></path>
            <path class="road-shape-editor__shape-stroke"></path>
            <g class="road-shape-editor__dash-guides"></g>
            <g class="road-shape-editor__shape-handles"></g>
            <g class="road-shape-editor__dash-handles"></g>
          </svg>
          <p class="road-shape-editor__hint">Drag road points, add dash lines, and click OK once to save.</p>
        </div>
      `
    }

    const svg = shapeDrawContainer.querySelector(assetId === 'grass' ? '.grass-shape-editor__canvas' : '.road-shape-editor__canvas')
    const fillPath = shapeDrawContainer.querySelector(assetId === 'grass' ? '.grass-shape-editor__shape-fill' : '.road-shape-editor__shape-fill')
    const strokePath = shapeDrawContainer.querySelector(assetId === 'grass' ? '.grass-shape-editor__shape-stroke' : '.road-shape-editor__shape-stroke')
    const shapeHandlesGroup = shapeDrawContainer.querySelector(assetId === 'grass' ? '.grass-shape-editor__handles' : '.road-shape-editor__shape-handles')
    
    // Road exclusive elements
    const dashGuides = shapeDrawContainer.querySelector('.road-shape-editor__dash-guides')
    const dashHandlesGroup = shapeDrawContainer.querySelector('.road-shape-editor__dash-handles')
    const addDashLineButton = shapeDrawContainer.querySelector('#road-add-dash-line')

    const undoShapeButton = shapeDrawContainer.querySelector(assetId === 'grass' ? '#grass-shape-undo' : '#road-shape-undo')
    const redoShapeButton = shapeDrawContainer.querySelector(assetId === 'grass' ? '#grass-shape-redo' : '#road-shape-redo')

    let activePointerId = null
    let draggingShapeIndex = -1
    let draggingDashIndex = -1
    let draggingDashLineIndex = -1
    let dragStartSnapshot = null
    const historyStack = []
    let historyIndex = -1

    function clonePoints(points) {
      return points.map((point) => ({ x: point.x, y: point.y }))
    }

    function clonePolylines(polylines) {
      return polylines.map((polyline) => clonePoints(polyline))
    }

    function snapshotEditor() {
      if (assetId === 'grass') {
        return { points: clonePoints(editorState.points) }
      }
      return {
        points: clonePoints(editorState.points),
        polylines: clonePolylines(dashEditorState.polylines),
        activeLineIndex: dashEditorState.activeLineIndex,
      }
    }

    function areSnapshotsEqual(left, right) {
      return JSON.stringify(left) === JSON.stringify(right)
    }

    function updateHistoryButtons() {
      undoShapeButton.disabled = historyIndex <= 0
      redoShapeButton.disabled = historyIndex >= historyStack.length - 1
    }

    function restoreFromSnapshot(snapshot) {
      editorState.points = clonePoints(snapshot.points)
      if (assetId === 'road') {
        dashEditorState.polylines = clonePolylines(snapshot.polylines)
        const maxIndex = Math.max(0, dashEditorState.polylines.length - 1)
        dashEditorState.activeLineIndex = Math.min(maxIndex, Math.max(0, snapshot.activeLineIndex || 0))
      }
      renderEditor()
      updateHistoryButtons()
    }

    function pushHistorySnapshot() {
      const nextSnapshot = snapshotEditor()
      const current = historyStack[historyIndex]
      if (current && areSnapshotsEqual(current, nextSnapshot)) {
        return
      }
      historyStack.splice(historyIndex + 1)
      historyStack.push(nextSnapshot)
      historyIndex = historyStack.length - 1
      updateHistoryButtons()
    }

    function undoShapeEdit() {
      if (historyIndex <= 0) return
      historyIndex -= 1
      restoreFromSnapshot(historyStack[historyIndex])
    }

    function redoShapeEdit() {
      if (historyIndex >= historyStack.length - 1) return
      historyIndex += 1
      restoreFromSnapshot(historyStack[historyIndex])
    }

    function getPointerPoint(event) {
      const rect = svg.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * editorSize.width
      const y = ((event.clientY - rect.top) / Math.max(rect.height, 1)) * editorSize.height
      return clampPoint({ x, y })
    }

    function stopDrag() {
      activePointerId = null
      draggingShapeIndex = -1
      draggingDashIndex = -1
      draggingDashLineIndex = -1
    }

    function startShapeDrag(event, index) {
      dragStartSnapshot = snapshotEditor()
      draggingShapeIndex = index
      activePointerId = event.pointerId
      if (typeof svg.setPointerCapture === 'function') {
        svg.setPointerCapture(event.pointerId)
      }
    }

    function startDashDrag(event, lineIndex, pointIndex) {
      dragStartSnapshot = snapshotEditor()
      draggingDashLineIndex = lineIndex
      draggingDashIndex = pointIndex
      activePointerId = event.pointerId
      if (typeof svg.setPointerCapture === 'function') {
        svg.setPointerCapture(event.pointerId)
      }
    }

    // Spline curve algorithms
    function sampleCatmullRom2D(points, segmentSamples = 14, closed = false) {
      if (!Array.isArray(points) || points.length === 0) return []
      if (points.length < 3) return points.map((point) => ({ x: point.x, y: point.y }))
      const sampled = []
      const segmentCount = closed ? points.length : points.length - 1
      for (let i = 0; i < segmentCount; i += 1) {
        const p0 = points[(i - 1 + points.length) % points.length]
        const p1 = points[i % points.length]
        const p2 = points[(i + 1) % points.length]
        const p3 = points[(i + 2) % points.length]
        const startJ = i === 0 ? 0 : 1
        for (let j = startJ; j <= segmentSamples; j += 1) {
          const t = j / segmentSamples
          const t2 = t * t
          const t3 = t2 * t
          const x = 0.5 * (
            (2 * p1.x) +
            ((-p0.x + p2.x) * t) +
            (((2 * p0.x) - (5 * p1.x) + (4 * p2.x) - p3.x) * t2) +
            ((-p0.x + (3 * p1.x) - (3 * p2.x) + p3.x) * t3)
          )
          const y = 0.5 * (
            (2 * p1.y) +
            ((-p0.y + p2.y) * t) +
            (((2 * p0.y) - (5 * p1.y) + (4 * p2.y) - p3.y) * t2) +
            ((-p0.y + (3 * p1.y) - (3 * p2.y) + p3.y) * t3)
          )
          sampled.push({ x, y })
        }
      }
      return sampled
    }

    function buildSmoothPathD(polyline, options = {}) {
      const closed = Boolean(options.closed)
      if (!Array.isArray(polyline) || polyline.length === 0) return ''
      if (polyline.length < 3) {
        const path = polyline
          .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
          .join(' ')
        return closed ? `${path} Z` : path
      }
      let smoothPoints
      if (closed) {
        const rounded = []
        const cornerRatio = 0.16
        const cornerSamples = 4
        for (let i = 0; i < polyline.length; i += 1) {
          const prev = polyline[(i - 1 + polyline.length) % polyline.length]
          const curr = polyline[i]
          const next = polyline[(i + 1) % polyline.length]
          const prevVec = { x: prev.x - curr.x, y: prev.y - curr.y }
          const nextVec = { x: next.x - curr.x, y: next.y - curr.y }
          const prevLen = Math.hypot(prevVec.x, prevVec.y)
          const nextLen = Math.hypot(nextVec.x, nextVec.y)
          if (prevLen <= 0.0001 || nextLen <= 0.0001) {
            rounded.push({ x: curr.x, y: curr.y })
            continue
          }
          const offset = Math.min(18, Math.max(2.8, Math.min(prevLen, nextLen) * cornerRatio))
          const inPoint = {
            x: curr.x + ((prevVec.x / prevLen) * offset),
            y: curr.y + ((prevVec.y / prevLen) * offset),
          }
          const outPoint = {
            x: curr.x + ((nextVec.x / nextLen) * offset),
            y: curr.y + ((nextVec.y / nextLen) * offset),
          }
          rounded.push(inPoint)
          for (let s = 1; s <= cornerSamples; s += 1) {
            const t = s / (cornerSamples + 1)
            const inv = 1 - t
            rounded.push({
              x: (inv * inv * inPoint.x) + (2 * inv * t * curr.x) + (t * t * outPoint.x),
              y: (inv * inv * inPoint.y) + (2 * inv * t * curr.y) + (t * t * outPoint.y),
            })
          }
          rounded.push(outPoint)
        }
        smoothPoints = rounded
      } else {
        smoothPoints = sampleCatmullRom2D(polyline, 14, false)
      }
      const path = smoothPoints
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ')
      return closed ? `${path} Z` : path
    }

    function buildPolygonPathD(polyline) {
      if (!Array.isArray(polyline) || polyline.length === 0) return ''
      const path = polyline
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ')
      return `${path} Z`
    }

    function renderEditor() {
      if (assetId === 'grass') {
        const closedPath = buildPolygonPathD(editorState.points)
        fillPath.setAttribute('d', closedPath)
        strokePath.setAttribute('d', closedPath)
        shapeHandlesGroup.innerHTML = editorState.points
          .map((point, index) => `<circle class="grass-shape-editor__handle" data-point-index="${index}" cx="${point.x}" cy="${point.y}" r="5.2"></circle>`)
          .join('')
      } else {
        const closedPath = buildSmoothPathD(editorState.points, { closed: true })
        fillPath.setAttribute('d', closedPath)
        strokePath.setAttribute('d', closedPath)

        dashGuides.innerHTML = dashEditorState.polylines
          .map((polyline, lineIndex) => {
            const pathD = buildSmoothPathD(polyline)
            const activeClass = lineIndex === dashEditorState.activeLineIndex
              ? 'road-shape-editor__guide-line road-shape-editor__guide-line--active'
              : 'road-shape-editor__guide-line road-shape-editor__guide-line--inactive'
            return `<path class="${activeClass}" data-line-index="${lineIndex}" d="${pathD}"></path>`
          })
          .join('')

        shapeHandlesGroup.innerHTML = editorState.points
          .map((point, index) => `<circle class="road-shape-editor__handle" data-handle-type="shape" data-point-index="${index}" cx="${point.x}" cy="${point.y}" r="5.3"></circle>`)
          .join('')

        const activePolyline = dashEditorState.polylines[dashEditorState.activeLineIndex] || []
        dashHandlesGroup.innerHTML = activePolyline
          .map((point, index) => `<circle class="road-shape-editor__handle" data-handle-type="dash" data-line-index="${dashEditorState.activeLineIndex}" data-point-index="${index}" cx="${point.x}" cy="${point.y}" r="4.8"></circle>`)
          .join('')
      }
    }

    function tryInsertShapePoint(pointerPoint) {
      let nearestSegment = null
      for (let i = 0; i < editorState.points.length; i += 1) {
        const a = editorState.points[i]
        const b = editorState.points[(i + 1) % editorState.points.length]
        const candidate = distanceToSegment(pointerPoint, a, b)
        if (!nearestSegment || candidate.distance < nearestSegment.distance) {
          nearestSegment = { ...candidate, insertIndex: i + 1 }
        }
      }
      const insertLimit = assetId === 'grass' ? 20 : 14
      if (!nearestSegment || nearestSegment.distance > insertLimit) {
        return -1
      }
      const insertAt = Math.min(editorState.points.length, nearestSegment.insertIndex)
      const candidatePoints = [...editorState.points]
      candidatePoints.splice(insertAt, 0, clampPoint(nearestSegment.projectedPoint))
      if (assetId === 'road' && hasSelfIntersection(candidatePoints)) {
        return -1
      }
      editorState.points.splice(insertAt, 0, clampPoint(nearestSegment.projectedPoint))
      renderEditor()
      return insertAt
    }

    function tryInsertDashPoint(pointerPoint) {
      const activePolyline = dashEditorState.polylines[dashEditorState.activeLineIndex] || []
      if (activePolyline.length < 2) return false
      let nearestSegment = null
      for (let i = 0; i + 1 < activePolyline.length; i += 1) {
        const a = activePolyline[i]
        const b = activePolyline[i + 1]
        const candidate = distanceToSegment(pointerPoint, a, b)
        if (!nearestSegment || candidate.distance < nearestSegment.distance) {
          nearestSegment = { ...candidate, insertIndex: i + 1 }
        }
      }
      if (!nearestSegment || nearestSegment.distance > 12) return false
      const projected = clampPoint(nearestSegment.projectedPoint)
      if (!isPointInsidePolygon(projected, editorState.points)) return false
      activePolyline.splice(nearestSegment.insertIndex, 0, projected)
      renderEditor()
      pushHistorySnapshot()
      return true
    }

    function getIntersectionsAtY(points, y) {
      const intersections = []
      for (let i = 0; i < points.length; i += 1) {
        const a = points[i]
        const b = points[(i + 1) % points.length]
        const minEdgeY = Math.min(a.y, b.y)
        const maxEdgeY = Math.max(a.y, b.y)
        const crosses = (y >= minEdgeY) && (y < maxEdgeY)
        if (!crosses) continue
        const t = (y - a.y) / ((b.y - a.y) || 0.000001)
        intersections.push(a.x + ((b.x - a.x) * t))
      }
      intersections.sort((left, right) => left - right)
      return intersections
    }

    function buildVerticalCenterDashPolyline(laneBias = 0) {
      const points = editorState.points
      let minShapeY = Infinity, maxShapeY = -Infinity
      for (const point of points) {
        minShapeY = Math.min(minShapeY, point.y)
        maxShapeY = Math.max(maxShapeY, point.y)
      }
      const spanY = Math.max(40, maxShapeY - minShapeY)
      const yPadding = Math.min(36, spanY * 0.2)
      const startY = minShapeY + yPadding
      const endY = maxShapeY - yPadding
      const sampleCount = 44
      const sampled = []
      for (let i = 0; i <= sampleCount; i += 1) {
        const t = i / sampleCount
        const y = startY + ((endY - startY) * t)
        const intersections = getIntersectionsAtY(points, y)
        let widest = null
        for (let j = 0; j + 1 < intersections.length; j += 2) {
          const leftX = intersections[j]
          const rightX = intersections[j + 1]
          const width = rightX - leftX
          if (width <= 0.01) continue
          if (!widest || width > widest.width) {
            widest = { centerX: (leftX + rightX) * 0.5, width }
          }
        }
        if (!widest) continue
        const x = widest.centerX + (widest.width * laneBias)
        const point = clampPoint({ x, y })
        if (isPointInsidePolygon(point, points)) {
          sampled.push(point)
        }
      }
      if (sampled.length < 2) return createFallbackDashPolyline(laneBias)
      const pickIndexes = [0, 0.33, 0.66, 1].map((t) => Math.round(t * (sampled.length - 1)))
      const reduced = []
      for (const index of pickIndexes) {
        const point = sampled[index]
        const previous = reduced[reduced.length - 1]
        if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > 0.5) {
          reduced.push(point)
        }
      }
      return reduced.length >= 2 ? reduced : createFallbackDashPolyline(laneBias)
    }

    function createFallbackDashPolyline(laneBias = 0) {
      let minShapeX = Infinity, maxShapeX = -Infinity, minShapeY = Infinity, maxShapeY = -Infinity
      for (const point of editorState.points) {
        minShapeX = Math.min(minShapeX, point.x)
        maxShapeX = Math.max(maxShapeX, point.x)
        minShapeY = Math.min(minShapeY, point.y)
        maxShapeY = Math.max(maxShapeY, point.y)
      }
      const shapeWidth = Math.max(1, maxShapeX - minShapeX)
      const centerX = ((minShapeX + maxShapeX) * 0.5) + (shapeWidth * laneBias * 0.28)
      const spanY = Math.max(40, maxShapeY - minShapeY)
      const yPadding = Math.min(36, spanY * 0.2)
      const startPoint = clampPoint({ x: centerX, y: minShapeY + yPadding })
      const endPoint = clampPoint({ x: centerX, y: maxShapeY - yPadding })
      return [startPoint, endPoint].filter((point) => isPointInsidePolygon(point, editorState.points))
    }

    function handlePointerDown(event) {
      if (event.button !== 0) return
      const target = event.target
      const pointerPoint = getPointerPoint(event)

      if (assetId === 'grass') {
        if (target?.dataset?.pointIndex !== undefined) {
          const index = Number(target.dataset.pointIndex)
          if (Number.isFinite(index)) {
            startShapeDrag(event, index)
            return
          }
        }
        const insertedShapeIndex = tryInsertShapePoint(pointerPoint)
        if (insertedShapeIndex >= 0) {
          startShapeDrag(event, insertedShapeIndex)
        }
      } else {
        if (target?.dataset?.lineIndex !== undefined && target?.dataset?.handleType === undefined) {
          const lineIndex = Number(target.dataset.lineIndex)
          if (Number.isFinite(lineIndex) && dashEditorState.polylines[lineIndex]) {
            dashEditorState.activeLineIndex = lineIndex
            renderEditor()
          }
          return
        }
        if (target?.dataset?.handleType === 'shape') {
          const index = Number(target.dataset.pointIndex)
          if (Number.isFinite(index)) {
            startShapeDrag(event, index)
          }
          return
        }
        if (target?.dataset?.handleType === 'dash') {
          const lineIndex = Number(target.dataset.lineIndex)
          const pointIndex = Number(target.dataset.pointIndex)
          if (Number.isFinite(lineIndex) && Number.isFinite(pointIndex) && dashEditorState.polylines[lineIndex]) {
            dashEditorState.activeLineIndex = lineIndex
            renderEditor()
            startDashDrag(event, lineIndex, pointIndex)
          }
          return
        }
        const insertedShapeIndex = tryInsertShapePoint(pointerPoint)
        if (insertedShapeIndex >= 0) {
          startShapeDrag(event, insertedShapeIndex)
          return
        }
        tryInsertDashPoint(pointerPoint)
      }
    }

    function handlePointerMove(event) {
      if (activePointerId !== event.pointerId) return
      const candidatePoint = getPointerPoint(event)

      if (assetId === 'grass') {
        if (draggingShapeIndex >= 0) {
          editorState.points[draggingShapeIndex] = candidatePoint
          renderEditor()
        }
      } else {
        if (draggingShapeIndex >= 0) {
          const candidatePoints = editorState.points.map((point, index) => (
            index === draggingShapeIndex ? candidatePoint : point
          ))
          if (hasSelfIntersection(candidatePoints)) return
          editorState.points[draggingShapeIndex] = candidatePoint
          renderEditor()
          return
        }
        if (draggingDashLineIndex >= 0 && draggingDashIndex >= 0) {
          if (!isPointInsidePolygon(candidatePoint, editorState.points)) return
          const activePolyline = dashEditorState.polylines[draggingDashLineIndex] || []
          if (!activePolyline.length) return
          activePolyline[draggingDashIndex] = candidatePoint
          renderEditor()
        }
      }
    }

    function handlePointerUp(event) {
      if (activePointerId !== event.pointerId) return
      stopDrag()
    }

    function handleDoubleClick(event) {
      const target = event.target
      if (target?.dataset?.handleType === 'shape') {
        const index = Number(target.dataset.pointIndex)
        if (!Number.isFinite(index) || editorState.points.length <= 3) return
        dragStartSnapshot = snapshotEditor()
        editorState.points.splice(index, 1)
        renderEditor()
        pushHistorySnapshot()
        return
      }
      if (target?.dataset?.handleType === 'dash') {
        const lineIndex = Number(target.dataset.lineIndex)
        const pointIndex = Number(target.dataset.pointIndex)
        const polyline = dashEditorState.polylines[lineIndex] || []
        if (!Number.isFinite(pointIndex) || polyline.length <= 2) return
        dragStartSnapshot = snapshotEditor()
        polyline.splice(pointIndex, 1)
        renderEditor()
        pushHistorySnapshot()
      }
    }

    function handleAddDashLineClick() {
      const nextPolyline = buildVerticalCenterDashPolyline(0)
      if (nextPolyline.length < 2) return
      dashEditorState.polylines.push(nextPolyline)
      dashEditorState.activeLineIndex = dashEditorState.polylines.length - 1
      renderEditor()
      pushHistorySnapshot()
    }

    function finishDragEdit() {
      if (dragStartSnapshot) {
        const afterSnapshot = snapshotEditor()
        if (!areSnapshotsEqual(dragStartSnapshot, afterSnapshot)) {
          pushHistorySnapshot()
        }
      }
      dragStartSnapshot = null
    }

    function handlePointerUpAndSave(event) {
      handlePointerUp(event)
      finishDragEdit()
    }

    function handleLostPointerCapture() {
      stopDrag()
      finishDragEdit()
    }

    function closeOverlay() {
      cleanup()
      shapeDrawOverlay.classList.add('hidden')
      resolve(null)
    }

    function confirmOverlay() {
      if (editorState.points.length < 3) {
        alert('Shape needs at least 3 points.')
        return
      }
      if (assetId === 'road' && hasSelfIntersection(editorState.points)) {
        alert('Road border crosses itself. Please move points to remove overlap.')
        return
      }
      const worldPoints = toWorldPoints(editorState.points)
      const area = getShapeArea(worldPoints)
      if (area < 0.2) {
        alert('Shape area is too small. Please make it larger.')
        return
      }

      if (assetId === 'road') {
        for (const polyline of dashEditorState.polylines) {
          if (polyline.length < 2) {
            alert('Each dash line needs at least 2 points.')
            return
          }
          for (const point of polyline) {
            if (!isPointInsidePolygon(point, editorState.points)) {
              alert('Dash line points must stay inside the road shape.')
              return
            }
          }
        }
      }

      cleanup()
      shapeDrawOverlay.classList.add('hidden')

      if (assetId === 'grass') {
        const grassWorldPoints = toWorldPoints(editorState.points)
        const grassCentroid = computeCentroid(grassWorldPoints)
        const grassShapeLocalPoints = grassWorldPoints.map((point) => ({
          x: Number((point.x - grassCentroid.x).toFixed(4)),
          z: Number((point.z - grassCentroid.z).toFixed(4)),
        }))
        resolve(grassShapeLocalPoints)
      } else {
        const roadShapeEditorPoints = editorState.points.map((point) => ({ x: point.x, y: point.y }))
        const roadWorldPoints = toWorldPoints(roadShapeEditorPoints)
        const roadCentroid = computeCentroid(roadWorldPoints)
        const roadShapeLocalPoints = roadWorldPoints.map((point) => ({
          x: Number((point.x - roadCentroid.x).toFixed(4)),
          z: Number((point.z - roadCentroid.z).toFixed(4)),
        }))
        const dashPolylines = dashEditorState.polylines
          .map((polyline) => toWorldPoints(polyline)
            .map((point) => ({
              x: Number((point.x - roadCentroid.x).toFixed(4)),
              z: Number((point.z - roadCentroid.z).toFixed(4)),
            })))
          .filter((polyline) => polyline.length >= 2)
        resolve({
          shapePoints: roadShapeLocalPoints,
          dashPolylines,
        })
      }
    }

    svg.addEventListener('pointerdown', handlePointerDown)
    svg.addEventListener('pointermove', handlePointerMove)
    svg.addEventListener('pointerup', handlePointerUpAndSave)
    svg.addEventListener('pointercancel', handlePointerUpAndSave)
    svg.addEventListener('lostpointercapture', handleLostPointerCapture)
    undoShapeButton.addEventListener('click', undoShapeEdit)
    redoShapeButton.addEventListener('click', redoShapeEdit)

    if (assetId === 'road') {
      svg.addEventListener('dblclick', handleDoubleClick)
      addDashLineButton.addEventListener('click', handleAddDashLineClick)
    }

    shapeDrawCancel.addEventListener('click', closeOverlay)
    shapeDrawClose.addEventListener('click', closeOverlay)
    shapeDrawConfirm.addEventListener('click', confirmOverlay)
    shapeDrawBackdrop.addEventListener('click', closeOverlay)

    function cleanup() {
      svg.removeEventListener('pointerdown', handlePointerDown)
      svg.removeEventListener('pointermove', handlePointerMove)
      svg.removeEventListener('pointerup', handlePointerUpAndSave)
      svg.removeEventListener('pointercancel', handlePointerUpAndSave)
      svg.removeEventListener('lostpointercapture', handleLostPointerCapture)
      undoShapeButton.removeEventListener('click', undoShapeEdit)
      redoShapeButton.removeEventListener('click', redoShapeEdit)

      if (assetId === 'road') {
        svg.removeEventListener('dblclick', handleDoubleClick)
        addDashLineButton.removeEventListener('click', handleAddDashLineClick)
      }

      shapeDrawCancel.removeEventListener('click', closeOverlay)
      shapeDrawClose.removeEventListener('click', closeOverlay)
      shapeDrawConfirm.removeEventListener('click', confirmOverlay)
      shapeDrawBackdrop.removeEventListener('click', closeOverlay)
    }

    historyStack.push(snapshotEditor())
    historyIndex = 0
    updateHistoryButtons()
    renderEditor()
  })
}

// ── Initializer ────────────────────────────────
function init() {
  applyLayoutMode(activeLayoutMode)
  // Render cards grid
  buildAssetList()

  // Setup event hooks
  bindListeners()

  // Start unified render loop
  animate()
}

init()
