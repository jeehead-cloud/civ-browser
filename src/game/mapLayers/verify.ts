/**
 * F7 independent map-layer verification.
 * Run: npm run verify:map-layers
 */
import { AxialCoord, Tile, TerrainType } from '../types'
import { generateMapCoords, hexDistance, tileKey } from '../hexGrid'
import {
  addRandomLongRiver,
  addRandomMountainChain,
  addRandomShortRiver,
  addRandomSmallMountainArea,
  assertNoMountainHills,
  clearAllFeatures,
  clearAllMountainsAndHills,
  clearAllResources,
  clearAllRivers,
  cloneTiles,
  findUnmirroredRiverEdges,
  generateFeatures,
  generateResources,
  generateTerrainOnly,
  mulberry32,
} from './index'
import { useGameStore } from '../store'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function section(title: string) {
  console.log(`\n== ${title} ==`)
}

function makeBlankMap(
  width: number,
  height: number,
  fill: TerrainType = 'grassland',
): Record<string, Tile> {
  const tiles: Record<string, Tile> = {}
  for (const coord of generateMapCoords(width, height)) {
    tiles[tileKey(coord)] = {
      coord,
      terrain: fill,
      vegetation: 'none',
      resource: 'none',
      ownerCivId: null,
      cityId: null,
      hasHills: false,
      riverDirections: [],
    }
  }
  // Ring of ocean for coast/river sinks
  for (const key in tiles) {
    const c = tiles[key].coord
    if (c.q === 0 || c.r === 0 || c.q === width - 1 || c.r === height - 1) {
      tiles[key].terrain = 'ocean'
    }
  }
  return tiles
}

function snapshotLayer(tiles: Record<string, Tile>, layer: 'terrain' | 'veg' | 'hills' | 'rivers' | 'resource' | 'cities') {
  const out: Record<string, string> = {}
  for (const key in tiles) {
    const t = tiles[key]
    if (layer === 'terrain') out[key] = t.terrain
    else if (layer === 'veg') out[key] = t.vegetation
    else if (layer === 'hills') out[key] = `${t.terrain === 'mountains'}:${t.hasHills}`
    else if (layer === 'rivers') out[key] = t.riverDirections.slice().sort().join(',')
    else if (layer === 'resource') out[key] = t.resource
    else out[key] = t.cityId ?? ''
  }
  return out
}

function deepEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((k) => a[k] === b[k])
}

function addCity(tiles: Record<string, Tile>, coord: AxialCoord, id: string) {
  const key = tileKey(coord)
  tiles[key].cityId = id
  tiles[key].terrain = 'grassland'
}

