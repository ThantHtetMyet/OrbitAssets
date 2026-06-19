import * as THREE from 'three'

export const treeAsset = {
  id: 'tree',
  name: 'Landscape Tree',
  icon: '🌳',
  tag: 'Landscape',
  width: 2.2,
  depth: 2.2,
  height: 3.2,
  colorPrimary: '#2d7f3f',
  colorSecondary: '#765131',
  extras: [
    { id: 'canopy-scale', name: 'Canopy Size', min: 0.5, max: 1.5, step: 0.05, value: 1.0 },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const canopyScale = params.extras['canopy-scale'] || 1.0
    const treeH = params.height

    // Root Flare / Base
    const rootGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.22, 10)
    const root = new THREE.Mesh(rootGeo, secondaryMaterial)
    root.position.y = 0.11
    group.add(root)

    // Trunk
    const trunkH = treeH * 0.6
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.26, trunkH, 10)
    const trunk = new THREE.Mesh(trunkGeo, secondaryMaterial)
    trunk.position.y = 0.11 + trunkH / 2
    group.add(trunk)

    // Canopy (Foliage) Group
    const canopyY = 0.11 + trunkH
    const leafMat = primaryMaterial

    // Main central canopy sphere
    const mainCanopyGeo = new THREE.SphereGeometry(1.05 * canopyScale, 12, 12)
    const mainCanopy = new THREE.Mesh(mainCanopyGeo, leafMat)
    mainCanopy.position.set(0, canopyY, 0)
    group.add(mainCanopy)

    // Outer cluster spheres for a natural look
    const offsets = [
      [0.6, 0.4, 0.6],
      [-0.6, 0.3, -0.6],
      [0.6, 0.2, -0.6],
      [-0.6, 0.5, 0.6],
      [0.0, 0.85, 0.0],
    ]
    offsets.forEach(([ox, oy, oz], index) => {
      const size = (0.55 + (index % 3) * 0.1) * canopyScale
      const clusterGeo = new THREE.SphereGeometry(size, 8, 8)
      const cluster = new THREE.Mesh(clusterGeo, leafMat)
      cluster.position.set(ox * canopyScale, canopyY + oy * canopyScale, oz * canopyScale)
      group.add(cluster)
    })

    return group
  },
}
