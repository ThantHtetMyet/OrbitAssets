import * as THREE from 'three'
import signboardOneImage from '../../icons/3d_icon/protected_area_signboard_1.png'
import signboardTwoImage from '../../icons/3d_icon/protected_area_signboard_2.png'

const textureLoader = new THREE.TextureLoader()
const signboardTextureCache = new Map()

function normalizeSignboardType(rawValue) {
  const numericValue = Number(rawValue)
  return numericValue === 2 ? 2 : 1
}

function getSignboardTexture(type) {
  const normalizedType = normalizeSignboardType(type)
  if (!signboardTextureCache.has(normalizedType)) {
    const texture = textureLoader.load(normalizedType === 2 ? signboardTwoImage : signboardOneImage)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.colorSpace = THREE.SRGBColorSpace
    signboardTextureCache.set(normalizedType, texture)
  }
  return signboardTextureCache.get(normalizedType)
}

export const signboardAsset = {
  id: 'signboard',
  name: 'Sign Board',
  icon: '⚠️',
  tag: 'Security',
  width: 2.1,
  depth: 0.15,
  height: 2.2,
  colorPrimary: '#dc2626',
  colorSecondary: '#111827',
  extras: [
    { id: 'signboard-type', name: 'Board Type', min: 1, max: 2, step: 1, value: 1 },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const boardType = normalizeSignboardType(params?.extras?.['signboard-type'])
    const dimensions = boardType === 2
      ? { width: 2.4, height: 1.32, boardCenterY: 2.05 }
      : { width: 2.1, height: 1.2, boardCenterY: 1.95 }
    const boardDepth = 0.045
    const frameThickness = 0.06
    const texture = getSignboardTexture(boardType)

    const frameMaterial = secondaryMaterial.clone()
    frameMaterial.color.set(params.colorSecondary || secondaryMaterial.color)
    frameMaterial.roughness = 0.52
    frameMaterial.metalness = 0.2

    const mountMaterial = secondaryMaterial.clone()
    mountMaterial.color.offsetHSL(0, 0, 0.1)
    mountMaterial.roughness = 0.66
    mountMaterial.metalness = 0.24

    const faceMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: texture,
      roughness: 0.72,
      metalness: 0.08,
    })

    const boardBody = new THREE.Mesh(
      new THREE.BoxGeometry(dimensions.width, dimensions.height, boardDepth),
      [frameMaterial, frameMaterial, frameMaterial, frameMaterial, faceMaterial, faceMaterial]
    )
    boardBody.position.set(0, dimensions.boardCenterY, 0)
    group.add(boardBody)

    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(dimensions.width + frameThickness, frameThickness, boardDepth + 0.01),
      frameMaterial
    )
    topFrame.position.set(0, dimensions.boardCenterY + (dimensions.height / 2), 0)
    group.add(topFrame)

    const bottomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(dimensions.width + frameThickness, frameThickness, boardDepth + 0.01),
      frameMaterial
    )
    bottomFrame.position.set(0, dimensions.boardCenterY - (dimensions.height / 2), 0)
    group.add(bottomFrame)

    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, dimensions.height, boardDepth + 0.01),
      frameMaterial
    )
    leftFrame.position.set(-(dimensions.width / 2), dimensions.boardCenterY, 0)
    group.add(leftFrame)

    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, dimensions.height, boardDepth + 0.01),
      frameMaterial
    )
    rightFrame.position.set(dimensions.width / 2, dimensions.boardCenterY, 0)
    group.add(rightFrame)

    const mountBarTop = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.6, dimensions.width * 0.42), 0.08, 0.08),
      mountMaterial
    )
    mountBarTop.position.set(0, dimensions.boardCenterY + 0.22, -0.065)
    group.add(mountBarTop)

    const mountBarBottom = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.6, dimensions.width * 0.42), 0.08, 0.08),
      mountMaterial
    )
    mountBarBottom.position.set(0, dimensions.boardCenterY - 0.22, -0.065)
    group.add(mountBarBottom)

    return group
  },
}