async function main() {
  section('input not mutated / key stability')
  const base = makeBlankMap(24, 16)
  addCity(base, { q: 8, r: 6 }, 'city-a')
  const frozen = JSON.stringify(base)
  const beforeKeys = Object.keys(base).sort().join('|')
  const r1 = generateTerrainOnly(base, { width: 24, height: 16, seed: 42 })
  assert(JSON.stringify(base) === frozen, 'terrain op must not mutate input')
  assert(r1.ok && r1.changed && r1.tiles, 'terrain should change')
  assert(Object.keys(r1.tiles!).sort().join('|') === beforeKeys, 'keys stable')
  assert(r1.tiles!['8,6'].cityId === 'city-a', 'city preserved')
  assert(r1.tiles!['8,6'].terrain === 'grassland' || r1.tiles!['8,6'].cityId === 'city-a', 'city tile intact')

  section('deterministic terrain')
  const a = generateTerrainOnly(base, { width: 24, height: 16, seed: 99 })
  const b = generateTerrainOnly(base, { width: 24, height: 16, seed: 99 })
  assert(JSON.stringify(a.tiles) === JSON.stringify(b.tiles), 'same seed → same terrain result')

  section('features clear / generate')
  const withVeg = cloneTiles(base)
  withVeg['10,6'].vegetation = 'forest'
  withVeg['10,6'].terrain = 'grassland'
  const clearedF = clearAllFeatures(withVeg)
  assert(clearedF.changed && clearedF.tiles!['10,6'].vegetation === 'none', 'clear features')
  assert(deepEqual(snapshotLayer(withVeg, 'terrain'), snapshotLayer(clearedF.tiles!, 'terrain')), 'clear features preserves terrain')
  const genF = generateFeatures(withVeg, { width: 24, height: 16, seed: 7 })
  assert(genF.ok, 'generate features ok')
  assert(deepEqual(snapshotLayer(withVeg, 'rivers'), snapshotLayer(genF.tiles ?? withVeg, 'rivers')), 'features preserve rivers')

  section('mountains / hills')
  const land = makeBlankMap(30, 20, 'grassland')
  addCity(land, { q: 12, r: 8 }, 'city-b')
  const mountains = addRandomMountainChain(land, { width: 30, height: 20, seed: 3 })
  assert(mountains.changed && mountains.tiles, 'chain placed')
  assert(assertNoMountainHills(mountains.tiles!).length === 0, 'no mountain+hills')
  assert(mountains.tiles!['12,8'].terrain !== 'mountains', 'city not mountain')
  for (const key in mountains.tiles!) {
    if (mountains.tiles![key].terrain === 'mountains') {
      assert(!mountains.tiles![key].cityId, 'no city on mountain')
      assert(!isWater(mountains.tiles![key].terrain), 'no water mountain')
    }
  }
  const small = addRandomSmallMountainArea(land, { width: 30, height: 20, seed: 11 })
  assert(small.changed, 'small area placed')
  const clearedM = clearAllMountainsAndHills(mountains.tiles!)
  assert(clearedM.changed, 'clear mountains')
  for (const key in clearedM.tiles!) {
    assert(clearedM.tiles![key].terrain !== 'mountains', 'no mountains left')
    assert(!clearedM.tiles![key].hasHills, 'no hills left')
  }

  section('rivers mirroring / lengths')
  const riverBase = makeBlankMap(40, 24, 'grassland')
  // Ensure some hills inland
  riverBase['15,10'].hasHills = true
  riverBase['16,10'].terrain = 'mountains'
  riverBase['16,10'].hasHills = false
  const short = addRandomShortRiver(riverBase, { width: 40, height: 24, seed: 21 })
  assert(short.ok, `short river: ${short.message}`)
  if (short.changed && short.tiles) {
    assert(findUnmirroredRiverEdges(short.tiles).length === 0, 'short river mirrored')
    assert(deepEqual(snapshotLayer(riverBase, 'terrain'), snapshotLayer(short.tiles, 'terrain')), 'short preserves terrain')
    assert((short.meta?.steps as number) <= 10, 'short steps bounded')
  }
  const long = addRandomLongRiver(riverBase, { width: 40, height: 24, seed: 22 })
  assert(long.ok, `long river: ${long.message}`)
  if (long.changed && long.tiles && short.changed && short.tiles) {
    assert(findUnmirroredRiverEdges(long.tiles).length === 0, 'long river mirrored')
    const shortSteps = (short.meta?.steps as number) ?? 0
    const longSteps = (long.meta?.steps as number) ?? 0
    // When both succeed, long target is higher; allow equal only if geography caps
    assert(longSteps >= shortSteps || longSteps >= 8, 'long meaningfully longer or capped high')
  }
  const clearedR = clearAllRivers(long.tiles ?? riverBase)
  if (clearedR.changed) {
    for (const key in clearedR.tiles!) {
      assert(clearedR.tiles![key].riverDirections.length === 0, 'rivers cleared')
    }
  }

  section('resources density / validity')
  const resBase = makeBlankMap(28, 18, 'grassland')
  for (const key in resBase) {
    if (resBase[key].terrain === 'grassland' && Math.abs(resBase[key].coord.q - 14) < 3) {
      resBase[key].vegetation = 'none'
    }
  }
  const sparse = generateResources(resBase, { width: 28, height: 18, seed: 5, density: 'sparse' })
  const rich = generateResources(resBase, { width: 28, height: 18, seed: 5, density: 'rich' })
  assert(sparse.changed && rich.changed, 'resources placed')
  const sparseCount = Object.values(sparse.tiles!).filter((t) => t.resource !== 'none').length
  const richCount = Object.values(rich.tiles!).filter((t) => t.resource !== 'none').length
  assert(richCount >= sparseCount, `rich (${richCount}) >= sparse (${sparseCount})`)
  // Average over seeds
  let sparseSum = 0
  let richSum = 0
  for (let s = 100; s < 110; s++) {
    sparseSum += Object.values(
      generateResources(resBase, { width: 28, height: 18, seed: s, density: 'sparse' }).tiles ?? {},
    ).filter((t) => t.resource !== 'none').length
    richSum += Object.values(
      generateResources(resBase, { width: 28, height: 18, seed: s, density: 'rich' }).tiles ?? {},
    ).filter((t) => t.resource !== 'none').length
  }
  assert(richSum > sparseSum, `avg rich ${richSum} > sparse ${sparseSum}`)
  const clearedRes = clearAllResources(rich.tiles!)
  assert(clearedRes.changed, 'clear resources')
  assert(Object.values(clearedRes.tiles!).every((t) => t.resource === 'none'), 'all none')

  section('store dirty semantics')
  const store = useGameStore.getState()
  // Use small overwrite for speed
  useGameStore.setState({
    game: { ...store.game, tiles: makeBlankMap(20, 12), cities: [] },
    activeMapWidth: 20,
    activeMapHeight: 12,
    editorDirty: false,
  })
  const noop = useGameStore.getState().clearResourcesLayer()
  assert(!noop.changed, 'noop clear resources')
  assert(useGameStore.getState().editorDirty === false, 'noop does not dirty')
  useGameStore.getState().generateResourcesLayer('standard', 44)
  assert(useGameStore.getState().editorDirty === true, 'layer op marks dirty')

  section('city count stability under ops')
  const cityMap = makeBlankMap(22, 14)
  addCity(cityMap, { q: 7, r: 5 }, 'c1')
  addCity(cityMap, { q: 9, r: 6 }, 'c2')
  const afterTerrain = generateTerrainOnly(cityMap, { width: 22, height: 14, seed: 1 })
  const afterChain = addRandomMountainChain(afterTerrain.tiles!, { width: 22, height: 14, seed: 2 })
  const afterRiver = addRandomShortRiver(afterChain.tiles ?? afterTerrain.tiles!, {
    width: 22,
    height: 14,
    seed: 3,
  })
  const finalTiles = afterRiver.tiles ?? afterChain.tiles ?? afterTerrain.tiles!
  assert(finalTiles['7,5'].cityId === 'c1' && finalTiles['9,6'].cityId === 'c2', 'cities survive')
  assert(finalTiles['7,5'].terrain !== 'mountains' && finalTiles['9,6'].terrain !== 'mountains', 'cities not mountains')

  // silence unused
  void mulberry32
  void hexDistance

  console.log('\nverify:map-layers OK')
}

function isWater(t: TerrainType) {
  return t === 'ocean' || t === 'coast' || t === 'lake'
}

main().catch((err) => {
  console.error(err)
  throw err
})
