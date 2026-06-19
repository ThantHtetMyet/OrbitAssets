import * as THREE from 'three'

export const gateAsset = {
  id: 'gate',
  name: 'Access Gate',
  icon: '🚪',
  tag: 'Access',
  width: 4.8,
  depth: 0.68,
  height: 3.4,
  colorPrimary: '#f97316', // posts
  colorSecondary: '#111827', // frames
  extras: [
    { id: 'open-angle', name: 'Open Angle', min: 0, max: 90, step: 5, value: 0 },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const openAngle = THREE.MathUtils.degToRad(params.extras['open-angle'] || 0)
    const span = params.width
    const postHeight = params.height
    const postRadius = 0.15
    const halfSpan = span / 2

    // Posts (Left & Right)
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 12)
    const leftPost = new THREE.Mesh(postGeo, primaryMaterial)
    leftPost.position.set(-halfSpan, postHeight / 2, 0)
    group.add(leftPost)

    const rightPost = new THREE.Mesh(postGeo, primaryMaterial)
    rightPost.position.set(halfSpan, postHeight / 2, 0)
    group.add(rightPost)

    // Base
    const baseGeo = new THREE.BoxGeometry(span + 0.34, 0.24, 0.68)
    const base = new THREE.Mesh(baseGeo, secondaryMaterial)
    base.position.set(0, 0.12, 0)
    group.add(base)

    // Door Leaf pivots
    const leafWidth = halfSpan - 0.25
    const leafHeight = postHeight * 0.7
    const leafBottom = 0.5
    const leafDepth = 0.08
    const panelCenterY = leafBottom + leafHeight / 2

    function buildLeaf(direction) {
      const leaf = new THREE.Group()
      const localSign = direction === 'left' ? 1 : -1
      const centerX = localSign * (leafWidth / 2)

      // Outer Frame
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, 0.08, leafDepth), secondaryMaterial)
      frameTop.position.set(centerX, leafBottom + leafHeight, 0)
      leaf.add(frameTop)

      const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, 0.08, leafDepth), secondaryMaterial)
      frameBottom.position.set(centerX, leafBottom, 0)
      leaf.add(frameBottom)

      const sideHinge = new THREE.Mesh(new THREE.BoxGeometry(0.08, leafHeight, leafDepth), secondaryMaterial)
      sideHinge.position.set(0, panelCenterY, 0)
      leaf.add(sideHinge)

      const sideCenter = new THREE.Mesh(new THREE.BoxGeometry(0.08, leafHeight, leafDepth), secondaryMaterial)
      sideCenter.position.set(localSign * leafWidth, panelCenterY, 0)
      leaf.add(sideCenter)

      // Vertical decorative bars
      const barGeo = new THREE.BoxGeometry(0.024, leafHeight - 0.2, 0.024)
      const barCount = 5
      const step = leafWidth / (barCount + 1)
      for (let i = 1; i <= barCount; i++) {
        const bar = new THREE.Mesh(barGeo, primaryMaterial)
        bar.position.set(localSign * (i * step), panelCenterY, 0)
        leaf.add(bar)
      }

      return leaf
    }

    const leftPivot = new THREE.Group()
    leftPivot.position.set(-halfSpan + 0.15, 0, 0)
    leftPivot.rotation.y = openAngle
    leftPivot.add(buildLeaf('left'))
    group.add(leftPivot)

    const rightPivot = new THREE.Group()
    rightPivot.position.set(halfSpan - 0.15, 0, 0)
    rightPivot.rotation.y = -openAngle
    rightPivot.add(buildLeaf('right'))
    group.add(rightPivot)

    return group
  },
}
