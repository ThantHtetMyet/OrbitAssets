import * as THREE from 'three'

export const chairAsset = {
  id: 'chair',
  name: 'Lounge Chair',
  icon: '🪑',
  tag: 'Furniture',
  width: 0.6,
  depth: 0.6,
  height: 0.8,
  colorPrimary: '#8b5cf6',
  colorSecondary: '#334155',
  extras: [
    { id: 'backrest-height', name: 'Backrest H', min: 0.2, max: 0.8, step: 0.05, value: 0.45 },
    { id: 'cushion-thickness', name: 'Cushion T', min: 0.04, max: 0.15, step: 0.01, value: 0.08 },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const seatW = params.width
    const seatD = params.depth
    const seatH = params.height
    const cushionT = params.extras['cushion-thickness'] || 0.08
    const backH = params.extras['backrest-height'] || 0.45

    // Cushion (Seat)
    const seatGeo = new THREE.BoxGeometry(seatW, cushionT, seatD)
    const seat = new THREE.Mesh(seatGeo, primaryMaterial)
    seat.position.y = seatH * 0.45
    group.add(seat)

    // Backrest
    const backGeo = new THREE.BoxGeometry(seatW, backH, 0.06)
    const backrest = new THREE.Mesh(backGeo, primaryMaterial)
    backrest.position.set(0, seat.position.y + (backH / 2) - 0.02, -seatD / 2 + 0.03)
    backrest.rotation.x = -0.05
    group.add(backrest)

    // Legs (4 legs)
    const legGeo = new THREE.CylinderGeometry(0.02, 0.015, seatH * 0.45)
    const legPositions = [
      [seatW / 2 - 0.03, -seatD / 2 + 0.03],
      [-seatW / 2 + 0.03, -seatD / 2 + 0.03],
      [seatW / 2 - 0.03, seatD / 2 - 0.03],
      [-seatW / 2 + 0.03, seatD / 2 - 0.03],
    ]
    legPositions.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, secondaryMaterial)
      leg.position.set(lx, (seatH * 0.45) / 2, lz)
      group.add(leg)
    })

    return group
  },
}
