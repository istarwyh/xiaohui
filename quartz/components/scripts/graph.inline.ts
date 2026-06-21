import type { ContentDetails } from "../../plugins/emitters/contentIndex"
import {
  SimulationNodeDatum,
  SimulationLinkDatum,
  Simulation,
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceCollide,
  forceRadial,
  zoomIdentity,
  select,
  drag,
  zoom,
} from "d3"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { Text, Graphics, Application, Container, Circle } from "pixi.js"
import { Group as TweenGroup, Tween as Tweened } from "@tweenjs/tween.js"
import { registerEscapeHandler, removeAllChildren } from "./util"
import { FullSlug, SimpleSlug, getFullSlug, resolveRelative, simplifySlug } from "../../util/path"
import { D3Config } from "../Graph"

type GraphicsInfo = {
  color: string
  gfx: Graphics
  alpha: number
  active: boolean
}

type NodeData = {
  id: SimpleSlug
  text: string
  tags: string[]
} & SimulationNodeDatum

type SimpleLinkData = {
  source: SimpleSlug
  target: SimpleSlug
}

type LinkData = {
  source: NodeData
  target: NodeData
} & SimulationLinkDatum<NodeData>

type LinkRenderData = GraphicsInfo & {
  simulationData: LinkData
}

type NodeRenderData = GraphicsInfo & {
  simulationData: NodeData
  label: Text
}

const localStorageKey = "graph-visited"
function getVisited(): Set<SimpleSlug> {
  return new Set(JSON.parse(localStorage.getItem(localStorageKey) ?? "[]"))
}

function addToVisited(slug: SimpleSlug) {
  const visited = getVisited()
  visited.add(slug)
  localStorage.setItem(localStorageKey, JSON.stringify([...visited]))
}

type TweenNode = {
  update: (time: number) => void
  stop: () => void
}

type GraphRenderMode = "2d" | "3d"

