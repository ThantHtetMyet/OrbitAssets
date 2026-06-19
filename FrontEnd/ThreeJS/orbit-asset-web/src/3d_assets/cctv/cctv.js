import * as THREE from 'three'

function addStatusLed(parent, position) {
  const ledColor = 0x22c55e
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 14, 14),
    new THREE.MeshStandardMaterial({
      color: ledColor,
      emissive: ledColor,
      emissiveIntensity: 1.35,
      roughness: 0.35,
      metalness: 0.05,
    })
  )
  led.position.copy(position)
  led.userData.blinkingLed = true
  parent.add(led)
}

function buildBulletHead(headPivot) {
  const bodyOffsetX = 0.5
  const mountCap = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.08, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xe3e9f1 })
  )
  mountCap.position.set(-0.02 + bodyOffsetX, -0.02, 0)
  headPivot.add(mountCap)

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.15, 0.72, 22),
    new THREE.MeshStandardMaterial({ color: 0xf3f6fa })
  )
  body.rotation.z = Math.PI / 2
  body.position.set(-0.24 + bodyOffsetX, -0.14, 0)
  headPivot.add(body)

  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.11, 0.38),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  )
  hood.position.set(-0.24 + bodyOffsetX, -0.04, 0)
  headPivot.add(hood)

  const frontRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.028, 14, 28),
    new THREE.MeshStandardMaterial({ color: 0xd9e1ea })
  )
  frontRing.rotation.y = Math.PI / 2
  frontRing.position.set(0.12 + bodyOffsetX, -0.14, 0)
  headPivot.add(frontRing)

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.082, 0.082, 0.08, 20),
    new THREE.MeshStandardMaterial({ color: 0x213245 })
  )
  lens.rotation.z = Math.PI / 2
  lens.position.set(0.16 + bodyOffsetX, -0.14, 0)
  headPivot.add(lens)
}

function buildDomeHead(headPivot) {
  const topPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.27, 0.08, 32),
    new THREE.MeshStandardMaterial({ color: 0x8fa0b5 })
  )
  topPlate.position.set(0, 0.06, 0)
  headPivot.add(topPlate)

  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.245, 0.27, 0.24, 32),
    new THREE.MeshStandardMaterial({ color: 0xc9d4e1 })
  )
  shell.position.set(0, -0.015, 0)
  headPivot.add(shell)

  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 28, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x182737, transparent: true, opacity: 0.92 })
  )
  glass.position.set(0, -0.145, 0)
  headPivot.add(glass)

  const lensCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0x0f1a27 })
  )
  lensCore.scale.set(0.95, 0.65, 0.95)
  lensCore.position.set(0.02, -0.165, 0)
  headPivot.add(lensCore)

  const lensDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0x060b12 })
  )
  lensDot.position.set(0.075, -0.165, 0)
  headPivot.add(lensDot)
}

function buildCompactHead(headPivot) {
  const bodyOffsetX = 0.4
  const mountCap = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.09, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xd7deea })
  )
  mountCap.position.set(-0.02 + bodyOffsetX, -0.02, 0)
  headPivot.add(mountCap)

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.23, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xf0f3f7 })
  )
  body.position.set(-0.2 + bodyOffsetX, -0.14, 0)
  headPivot.add(body)

  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(0.74, 0.12, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  )
  hood.position.set(-0.2 + bodyOffsetX, -0.04, 0)
  headPivot.add(hood)

  const sideWingLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.05, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xd8dfe8 })
  )
  sideWingLeft.position.set(-0.03 + bodyOffsetX, -0.22, -0.17)
  headPivot.add(sideWingLeft)

  const sideWingRight = sideWingLeft.clone()
  sideWingRight.position.z = 0.17
  headPivot.add(sideWingRight)

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.1, 18),
    new THREE.MeshStandardMaterial({ color: 0x1c2d40 })
  )
  lens.rotation.z = Math.PI / 2
  lens.position.set(0.2 + bodyOffsetX, -0.15, 0)
  headPivot.add(lens)
}

