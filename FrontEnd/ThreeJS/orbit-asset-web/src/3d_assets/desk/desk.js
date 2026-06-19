import * as THREE from 'three'

export const deskAsset = {
  id: 'desk',
  name: 'Office Desk',
  icon: '💻',
  tag: 'Furniture',
  width: 1.4,
  depth: 0.75,
  height: 0.76,
  colorPrimary: '#f59e0b',
  colorSecondary: '#854d0e',
  extras: [
    { id: 'drawer-side', name: 'Drawer Cabinet', min: 0, max: 1, step: 1, value: 1 },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const w = params.width
    const d = params.depth
    const h = params.height
    const hasDrawer = (params.extras['drawer-side'] ?? 1) === 1

    // Desktop
    const topGeo = new THREE.BoxGeometry(w, 0.03, d)
    const top = new THREE.Mesh(topGeo, primaryMaterial)
    top.position.y = h - 0.015
    group.add(top)

    // Left Panel leg
    const legLGeo = new THREE.BoxGeometry(0.04, h - 0.03, d * 0.95)
    const legL = new THREE.Mesh(legLGeo, secondaryMaterial)
    legL.position.set(-w / 2 + 0.04, (h - 0.03) / 2, 0)
    group.add(legL)

    // Right Panel leg or Drawers
    if (hasDrawer) {
      const cabinetW = w * 0.28
      const cabinetH = h - 0.03
      const cabinetGeo = new THREE.BoxGeometry(cabinetW, cabinetH, d * 0.9)
      const cabinet = new THREE.Mesh(cabinetGeo, secondaryMaterial)
      cabinet.position.set(w / 2 - cabinetW / 2 - 0.04, cabinetH / 2, 0)
      group.add(cabinet)

      // Decorative drawer line handles
      for (let i = 0; i < 3; i++) {
        const handleGeo = new THREE.BoxGeometry(cabinetW * 0.6, 0.015, 0.015)
        const handle = new THREE.Mesh(handleGeo, primaryMaterial)
        handle.position.set(
          w / 2 - cabinetW / 2 - 0.04,
          cabinetH * (0.8 - i * 0.28),
          d * 0.45 + 0.005,
        )
        group.add(handle)
      }
    } else {
      const legRGeo = new THREE.BoxGeometry(0.04, h - 0.03, d * 0.95)
      const legR = new THREE.Mesh(legRGeo, secondaryMaterial)
      legR.position.set(w / 2 - 0.04, (h - 0.03) / 2, 0)
      group.add(legR)
    }

    return group
  },
}
