import * as THREE from 'three'

export const wallAsset = {
  id: 'wall',
  name: 'Partition Wall',
  icon: '🧱',
  tag: 'Structure',
  width: 1.2,
  depth: 0.12,
  height: 2.4,
  colorPrimary: '#64748b',
  colorSecondary: '#475569',
  extras: [
    { id: 'trim-height', name: 'Trim H', min: 0.02, max: 0.15, step: 0.005, value: 0.06 },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const w = params.width
    const d = params.depth
    const h = params.height
    const trimH = params.extras['trim-height'] || 0.06

    // Main Wall Panel
    const wallGeo = new THREE.BoxGeometry(w, h, d)
    const wall = new THREE.Mesh(wallGeo, primaryMaterial)
    wall.position.y = h / 2
    group.add(wall)

    // Top Trim
    const topTrimGeo = new THREE.BoxGeometry(w, trimH, d + 0.01)
    const topTrim = new THREE.Mesh(topTrimGeo, secondaryMaterial)
    topTrim.position.y = h - (trimH / 2)
    group.add(topTrim)

    // Base Trim
    const baseTrimGeo = new THREE.BoxGeometry(w, trimH, d + 0.01)
    const baseTrim = new THREE.Mesh(baseTrimGeo, secondaryMaterial)
    baseTrim.position.y = trimH / 2
    group.add(baseTrim)

    return group
  },
}
