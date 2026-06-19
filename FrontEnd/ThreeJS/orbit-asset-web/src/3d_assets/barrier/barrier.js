import * as THREE from 'three'

export const barrierAsset = {
  id: 'barrier',
  name: 'Gate Barrier',
  icon: '🚧',
  tag: 'Access',
  width: 0.4,
  depth: 0.4,
  height: 1.2,
  colorPrimary: '#ef4444',
  colorSecondary: '#facc15',
  extras: [
    { id: 'arm-length', name: 'Arm Length', min: 1.5, max: 4.5, step: 0.1, value: 3.0 },
    { id: 'arm-angle', name: 'Gate Open %', min: 0, max: 90, step: 5, value: 0 },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const baseH = params.height
    const baseW = params.width
    const baseD = params.depth
    const armL = params.extras['arm-length'] || 3.0
    const armAngle = THREE.MathUtils.degToRad(params.extras['arm-angle'] || 0)

    // Base Housing
    const baseGeo = new THREE.BoxGeometry(baseW, baseH, baseD)
    const base = new THREE.Mesh(baseGeo, primaryMaterial)
    base.position.y = baseH / 2
    group.add(base)

    // Top Joint Housing Cap
    const capGeo = new THREE.BoxGeometry(baseW + 0.02, 0.08, baseD + 0.02)
    const cap = new THREE.Mesh(capGeo, secondaryMaterial)
    cap.position.y = baseH + 0.04
    group.add(cap)

    // Rotation Mount Ring
    const jointGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.1)
    const joint = new THREE.Mesh(jointGeo, secondaryMaterial)
    joint.rotation.z = Math.PI / 2
    joint.position.set(baseW * 0.45, baseH * 0.8, 0)
    group.add(joint)

    // Barrier Gate Arm Group
    const armGroup = new THREE.Group()
    armGroup.position.set(baseW * 0.48, baseH * 0.8, 0)

    // Long Arm
    const armGeo = new THREE.BoxGeometry(armL, 0.04, 0.08)
    const arm = new THREE.Mesh(armGeo, secondaryMaterial)
    arm.position.x = armL / 2
    armGroup.add(arm)

    // Stripe Details
    const stripeCount = Math.floor(armL * 2.5)
    for (let i = 0; i < stripeCount; i++) {
      if (i % 2 === 0) continue
      const stripeGeo = new THREE.BoxGeometry(0.18, 0.045, 0.085)
      const stripe = new THREE.Mesh(stripeGeo, primaryMaterial)
      stripe.position.set(0.15 + i * 0.35, 0, 0)
      armGroup.add(stripe)
    }

    // Rotate Arm Group
    armGroup.rotation.z = armAngle
    group.add(armGroup)

    return group
  },
}
