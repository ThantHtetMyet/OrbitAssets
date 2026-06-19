import * as THREE from 'three'

export const buildingAsset = {
  id: 'building',
  name: 'Building Shape',
  icon: '🏢',
  tag: 'Structure',
  width: 5.0,
  depth: 5.0,
  height: 8.0,
  colorPrimary: '#9aa8b8', // walls
  colorSecondary: '#1e293b', // roof / trims
  extras: [
    { id: 'is-cylinder', name: 'Is Cylinder (0/1)', min: 0, max: 1, step: 1, value: 0 },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const isCylinder = (params.extras['is-cylinder'] === 1)
    const w = params.width
    const d = params.depth
    const h = params.height
    const diam = Math.max(w, d)

    let body
    if (isCylinder) {
      const radius = diam / 2
      const cylinderGeo = new THREE.CylinderGeometry(radius, radius, h, 24)
      body = new THREE.Mesh(cylinderGeo, primaryMaterial)
    } else {
      const boxGeo = new THREE.BoxGeometry(w, h, d)
      body = new THREE.Mesh(boxGeo, primaryMaterial)
    }
    body.position.y = h / 2
    group.add(body)

    // Roof Top
    let roof
    if (isCylinder) {
      const radius = diam / 2 + 0.1
      const roofGeo = new THREE.CylinderGeometry(radius, radius, 0.2, 24)
      roof = new THREE.Mesh(roofGeo, secondaryMaterial)
    } else {
      const roofGeo = new THREE.BoxGeometry(w + 0.2, 0.2, d + 0.2)
      roof = new THREE.Mesh(roofGeo, secondaryMaterial)
    }
    roof.position.y = h + 0.1
    group.add(roof)

    // Base trim
    let base
    if (isCylinder) {
      const radius = diam / 2 + 0.08
      const baseGeo = new THREE.CylinderGeometry(radius, radius, 0.4, 24)
      base = new THREE.Mesh(baseGeo, secondaryMaterial)
    } else {
      const baseGeo = new THREE.BoxGeometry(w + 0.16, 0.4, d + 0.16)
      base = new THREE.Mesh(baseGeo, secondaryMaterial)
    }
    base.position.y = 0.2
    group.add(base)

    return group
  },
}
