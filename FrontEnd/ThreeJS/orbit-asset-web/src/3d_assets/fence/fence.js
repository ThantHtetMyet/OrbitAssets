import * as THREE from 'three'

export const fenceAsset = {
  id: 'fence',
  name: 'Security Fence',
  icon: '🧱',
  tag: 'Structure',
  width: 2.4,
  depth: 0.52,
  height: 2.7,
  colorPrimary: '#cbd5e1', // panel wires / rails
  colorSecondary: '#9ca3af', // posts / ground base
  extras: [
    { id: 'post-height', name: 'Post Height', min: 1.5, max: 3.5, step: 0.1, value: 2.7 },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const postHeight = params.extras['post-height'] || 2.7
    const dist = params.width

    // Ground Base
    const baseGeo = new THREE.BoxGeometry(dist + 0.1, 0.45, 0.45)
    const base = new THREE.Mesh(baseGeo, secondaryMaterial)
    base.position.set(0, 0.225, 0)
    group.add(base)

    // Left and Right Posts
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, postHeight, 10)
    const leftPost = new THREE.Mesh(postGeo, secondaryMaterial)
    leftPost.position.set(-dist / 2, postHeight / 2, 0)
    group.add(leftPost)

    const rightPost = new THREE.Mesh(postGeo, secondaryMaterial)
    rightPost.position.set(dist / 2, postHeight / 2, 0)
    group.add(rightPost)

    // Frame Panels
    const panelBottom = 0.53
    const panelHeight = postHeight - 0.55
    const innerW = dist - 0.16

    // Top Rail
    const topRailGeo = new THREE.CylinderGeometry(0.03, 0.03, innerW, 8)
    const topRail = new THREE.Mesh(topRailGeo, primaryMaterial)
    topRail.rotation.z = Math.PI / 2
    topRail.position.set(0, panelBottom + panelHeight, 0)
    group.add(topRail)

    // Bottom Rail
    const bottomRail = new THREE.Mesh(topRailGeo, primaryMaterial)
    bottomRail.rotation.z = Math.PI / 2
    bottomRail.position.set(0, panelBottom, 0)
    group.add(bottomRail)

    // Wires (simulated by simple flat grid lines or basic cylinders)
    const wireGeo = new THREE.BoxGeometry(0.015, panelHeight, 0.015)
    const wireCount = 8
    const step = innerW / (wireCount - 1)
    for (let i = 0; i < wireCount; i++) {
      const wire = new THREE.Mesh(wireGeo, primaryMaterial)
      wire.position.set(-innerW / 2 + i * step, panelBottom + panelHeight / 2, 0)
      group.add(wire)
    }

    return group
  },
}