function normalizeCctvType(typeName) {
  if (typeName === 'one' || typeName === 'bullet' || Number(typeName) === 1) {
    return 'one'
  }
  if (typeName === 'two' || typeName === 'dome' || typeName === 'multi' || Number(typeName) === 2) {
    return 'two'
  }
  if (typeName === 'three' || Number(typeName) === 3) {
    return 'three'
  }
  return 'one'
}

export const cctvAsset = {
  id: 'cctv',
  name: 'CCTV Camera',
  icon: '📹',
  tag: 'Security',
  width: 1.4,
  depth: 1.4,
  height: 4.2,
  colorPrimary: '#445566',
  colorSecondary: '#91a3b7',
  extras: [
    { id: 'cctv-type', name: 'CCTV Type', min: 1, max: 3, step: 1, value: 1 },
    { id: 'camera-angle', name: 'Sight Tilt', min: -45, max: 15, step: 1, value: -8 },
  ],
  build: (params) => {
    const poleGroup = new THREE.Group()
    const normalizedType = normalizeCctvType(params?.extras?.['cctv-type'])
    const parsedPitch = Number(params?.extras?.['camera-angle'])
    const pitch = Number.isFinite(parsedPitch)
      ? ((normalizedType === 'three' && Math.abs(parsedPitch - (-8)) <= 0.001) ? 0 : parsedPitch)
      : (normalizedType === 'three' ? 0 : -8)

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 4.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x445566 })
    )
    pole.position.set(0, 2.1, 0)
    poleGroup.add(pole)

    const mountBaseY = 4.08
    const barLength = 1.28
    const barAngleRad = 0
    const barEndX = Math.cos(barAngleRad) * barLength
    const barEndY = mountBaseY + (Math.sin(barAngleRad) * barLength)
    const dropAlong = barLength * 0.76
    const dropAnchorX = Math.cos(barAngleRad) * dropAlong
    const dropAnchorY = mountBaseY + (Math.sin(barAngleRad) * dropAlong)
    const dropLength = 0.38

    const hangerBar = new THREE.Mesh(
      new THREE.BoxGeometry(barLength, 0.12, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x566575 })
    )
    hangerBar.position.set(Math.cos(barAngleRad) * (barLength / 2), mountBaseY, 0)
    poleGroup.add(hangerBar)

    const hangerCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.15, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x68798b })
    )
    hangerCap.position.set(barEndX, barEndY, 0)
    poleGroup.add(hangerCap)

    const hangerDrop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, dropLength, 16),
      new THREE.MeshStandardMaterial({ color: 0x7b8da0 })
    )
    hangerDrop.position.set(dropAnchorX, dropAnchorY - (dropLength / 2), 0)
    poleGroup.add(hangerDrop)

    const tiltJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0x91a3b7 })
    )
    tiltJoint.position.set(dropAnchorX, dropAnchorY - dropLength, 0)
    poleGroup.add(tiltJoint)

    const headPivot = new THREE.Group()
    headPivot.position.set(dropAnchorX, dropAnchorY - dropLength, 0)
    headPivot.rotation.z = THREE.MathUtils.degToRad(pitch)
    poleGroup.add(headPivot)

    if (normalizedType === 'three') {
      buildDomeHead(headPivot)
      addStatusLed(headPivot, new THREE.Vector3(0.098, -0.168, 0.038))
    } else if (normalizedType === 'two') {
      buildCompactHead(headPivot)
      addStatusLed(headPivot, new THREE.Vector3(0.255 + 0.4, -0.15, 0.045))
    } else {
      buildBulletHead(headPivot)
      addStatusLed(headPivot, new THREE.Vector3(0.205 + 0.5, -0.14, 0.04))
    }

    return poleGroup
  },
}
