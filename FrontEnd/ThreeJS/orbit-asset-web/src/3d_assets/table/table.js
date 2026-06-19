import * as THREE from 'three'

export const tableAsset = {
  id: 'table',
  name: 'Coffee Table',
  icon: '🪵',
  tag: 'Furniture',
  width: 1.2,
  depth: 0.7,
  height: 0.75,
  colorPrimary: '#0ea5e9',
  colorSecondary: '#1e293b',
  extras: [
    { id: 'top-thickness', name: 'Tabletop T', min: 0.02, max: 0.1, step: 0.01, value: 0.04 },
    { id: 'leg-width', name: 'Leg Width', min: 0.02, max: 0.08, step: 0.005, value: 0.04 },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const w = params.width
    const d = params.depth
    const h = params.height
    const topT = params.extras['top-thickness'] || 0.04
    const legW = params.extras['leg-width'] || 0.04

    // Tabletop
    const topGeo = new THREE.BoxGeometry(w, topT, d)
    const top = new THREE.Mesh(topGeo, primaryMaterial)
    top.position.y = h - (topT / 2)
    group.add(top)

    // Legs
    const legGeo = new THREE.BoxGeometry(legW, h - topT, legW)
    const legOffset = 0.05
    const legPositions = [
      [w / 2 - legOffset - legW / 2, d / 2 - legOffset - legW / 2],
      [-w / 2 + legOffset + legW / 2, d / 2 - legOffset - legW / 2],
      [w / 2 - legOffset - legW / 2, -d / 2 + legOffset + legW / 2],
      [-w / 2 + legOffset + legW / 2, -d / 2 + legOffset + legW / 2],
    ]
    legPositions.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, secondaryMaterial)
      leg.position.set(lx, (h - topT) / 2, lz)
      group.add(leg)
    })

    return group
  },
}