type Node3DState = {
  node: NodeData
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

function hashToUnit(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

function cssColor(value: string, fallback: string) {
  try {
    return new THREE.Color(value.trim())
  } catch {
    return new THREE.Color(fallback)
  }
}

function layoutGraph3D(
  graphData: { nodes: NodeData[]; links: LinkData[] },
  width: number,
  height: number,
  repelForce: number,
  centerForce: number,
  linkDistance: number,
) {
  const nodeCount = Math.max(graphData.nodes.length, 1)
  const graphRadius = Math.max(160, Math.min(width, height) * 0.42)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const states = graphData.nodes.map((node, index): Node3DState => {
    const t = (index + 0.5) / nodeCount
    const inclination = Math.acos(1 - 2 * t)
    const azimuth = goldenAngle * index + hashToUnit(node.id) * Math.PI * 2
    const radius = graphRadius * (0.72 + hashToUnit(`${node.id}:radius`) * 0.28)

    return {
      node,
      x: Math.sin(inclination) * Math.cos(azimuth) * radius,
      y: Math.sin(inclination) * Math.sin(azimuth) * radius,
      z: Math.cos(inclination) * radius,
      vx: 0,
      vy: 0,
      vz: 0,
    }
  })

  const stateById = new Map(states.map((state) => [state.node.id, state]))
  const links = graphData.links
    .map((link) => ({
      source: stateById.get(link.source.id),
      target: stateById.get(link.target.id),
    }))
    .filter((link): link is { source: Node3DState; target: Node3DState } =>
      Boolean(link.source && link.target),
    )

  const iterations = nodeCount > 600 ? 70 : nodeCount > 300 ? 95 : 125
  const repulsion = 520 * Math.max(repelForce, 0.1)
  const centering = 0.0025 * Math.max(centerForce, 0.05)
  const desiredLinkDistance = Math.max(55, linkDistance * 3.4)
  const spring = 0.012
  const damping = 0.86

  for (let iteration = 0; iteration < iterations; iteration++) {
    for (let i = 0; i < states.length; i++) {
      const a = states[i]
      a.vx -= a.x * centering
      a.vy -= a.y * centering
      a.vz -= a.z * centering

      for (let j = i + 1; j < states.length; j++) {
        const b = states[j]
        let dx = a.x - b.x
        let dy = a.y - b.y
        let dz = a.z - b.z
        let distSq = dx * dx + dy * dy + dz * dz
        if (distSq < 0.01) {
          dx = hashToUnit(`${a.node.id}:${b.node.id}:x`) - 0.5
          dy = hashToUnit(`${a.node.id}:${b.node.id}:y`) - 0.5
          dz = hashToUnit(`${a.node.id}:${b.node.id}:z`) - 0.5
          distSq = dx * dx + dy * dy + dz * dz
        }

        distSq = Math.max(distSq, 64)
        const dist = Math.sqrt(distSq)
        const force = repulsion / distSq
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        const fz = (dz / dist) * force
        a.vx += fx
        a.vy += fy
        a.vz += fz
        b.vx -= fx
        b.vy -= fy
        b.vz -= fz
      }
    }

    for (const link of links) {
      const dx = link.target.x - link.source.x
      const dy = link.target.y - link.source.y
      const dz = link.target.z - link.source.z
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 0.01)
      const force = (dist - desiredLinkDistance) * spring
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      const fz = (dz / dist) * force

      link.source.vx += fx
      link.source.vy += fy
      link.source.vz += fz
      link.target.vx -= fx
      link.target.vy -= fy
      link.target.vz -= fz
    }

    for (const state of states) {
      state.vx *= damping
      state.vy *= damping
      state.vz *= damping
      state.x += state.vx
      state.y += state.vy
      state.z += state.vz
    }
  }

  return { states, stateById }
}

function renderGraph3D({
  graph,
  fullSlug,
  graphData,
  width,
  height,
  repelForce,
  centerForce,
  linkDistance,
  computedStyleMap,
  color,
  nodeRadius,
}: {
  graph: HTMLElement
  fullSlug: FullSlug
  graphData: { nodes: NodeData[]; links: LinkData[] }
  width: number
  height: number
  repelForce: number
  centerForce: number
  linkDistance: number
  computedStyleMap: Record<string, string>
  color: (d: NodeData) => string
  nodeRadius: (d: NodeData) => number
}) {
  const { states, stateById } = layoutGraph3D(
    graphData,
    width,
    height,
    repelForce,
    centerForce,
    linkDistance,
  )
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(56, width / height, 1, 12000)
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  })
  renderer.setClearAlpha(0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  graph.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.rotateSpeed = 0.55
  controls.zoomSpeed = 0.75
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.32

  const graphGroup = new THREE.Group()
  scene.add(graphGroup)

  scene.add(new THREE.AmbientLight(0xffffff, 0.72))
  const keyLight = new THREE.PointLight(0xffffff, 1.3)
  keyLight.position.set(400, 500, 800)
  scene.add(keyLight)

  const nodeGeometry = new THREE.SphereGeometry(1, 18, 14)
  const nodeMeshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshLambertMaterial>[] = []
  const materials = new Set<THREE.Material>()
  const grayColor = cssColor(computedStyleMap["--gray"], "#8f8f8f")
  const tertiaryColor = cssColor(computedStyleMap["--tertiary"], "#84a59d")

  for (const state of states) {
    const isTagNode = state.node.id.startsWith("tags/")
    const nodeColor = isTagNode ? tertiaryColor : cssColor(color(state.node), "#8f8f8f")
    const material = new THREE.MeshLambertMaterial({
      color: nodeColor,
      emissive: isTagNode ? tertiaryColor : nodeColor,
      emissiveIntensity: isTagNode ? 0.28 : 0.12,
    })
    materials.add(material)

    const mesh = new THREE.Mesh(nodeGeometry, material)
    const radius = Math.max(4.2, nodeRadius(state.node) * 2.25)
    mesh.position.set(state.x, state.y, state.z)
    mesh.scale.setScalar(radius)
    mesh.userData = {
      node: state.node,
      baseScale: radius,
      baseEmissiveIntensity: material.emissiveIntensity,
    }
    graphGroup.add(mesh)
    nodeMeshes.push(mesh)
  }

  const linkPositions = new Float32Array(graphData.links.length * 6)
  graphData.links.forEach((link, index) => {
    const source = stateById.get(link.source.id)
    const target = stateById.get(link.target.id)
    if (!source || !target) return
    const offset = index * 6
    linkPositions[offset] = source.x
    linkPositions[offset + 1] = source.y
    linkPositions[offset + 2] = source.z
    linkPositions[offset + 3] = target.x
    linkPositions[offset + 4] = target.y
    linkPositions[offset + 5] = target.z
  })

  const linkGeometry = new THREE.BufferGeometry()
  linkGeometry.setAttribute("position", new THREE.BufferAttribute(linkPositions, 3))
  const linkMaterial = new THREE.LineBasicMaterial({
    color: grayColor,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  })
  materials.add(linkMaterial)
  graphGroup.add(new THREE.LineSegments(linkGeometry, linkMaterial))

  const boundingBox = new THREE.Box3().setFromObject(graphGroup)
  const boundingSphere = new THREE.Sphere()
  boundingBox.getBoundingSphere(boundingSphere)
  const cameraDistance = Math.max(260, boundingSphere.radius * 1.85)
  camera.position.set(0, 0, cameraDistance)
  controls.minDistance = Math.max(45, boundingSphere.radius * 0.18)
  controls.maxDistance = Math.max(900, boundingSphere.radius * 6)
  controls.target.copy(boundingSphere.center)
  controls.update()

  const tooltip = document.createElement("div")
  tooltip.className = "global-graph-tooltip"
  graph.appendChild(tooltip)

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let hoveredMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshLambertMaterial> | null = null
  let pointerDown: { x: number; y: number } | null = null

  function positionTooltip(event: PointerEvent) {
    const rect = graph.getBoundingClientRect()
    const x = Math.min(Math.max(event.clientX - rect.left + 14, 8), rect.width - 16)
    const y = Math.min(Math.max(event.clientY - rect.top + 14, 8), rect.height - 16)
    tooltip.style.transform = `translate3d(${x}px, ${y}px, 0)`
  }

  function setHoveredMesh(
    nextMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshLambertMaterial> | null,
    event?: PointerEvent,
  ) {
    if (hoveredMesh === nextMesh) {
      if (nextMesh && event) positionTooltip(event)
      return
    }

    if (hoveredMesh) {
      hoveredMesh.scale.setScalar(hoveredMesh.userData.baseScale)
      hoveredMesh.material.emissiveIntensity = hoveredMesh.userData.baseEmissiveIntensity
    }

    hoveredMesh = nextMesh
    if (hoveredMesh) {
      hoveredMesh.scale.setScalar(hoveredMesh.userData.baseScale * 1.55)
      hoveredMesh.material.emissiveIntensity = Math.max(
        hoveredMesh.userData.baseEmissiveIntensity,
        0.35,
      )
      tooltip.textContent = hoveredMesh.userData.node.text
      tooltip.classList.add("active")
      if (event) positionTooltip(event)
      renderer.domElement.style.cursor = "pointer"
    } else {
      tooltip.classList.remove("active")
      tooltip.style.transform = "translate3d(-9999px, -9999px, 0)"
      renderer.domElement.style.cursor = ""
    }
  }

  function pickNode(event: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(nodeMeshes, false)[0]?.object as
      | THREE.Mesh<THREE.SphereGeometry, THREE.MeshLambertMaterial>
      | undefined
    setHoveredMesh(hit ?? null, event)
  }

  function handlePointerMove(event: PointerEvent) {
    pickNode(event)
  }

  function handlePointerDown(event: PointerEvent) {
    pointerDown = { x: event.clientX, y: event.clientY }
  }

  function handlePointerUp(event: PointerEvent) {
    if (!pointerDown || !hoveredMesh) return
    const dx = event.clientX - pointerDown.x
    const dy = event.clientY - pointerDown.y
    pointerDown = null
    if (Math.sqrt(dx * dx + dy * dy) > 6) return

    const node = hoveredMesh.userData.node as NodeData
    const targ = resolveRelative(fullSlug, node.id)
    window.spaNavigate(new URL(targ, window.location.toString()))
  }

  function handlePointerLeave() {
    pointerDown = null
    setHoveredMesh(null)
  }

  renderer.domElement.addEventListener("pointermove", handlePointerMove)
  renderer.domElement.addEventListener("pointerdown", handlePointerDown)
  renderer.domElement.addEventListener("pointerup", handlePointerUp)
  renderer.domElement.addEventListener("pointerleave", handlePointerLeave)

  let stopAnimation = false
  function animate() {
    if (stopAnimation) return
    controls.update()
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
  return () => {
    stopAnimation = true
    renderer.domElement.removeEventListener("pointermove", handlePointerMove)
    renderer.domElement.removeEventListener("pointerdown", handlePointerDown)
    renderer.domElement.removeEventListener("pointerup", handlePointerUp)
    renderer.domElement.removeEventListener("pointerleave", handlePointerLeave)
    controls.dispose()
    nodeGeometry.dispose()
    linkGeometry.dispose()
    materials.forEach((material) => material.dispose())
    renderer.dispose()
  }
}

async function renderGraph(graph: HTMLElement, fullSlug: FullSlug) {
  const slug = simplifySlug(fullSlug)
  const visited = getVisited()
  removeAllChildren(graph)

  let {
    drag: enableDrag,
    zoom: enableZoom,
    depth,
    scale,
    repelForce,
    centerForce,
    linkDistance,
    fontSize,
    opacityScale,
    removeTags,
    showTags,
    focusOnHover,
    enableRadial,
  } = JSON.parse(graph.dataset["cfg"]!) as D3Config

  const data: Map<SimpleSlug, ContentDetails> = new Map(
    Object.entries<ContentDetails>(await fetchData).map(([k, v]) => [
      simplifySlug(k as FullSlug),
      v,
    ]),
  )
  const links: SimpleLinkData[] = []
  const tags: SimpleSlug[] = []
  const validLinks = new Set(data.keys())

  const tweens = new Map<string, TweenNode>()
  for (const [source, details] of data.entries()) {
    const outgoing = details.links ?? []

    for (const dest of outgoing) {
      if (validLinks.has(dest)) {
        links.push({ source: source, target: dest })
      }
    }

    if (showTags) {
      const localTags = details.tags
        .filter((tag) => !removeTags.includes(tag))
        .map((tag) => simplifySlug(("tags/" + tag) as FullSlug))

      tags.push(...localTags.filter((tag) => !tags.includes(tag)))

      for (const tag of localTags) {
        links.push({ source: source, target: tag })
      }
    }
  }

  const neighbourhood = new Set<SimpleSlug>()
  const wl: (SimpleSlug | "__SENTINEL")[] = [slug, "__SENTINEL"]
  if (depth >= 0) {
    while (depth >= 0 && wl.length > 0) {
      // compute neighbours
      const cur = wl.shift()!
      if (cur === "__SENTINEL") {
        depth--
        wl.push("__SENTINEL")
      } else {
        neighbourhood.add(cur)
        const outgoing = links.filter((l) => l.source === cur)
        const incoming = links.filter((l) => l.target === cur)
        wl.push(...outgoing.map((l) => l.target), ...incoming.map((l) => l.source))
      }
    }
  } else {
    validLinks.forEach((id) => neighbourhood.add(id))
    if (showTags) tags.forEach((tag) => neighbourhood.add(tag))
  }

  const nodes = [...neighbourhood].map((url) => {
    const text = url.startsWith("tags/") ? "#" + url.substring(5) : (data.get(url)?.title ?? url)
    return {
      id: url,
      text,
      tags: data.get(url)?.tags ?? [],
    }
  })
  const graphData: { nodes: NodeData[]; links: LinkData[] } = {
    nodes,
    links: links
      .filter((l) => neighbourhood.has(l.source) && neighbourhood.has(l.target))
      .map((l) => ({
        source: nodes.find((n) => n.id === l.source)!,
        target: nodes.find((n) => n.id === l.target)!,
      })),
  }

  const width = graph.offsetWidth
  const height = Math.max(graph.offsetHeight, 250)

  // precompute style prop strings as pixi doesn't support css variables
  const cssVars = [
    "--secondary",
    "--tertiary",
    "--gray",
    "--light",
    "--lightgray",
    "--dark",
    "--darkgray",
    "--bodyFont",
  ] as const
  const computedStyleMap = cssVars.reduce(
    (acc, key) => {
      acc[key] = getComputedStyle(document.documentElement).getPropertyValue(key)
      return acc
    },
    {} as Record<(typeof cssVars)[number], string>,
  )

  // calculate color
  const color = (d: NodeData) => {
    const isCurrent = d.id === slug
    if (isCurrent) {
      return computedStyleMap["--secondary"]
    } else if (visited.has(d.id) || d.id.startsWith("tags/")) {
      return computedStyleMap["--tertiary"]
    } else {
      return computedStyleMap["--gray"]
    }
  }

  function nodeRadius(d: NodeData) {
    const numLinks = graphData.links.filter(
      (l) => l.source.id === d.id || l.target.id === d.id,
    ).length
    return 2 + Math.sqrt(numLinks)
  }

  const renderMode = (graph.dataset["renderer"] ?? "2d") as GraphRenderMode
  if (renderMode === "3d") {
    try {
      return renderGraph3D({
        graph,
        fullSlug,
        graphData,
        width,
        height,
        repelForce,
        centerForce,
        linkDistance,
        computedStyleMap,
        color,
        nodeRadius,
      })
    } catch (err) {
      console.error("Failed to initialize 3D graph, falling back to 2D", err)
      graph.dataset["renderer"] = "2d"
      removeAllChildren(graph)
    }
  }

  // we virtualize the simulation and use pixi to actually render it
  const simulation: Simulation<NodeData, LinkData> = forceSimulation<NodeData>(graphData.nodes)
    .force("charge", forceManyBody().strength(-100 * repelForce))
    .force("center", forceCenter().strength(centerForce))
    .force("link", forceLink(graphData.links).distance(linkDistance))
    .force("collide", forceCollide<NodeData>((n) => nodeRadius(n)).iterations(3))

  const radius = (Math.min(width, height) / 2) * 0.8
  if (enableRadial) simulation.force("radial", forceRadial(radius).strength(0.2))

  let hoveredNodeId: string | null = null
  let hoveredNeighbours: Set<string> = new Set()
  const linkRenderData: LinkRenderData[] = []
  const nodeRenderData: NodeRenderData[] = []
  function updateHoverInfo(newHoveredId: string | null) {
    hoveredNodeId = newHoveredId

    if (newHoveredId === null) {
      hoveredNeighbours = new Set()
      for (const n of nodeRenderData) {
        n.active = false
      }

      for (const l of linkRenderData) {
        l.active = false
      }
    } else {
      hoveredNeighbours = new Set()
      for (const l of linkRenderData) {
        const linkData = l.simulationData
        if (linkData.source.id === newHoveredId || linkData.target.id === newHoveredId) {
          hoveredNeighbours.add(linkData.source.id)
          hoveredNeighbours.add(linkData.target.id)
        }

        l.active = linkData.source.id === newHoveredId || linkData.target.id === newHoveredId
      }

      for (const n of nodeRenderData) {
        n.active = hoveredNeighbours.has(n.simulationData.id)
      }
    }
  }

  let dragStartTime = 0
  let dragging = false

  function renderLinks() {
    tweens.get("link")?.stop()
    const tweenGroup = new TweenGroup()

    for (const l of linkRenderData) {
      let alpha = 1

      // if we are hovering over a node, we want to highlight the immediate neighbours
      // with full alpha and the rest with default alpha
      if (hoveredNodeId) {
        alpha = l.active ? 1 : 0.2
      }

      l.color = l.active ? computedStyleMap["--gray"] : computedStyleMap["--lightgray"]
      tweenGroup.add(new Tweened<LinkRenderData>(l).to({ alpha }, 200))
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("link", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderLabels() {
    tweens.get("label")?.stop()
    const tweenGroup = new TweenGroup()

    const defaultScale = 1 / scale
    const activeScale = defaultScale * 1.1
    for (const n of nodeRenderData) {
      const nodeId = n.simulationData.id

      if (hoveredNodeId === nodeId) {
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: 1,
              scale: { x: activeScale, y: activeScale },
            },
            100,
          ),
        )
      } else {
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: n.label.alpha,
              scale: { x: defaultScale, y: defaultScale },
            },
            100,
          ),
        )
      }
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("label", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderNodes() {
    tweens.get("hover")?.stop()

    const tweenGroup = new TweenGroup()
    for (const n of nodeRenderData) {
      let alpha = 1

      // if we are hovering over a node, we want to highlight the immediate neighbours
      if (hoveredNodeId !== null && focusOnHover) {
        alpha = n.active ? 1 : 0.2
      }

      tweenGroup.add(new Tweened<Graphics>(n.gfx, tweenGroup).to({ alpha }, 200))
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("hover", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderPixiFromD3() {
    renderNodes()
    renderLinks()
    renderLabels()
  }

  tweens.forEach((tween) => tween.stop())
  tweens.clear()

  const app = new Application()
  await app.init({
    width,
    height,
    antialias: true,
    autoStart: false,
    autoDensity: true,
    backgroundAlpha: 0,
    preference: "webgl",
    resolution: window.devicePixelRatio,
    eventMode: "static",
  })
  graph.appendChild(app.canvas)

  const stage = app.stage
  stage.interactive = false

  const labelsContainer = new Container<Text>({ zIndex: 3, isRenderGroup: true })
  const nodesContainer = new Container<Graphics>({ zIndex: 2, isRenderGroup: true })
  const linkContainer = new Container<Graphics>({ zIndex: 1, isRenderGroup: true })
  stage.addChild(nodesContainer, labelsContainer, linkContainer)

  for (const n of graphData.nodes) {
    const nodeId = n.id

    const label = new Text({
      interactive: false,
      eventMode: "none",
      text: n.text,
      alpha: 0,
      anchor: { x: 0.5, y: 1.2 },
      style: {
        fontSize: fontSize * 15,
        fill: computedStyleMap["--dark"],
        fontFamily: computedStyleMap["--bodyFont"],
      },
      resolution: window.devicePixelRatio * 4,
    })
    label.scale.set(1 / scale)

    let oldLabelOpacity = 0
    const isTagNode = nodeId.startsWith("tags/")
    const gfx = new Graphics({
      interactive: true,
      label: nodeId,
      eventMode: "static",
      hitArea: new Circle(0, 0, nodeRadius(n)),
      cursor: "pointer",
    })
      .circle(0, 0, nodeRadius(n))
      .fill({ color: isTagNode ? computedStyleMap["--light"] : color(n) })
      .on("pointerover", (e) => {
        updateHoverInfo(e.target.label)
        oldLabelOpacity = label.alpha
        if (!dragging) {
          renderPixiFromD3()
        }
      })
      .on("pointerleave", () => {
        updateHoverInfo(null)
        label.alpha = oldLabelOpacity
        if (!dragging) {
          renderPixiFromD3()
        }
      })

    if (isTagNode) {
      gfx.stroke({ width: 2, color: computedStyleMap["--tertiary"] })
    }

    nodesContainer.addChild(gfx)
    labelsContainer.addChild(label)

    const nodeRenderDatum: NodeRenderData = {
      simulationData: n,
      gfx,
      label,
      color: color(n),
      alpha: 1,
      active: false,
    }

    nodeRenderData.push(nodeRenderDatum)
  }

  for (const l of graphData.links) {
    const gfx = new Graphics({ interactive: false, eventMode: "none" })
    linkContainer.addChild(gfx)

    const linkRenderDatum: LinkRenderData = {
      simulationData: l,
      gfx,
      color: computedStyleMap["--lightgray"],
      alpha: 1,
      active: false,
    }

    linkRenderData.push(linkRenderDatum)
  }

  let currentTransform = zoomIdentity
  if (enableDrag) {
    select<HTMLCanvasElement, NodeData | undefined>(app.canvas).call(
      drag<HTMLCanvasElement, NodeData | undefined>()
        .container(() => app.canvas)
        .subject(() => graphData.nodes.find((n) => n.id === hoveredNodeId))
        .on("start", function dragstarted(event) {
          if (!event.active) simulation.alphaTarget(1).restart()
          event.subject.fx = event.subject.x
          event.subject.fy = event.subject.y
          event.subject.__initialDragPos = {
            x: event.subject.x,
            y: event.subject.y,
            fx: event.subject.fx,
            fy: event.subject.fy,
          }
          dragStartTime = Date.now()
          dragging = true
        })
        .on("drag", function dragged(event) {
          const initPos = event.subject.__initialDragPos
          event.subject.fx = initPos.x + (event.x - initPos.x) / currentTransform.k
          event.subject.fy = initPos.y + (event.y - initPos.y) / currentTransform.k
        })
        .on("end", function dragended(event) {
          if (!event.active) simulation.alphaTarget(0)
          event.subject.fx = null
          event.subject.fy = null
          dragging = false

          // if the time between mousedown and mouseup is short, we consider it a click
          if (Date.now() - dragStartTime < 500) {
            const node = graphData.nodes.find((n) => n.id === event.subject.id) as NodeData
            const targ = resolveRelative(fullSlug, node.id)
            window.spaNavigate(new URL(targ, window.location.toString()))
          }
        }),
    )
  } else {
    for (const node of nodeRenderData) {
      node.gfx.on("click", () => {
        const targ = resolveRelative(fullSlug, node.simulationData.id)
        window.spaNavigate(new URL(targ, window.location.toString()))
      })
    }
  }

  if (enableZoom) {
    select<HTMLCanvasElement, NodeData>(app.canvas).call(
      zoom<HTMLCanvasElement, NodeData>()
        .extent([
          [0, 0],
          [width, height],
        ])
        .scaleExtent([0.25, 4])
        .on("zoom", ({ transform }) => {
          currentTransform = transform
          stage.scale.set(transform.k, transform.k)
          stage.position.set(transform.x, transform.y)

          // zoom adjusts opacity of labels too
          const scale = transform.k * opacityScale
          let scaleOpacity = Math.max((scale - 1) / 3.75, 0)
          const activeNodes = nodeRenderData.filter((n) => n.active).flatMap((n) => n.label)

          for (const label of labelsContainer.children) {
            if (!activeNodes.includes(label)) {
              label.alpha = scaleOpacity
            }
          }
        }),
    )
  }

  let stopAnimation = false
  function animate(time: number) {
    if (stopAnimation) return
    for (const n of nodeRenderData) {
      const { x, y } = n.simulationData
      if (!x || !y) continue
      n.gfx.position.set(x + width / 2, y + height / 2)
      if (n.label) {
        n.label.position.set(x + width / 2, y + height / 2)
      }
    }

    for (const l of linkRenderData) {
      const linkData = l.simulationData
      l.gfx.clear()
      l.gfx.moveTo(linkData.source.x! + width / 2, linkData.source.y! + height / 2)
      l.gfx
        .lineTo(linkData.target.x! + width / 2, linkData.target.y! + height / 2)
        .stroke({ alpha: l.alpha, width: 1, color: l.color })
    }

    tweens.forEach((t) => t.update(time))
    app.renderer.render(stage)
    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
  return () => {
    stopAnimation = true
    app.destroy()
  }
}

let localGraphCleanups: (() => void)[] = []
let localGraphObserver: IntersectionObserver | undefined
let localGraphRenderSeq = 0
let globalGraphCleanups: (() => void)[] = []
let bodyOverflowBeforeGlobalGraph: string | null = null
let globalGraphFocusReturn: HTMLElement | null = null
let globalGraphRenderSeq = 0
let globalGraphResizeTimeout: ReturnType<typeof setTimeout> | undefined
type GlobalGraphOrigin = { parent: Node; nextSibling: ChildNode | null }
const globalGraphOrigins = new WeakMap<HTMLElement, GlobalGraphOrigin>()

function getGlobalGraphContainers() {
  return [...document.getElementsByClassName("global-graph-outer")] as HTMLElement[]
}

function ensureGlobalGraphPortals(containers = getGlobalGraphContainers()) {
  for (const container of containers) {
    if (container.parentElement !== document.body) {
      if (container.parentNode && !globalGraphOrigins.has(container)) {
        globalGraphOrigins.set(container, {
          parent: container.parentNode,
          nextSibling: container.nextSibling,
        })
      }
      document.body.appendChild(container)
    }
  }

  return containers
}

function restoreGlobalGraphPortals(containers = getGlobalGraphContainers()) {
  for (const container of containers) {
    const origin = globalGraphOrigins.get(container)
    if (!origin) continue

    if (origin.parent.isConnected) {
      origin.parent.insertBefore(
        container,
        origin.nextSibling?.parentNode === origin.parent ? origin.nextSibling : null,
      )
    } else {
      container.remove()
    }
    globalGraphOrigins.delete(container)
  }
}

function cleanupLocalGraphs() {
  localGraphRenderSeq++
  localGraphObserver?.disconnect()
  localGraphObserver = undefined

  for (const cleanup of localGraphCleanups) {
    cleanup()
  }
  localGraphCleanups = []
}

function cleanupGlobalGraphs() {
  for (const cleanup of globalGraphCleanups) {
    cleanup()
  }
  globalGraphCleanups = []
}

function lockBodyScroll() {
  if (bodyOverflowBeforeGlobalGraph !== null) return
  bodyOverflowBeforeGlobalGraph = document.body.style.overflow
  document.body.style.overflow = "hidden"
}

function restoreBodyScroll() {
  if (bodyOverflowBeforeGlobalGraph === null) return
  document.body.style.overflow = bodyOverflowBeforeGlobalGraph
  bodyOverflowBeforeGlobalGraph = null
}

async function renderGraphSafely(graph: HTMLElement, slug: FullSlug) {
  try {
    return await renderGraph(graph, slug)
  } catch (err) {
    console.error("Failed to render graph", err)
    removeAllChildren(graph)
    return undefined
  }
}

document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  const slug = e.detail.url
  addToVisited(simplifySlug(slug))

  async function renderLocalGraph() {
    cleanupLocalGraphs()
    const localGraphContainers = [
      ...document.getElementsByClassName("graph-container"),
    ] as HTMLElement[]
    const renderSeq = ++localGraphRenderSeq

    const renderVisibleGraph = async (container: HTMLElement) => {
      if (container.dataset["graphRenderState"] === "rendered") return

      container.dataset["graphRenderState"] = "rendering"
      const cleanup = await renderGraphSafely(container, slug)

      if (renderSeq !== localGraphRenderSeq || !container.isConnected) {
        cleanup?.()
        return
      }

      container.dataset["graphRenderState"] = "rendered"
      if (cleanup) {
        localGraphCleanups.push(() => {
          cleanup()
          delete container.dataset["graphRenderState"]
        })
      }
    }

    if (!("IntersectionObserver" in window)) {
      for (const container of localGraphContainers) {
        void renderVisibleGraph(container)
      }
      return
    }

    localGraphObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue

          const container = entry.target as HTMLElement
          observer.unobserve(container)
          void renderVisibleGraph(container)
        }
      },
      {
        rootMargin: "240px 0px",
        threshold: 0.01,
      },
    )

    for (const container of localGraphContainers) {
      localGraphObserver.observe(container)
    }
  }

  let containers = ensureGlobalGraphPortals()

  const anyGlobalGraphOpen = () =>
    containers.some((container) => container.classList.contains("active"))

  function updateGlobalGraphModeControls(container: HTMLElement) {
    const graphContainer = container.querySelector(".global-graph-container") as HTMLElement | null
    const renderMode = (graphContainer?.dataset["renderer"] ?? "2d") as GraphRenderMode
    const buttons = container.querySelectorAll<HTMLButtonElement>(".global-graph-mode")

    for (const button of buttons) {
      const isActive = button.dataset["graphMode"] === renderMode
      button.classList.toggle("active", isActive)
      button.setAttribute("aria-pressed", String(isActive))
    }
  }

  containers.forEach(updateGlobalGraphModeControls)

  async function renderOpenGlobalGraphs() {
    containers = ensureGlobalGraphPortals(containers)
    cleanupGlobalGraphs()
    const renderSeq = ++globalGraphRenderSeq
    const slug = getFullSlug(window)
    for (const container of containers) {
      if (!container.classList.contains("active")) continue

      const graphContainer = container.querySelector(".global-graph-container") as HTMLElement
      if (graphContainer) {
        const cleanup = await renderGraphSafely(graphContainer, slug)
        updateGlobalGraphModeControls(container)
        if (renderSeq === globalGraphRenderSeq && container.classList.contains("active")) {
          if (cleanup) globalGraphCleanups.push(cleanup)
        } else {
          cleanup?.()
          if (!container.classList.contains("active")) {
            removeAllChildren(graphContainer)
          }
        }
      }
    }
  }

  async function renderGlobalGraph() {
    containers = ensureGlobalGraphPortals(containers)
    if (!anyGlobalGraphOpen()) {
      globalGraphFocusReturn =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
    }
    lockBodyScroll()
    for (const container of containers) {
      container.classList.add("active")
      updateGlobalGraphModeControls(container)
    }
    containers[0]?.querySelector<HTMLElement>(".global-graph-close")?.focus()
    await renderOpenGlobalGraphs()
  }

  function hideGlobalGraph() {
    containers = ensureGlobalGraphPortals(containers)
    globalGraphRenderSeq++
    if (globalGraphResizeTimeout) {
      clearTimeout(globalGraphResizeTimeout)
      globalGraphResizeTimeout = undefined
    }
    cleanupGlobalGraphs()
    restoreBodyScroll()
    for (const container of containers) {
      container.classList.remove("active")
      const graphContainer = container.querySelector(".global-graph-container") as HTMLElement
      if (graphContainer) {
        removeAllChildren(graphContainer)
      }
    }
    restoreGlobalGraphPortals(containers)
    if (globalGraphFocusReturn?.isConnected) {
      globalGraphFocusReturn.focus()
    }
    globalGraphFocusReturn = null
  }

  function handleGlobalGraphResize() {
    if (!anyGlobalGraphOpen()) return
    if (globalGraphResizeTimeout) clearTimeout(globalGraphResizeTimeout)
    globalGraphResizeTimeout = setTimeout(() => {
      globalGraphResizeTimeout = undefined
      void renderOpenGlobalGraphs()
    }, 150)
  }

  function shortcutHandler(e: HTMLElementEventMap["keydown"]) {
    if (e.key === "g" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault()
      anyGlobalGraphOpen() ? hideGlobalGraph() : renderGlobalGraph()
    }
  }

  for (const container of containers) {
    registerEscapeHandler(container, hideGlobalGraph)
  }

  const containerIcons = document.getElementsByClassName("global-graph-icon")
  Array.from(containerIcons).forEach((icon) => {
    icon.addEventListener("click", renderGlobalGraph)
    window.addCleanup(() => icon.removeEventListener("click", renderGlobalGraph))
  })

  const modeButtons = document.getElementsByClassName("global-graph-mode")
  Array.from(modeButtons).forEach((button) => {
    const modeButton = button as HTMLButtonElement
    const setGraphMode = () => {
      const renderMode = modeButton.dataset["graphMode"] as GraphRenderMode | undefined
      if (renderMode !== "2d" && renderMode !== "3d") return

      const container = modeButton.closest(".global-graph-outer") as HTMLElement | null
      const graphContainer = container?.querySelector(
        ".global-graph-container",
      ) as HTMLElement | null
      if (!container || !graphContainer || graphContainer.dataset["renderer"] === renderMode) {
        return
      }

      graphContainer.dataset["renderer"] = renderMode
      updateGlobalGraphModeControls(container)
      if (container.classList.contains("active")) {
        void renderOpenGlobalGraphs()
      }
    }

    modeButton.addEventListener("click", setGraphMode)
    window.addCleanup(() => modeButton.removeEventListener("click", setGraphMode))
  })

  const closeButtons = document.getElementsByClassName("global-graph-close")
  Array.from(closeButtons).forEach((button) => {
    button.addEventListener("click", hideGlobalGraph)
    window.addCleanup(() => button.removeEventListener("click", hideGlobalGraph))
  })

  document.addEventListener("keydown", shortcutHandler)
  window.addEventListener("resize", handleGlobalGraphResize)

  let handleThemeChange: (() => void) | undefined
  window.addCleanup(() => {
    if (handleThemeChange) {
      document.removeEventListener("themechange", handleThemeChange)
    }
    document.removeEventListener("keydown", shortcutHandler)
    window.removeEventListener("resize", handleGlobalGraphResize)
    if (globalGraphResizeTimeout) clearTimeout(globalGraphResizeTimeout)
    globalGraphRenderSeq++
    cleanupLocalGraphs()
    cleanupGlobalGraphs()
    restoreBodyScroll()
    restoreGlobalGraphPortals(containers)
  })

  await renderLocalGraph()
  handleThemeChange = () => {
    void renderLocalGraph()
    if (anyGlobalGraphOpen()) {
      void renderOpenGlobalGraphs()
    }
  }
  document.addEventListener("themechange", handleThemeChange)
})
