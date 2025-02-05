import { describe, it, expect, beforeAll } from 'vitest'
import {
  Builder,
  type TNode,
  createApiInstanceForNode,
  NODE_NAMES,
  getAllAssetsSymbols,
  getRelayChainSymbol,
  NoXCMSupportImplementedError,
  ScenarioNotSupportedError
} from '../src'
import { type ApiPromise } from '@polkadot/api'

const MOCK_AMOUNT = 1000
const MOCK_ADDRESS = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'
const MOCK_POLKADOT_NODE: TNode = 'Acala'
const MOCK_KUSAMA_NODE: TNode = 'Karura'

const getAssetsForNode = (node: TNode): string[] => {
  if (node === 'Pendulum') return ['PEN']
  if (node === 'Nodle') return ['NODL']
  if (node === 'Crust') return ['EQD']
  if (node === 'Genshiro') return ['GENS']
  if (node === 'CrustShadow') return ['KAR']
  if (node === 'Integritee') return getAllAssetsSymbols(node).filter(asset => asset !== 'KSM')
  return getAllAssetsSymbols(node)
}

const filteredNodes = NODE_NAMES.filter(node => node !== 'Quartz' && node !== 'Clover')

const findTransferableNodeAndAsset = (
  from: TNode
): { nodeTo: TNode | undefined; asset: string | undefined } => {
  const allFromAssets = getAssetsForNode(from)

  const nodeTo = NODE_NAMES.filter(
    node => getRelayChainSymbol(node) === getRelayChainSymbol(from)
  ).find(node => {
    const nodeAssets = getAllAssetsSymbols(node)
    const commonAsset = nodeAssets.filter(asset => allFromAssets.includes(asset))[0]
    return commonAsset !== undefined
  })

  const foundAsset =
    nodeTo !== undefined
      ? getAllAssetsSymbols(nodeTo).filter(asset => allFromAssets.includes(asset))[0]
      : undefined

  return { nodeTo, asset: foundAsset }
}

describe.sequential('XCM - e2e', () => {
  describe.sequential('RelayToPara', () => {
    it('should create transfer tx - DOT from Relay to Para', async () => {
      const api = await createApiInstanceForNode('Polkadot')
      const tx = Builder(api)
        .to(MOCK_POLKADOT_NODE)
        .amount(MOCK_AMOUNT)
        .address(MOCK_ADDRESS)
        .build()
      expect(tx).toBeDefined()
    })
    it('should create transfer tx - KSM from Relay to Para', async () => {
      const api = await createApiInstanceForNode('Kusama')
      const tx = Builder(api).to(MOCK_KUSAMA_NODE).amount(MOCK_AMOUNT).address(MOCK_ADDRESS).build()
      expect(tx).toBeDefined()
    })
  })

  filteredNodes.forEach(node => {
    describe.sequential(`${node} ParaToPara & ParaToRelay`, () => {
      let api: ApiPromise
      const { nodeTo, asset } = findTransferableNodeAndAsset(node)
      beforeAll(async () => {
        api = await createApiInstanceForNode(node)
      })
      it(`should create transfer tx - ParaToPara ${asset} from ${node} to ${nodeTo}`, async () => {
        expect(nodeTo).toBeDefined()
        try {
          const tx = Builder(api)
            .from(node)
            .to(nodeTo ?? MOCK_POLKADOT_NODE)
            .currency(asset ?? 'DOT')
            .amount(MOCK_AMOUNT)
            .address(MOCK_ADDRESS)
            .build()
          expect(tx).toBeDefined()
        } catch (error) {
          if (error instanceof NoXCMSupportImplementedError) {
            expect(error).toBeInstanceOf(NoXCMSupportImplementedError)
          } else if (error instanceof ScenarioNotSupportedError) {
            expect(error).toBeInstanceOf(ScenarioNotSupportedError)
          } else {
            throw error
          }
        }
      })

      if (node !== 'Integritee' && node !== 'Crust' && node !== 'CrustShadow') {
        it(`should create transfer tx - ParaToRelay ${getRelayChainSymbol(
          node
        )} from ${node} to Relay`, async () => {
          try {
            const tx = Builder(api).from(node).amount(MOCK_AMOUNT).address(MOCK_ADDRESS).build()
            expect(tx).toBeDefined()
          } catch (error) {
            if (error instanceof NoXCMSupportImplementedError) {
              expect(error).toBeInstanceOf(NoXCMSupportImplementedError)
            } else if (error instanceof ScenarioNotSupportedError) {
              expect(error).toBeInstanceOf(ScenarioNotSupportedError)
            } else {
              throw error
            }
          }
        })
      }
    })
  })
})
