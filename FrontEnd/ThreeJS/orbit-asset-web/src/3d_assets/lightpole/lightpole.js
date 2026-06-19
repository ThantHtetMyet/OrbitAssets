import * as THREE from 'three'

export const lightPoleAsset = {
  id: 'light-pole',
  name: 'Light Pole',
  icon: '💡',
  tag: 'Infrastructure',
  width: 1.2,
  depth: 0.4,
  height: 6.0,
  colorPrimary: '#4f6071',
  colorSecondary: '#3a4956',
  extras: [
    { id: 'sight-angle', name: 'Sight Tilt', min: -55, max: 25, step: 5, value: 21 },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const tilt = THREE.MathUtils.degToRad(params.extras['sight-angle'] || 21)
    const poleH = params.height

    // Base cylinder
    const baseGeo = new THREE.CylinderGeometry(0.28, 0.36, 0.2, 12)
    const base = new THREE.Mesh(baseGeo, primaryMaterial)
    base.position.y = 0.1
    group.add(base)

    // Main Pole
    const shaftH = poleH - 0.5
    const poleGeo = new THREE.BoxGeometry(0.18, shaftH, 0.18)
    const pole = new THREE.Mesh(poleGeo, primaryMaterial)
    pole.position.y = 0.2 + shaftH / 2
    group.add(pole)

    // Top Cap
    const capGeo = new THREE.BoxGeometry(0.2, 0.14, 0.2)
    const cap = new THREE.Mesh(capGeo, primaryMaterial)
    cap.position.y = poleH - 0.23
    group.add(cap)

    // Arm and Lamp Head pivoting
    const headPivot = new THREE.Group()
    headPivot.position.set(0, poleH - 0.3, 0)

    // Forward Arm
    const armGeo = new THREE.BoxGeometry(0.66, 0.08, 0.15)
    const arm = new THREE.Mesh(armGeo, secondaryMaterial)
    arm.position.set(0.33, 0, 0)
    headPivot.add(arm)

    // Lamp Head
    const lampGeo = new THREE.BoxGeometry(0.96, 0.14, 0.3)
    const lamp = new THREE.Mesh(lampGeo, secondaryMaterial)
    lamp.position.set(0.94, -0.02, 0)
    headPivot.add(lamp)

    // Underside Lens Panel
    const lensMaterial = new THREE.MeshStandardMaterial({
      color: '#ccf0ff',
      emissive: '#6ecbff',
      emissiveIntensity: 1.5,
    })
    const lensGeo = new THREE.BoxGeometry(0.94, 0.03, 0.24)
    const lens = new THREE.Mesh(lensGeo, lensMaterial)
    lens.position.set(0.94, -0.09, 0)
    headPivot.add(lens)

    // Rotate Arm based on Tilt
    headPivot.rotation.z = tilt
    group.add(headPivot)

    return group
  },
}
