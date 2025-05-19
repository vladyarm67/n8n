import { setActivePinia, createPinia } from 'pinia';
import {
	type IAgentRequest,
	type IAgentRequestStoreState,
	useAgentRequestStore,
} from './agentRequest.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

// Mock localStorage
let mockLocalStorageValue: IAgentRequestStoreState = {};

vi.mock('@vueuse/core', () => ({
	useLocalStorage: vi.fn((_key, defaultValue) => {
		// Only initialize with default value if the mock is empty
		if (Object.keys(mockLocalStorageValue).length === 0) {
			Object.assign(mockLocalStorageValue, structuredClone(defaultValue));
		}

		return {
			value: mockLocalStorageValue,
		};
	}),
}));

describe('agentRequest.store', () => {
	beforeEach(() => {
		mockLocalStorageValue = {};
		setActivePinia(createPinia());
	});

	describe('Initialization', () => {
		it('initializes with empty state when localStorage is empty', () => {
			const store = useAgentRequestStore();
			expect(store.agentRequests.value).toEqual({});
		});

		it('initializes with data from localStorage', () => {
			const mockData: IAgentRequestStoreState = {
				'workflow-1': {
					'node-1': { query: { param1: 'value1' } },
				},
			};
			mockLocalStorageValue = mockData;

			const store = useAgentRequestStore();
			expect(store.agentRequests.value).toEqual(mockData);
		});
	});

	describe('Getters', () => {
		it('gets parameter overrides for a node', () => {
			const store = useAgentRequestStore();

			store.addAgentRequests('workflow-1', 'node-1', { param1: 'value1', param2: 'value2' });

			const overrides = store.getAgentRequests('workflow-1', 'node-1');
			expect(overrides).toEqual({ param1: 'value1', param2: 'value2' });
		});

		it('returns empty object for non-existent workflow/node', () => {
			const store = useAgentRequestStore();

			const overrides = store.getAgentRequests('non-existent', 'node-1');
			expect(overrides).toEqual({});
		});

		it('gets a specific parameter override', () => {
			const mockData = { param1: 'value1', param2: 'value2' };
			const store = useAgentRequestStore();
			store.addAgentRequests('workflow-1', 'node-1', mockData);

			const override = store.getAgentRequest('workflow-1', 'node-1', 'param1');
			expect(override).toBe('value1');
		});

		it('returns undefined for non-existent parameter', () => {
			const store = useAgentRequestStore();
			store.addAgentRequest('workflow-1', 'node-1', 'param1', 'value1');

			const override = store.getAgentRequest('workflow-1', 'node-1', 'non-existent');
			expect(override).toBeUndefined();
		});
	});

	describe('Actions', () => {
		it('adds a parameter override', () => {
			const store = useAgentRequestStore();

			store.addAgentRequest('workflow-1', 'node-1', 'param1', 'value1');

			expect(
				(store.agentRequests.value['workflow-1'] as unknown as { [key: string]: IAgentRequest })[
					'node-1'
				].query,
			).toEqual({ param1: 'value1' });
		});

		it('adds multiple parameter overrides', () => {
			const store = useAgentRequestStore();

			store.addAgentRequests('workflow-1', 'node-1', {
				param1: 'value1',
				param2: 'value2',
			});

			expect(
				(store.agentRequests.value['workflow-1'] as unknown as { [key: string]: IAgentRequest })[
					'node-1'
				].query,
			).toEqual({
				param1: 'value1',
				param2: 'value2',
			});
		});

		it('clears parameter overrides for a node', () => {
			const mockData: IAgentRequestStoreState = {
				'workflow-1': {
					'node-1': { query: { param1: 'value1', param2: 'value2' } },
					'node-2': { query: { param3: 'value3' } },
				},
			};
			const store = useAgentRequestStore();
			store.addAgentRequests('workflow-1', 'node-1', mockData['workflow-1']['node-1'].query);
			store.addAgentRequests('workflow-1', 'node-2', mockData['workflow-1']['node-2'].query);

			store.clearAgentRequests('workflow-1', 'node-1');

			expect(
				(store.agentRequests.value['workflow-1'] as unknown as { [key: string]: IAgentRequest })[
					'node-1'
				].query,
			).toEqual({});
			expect(
				(store.agentRequests.value['workflow-1'] as unknown as { [key: string]: IAgentRequest })[
					'node-2'
				].query,
			).toEqual({ param3: 'value3' });
		});

		it('clears all parameter overrides for a workflow', () => {
			const mockData: IAgentRequestStoreState = {
				'workflow-1': {
					'node-1': { query: { param1: 'value1' } },
					'node-2': { query: { param2: 'value2' } },
				},
				'workflow-2': {
					'node-3': { query: { param3: 'value3' } },
				},
			};
			const store = useAgentRequestStore();

			store.addAgentRequests('workflow-1', 'node-1', mockData['workflow-1']['node-1'].query);
			store.addAgentRequests('workflow-1', 'node-2', mockData['workflow-1']['node-2'].query);
			store.addAgentRequests('workflow-2', 'node-3', mockData['workflow-2']['node-3'].query);
			store.clearAllAgentRequests('workflow-1');

			expect(store.agentRequests.value['workflow-1']).toEqual({});
			expect(store.agentRequests.value['workflow-2']).toEqual({
				'node-3': { query: { param3: 'value3' } },
			});
		});

		it('clears all parameter overrides when no workflowId is provided', () => {
			const mockData: IAgentRequestStoreState = {
				'workflow-1': {
					'node-1': { query: { param1: 'value1' } },
				},
				'workflow-2': {
					'node-2': { query: { param2: 'value2' } },
				},
			};
			const store = useAgentRequestStore();

			store.addAgentRequests('workflow-1', 'node-1', mockData['workflow-1']['node-1'].query);
			store.addAgentRequests('workflow-2', 'node-2', mockData['workflow-2']['node-2'].query);
			store.clearAllAgentRequests();

			expect(store.agentRequests.value).toEqual({});
		});
	});

	describe('generateAgentRequest', () => {
		it('generateAgentRequest', () => {
			const store = useAgentRequestStore();

			store.addAgentRequests('workflow-1', 'id1', {
				param1: 'override1',
				'parent.child': 'override2',
				'parent.array[0].value': 'overrideArray1',
				'parent.array[1].value': 'overrideArray2',
			});

			const result = store.generateAgentRequest('workflow-1', 'id1');

			expect(result).toEqual({
				param1: 'override1',
				parent: {
					child: 'override2',
					array: [
						{
							value: 'overrideArray1',
						},
						{
							value: 'overrideArray2',
						},
					],
				},
			});
		});
	});

	describe('Persistence', () => {
		it('saves to localStorage when state changes', async () => {
			const store = useAgentRequestStore();

			store.addAgentRequest('workflow-1', 'node-1', 'param1', 'value1');

			// Wait for the next tick to allow the watch to execute
			await nextTick();

			expect(mockLocalStorageValue).toEqual({
				'workflow-1': {
					'node-1': { query: { param1: 'value1' } },
				},
			});
		});
	});

	describe('Prototype Pollution Protection', () => {
		it('prevents prototype pollution via __proto__', () => {
			const store = useAgentRequestStore();
			const originalProto = Object.prototype.toString;

			store.addAgentRequest('workflow-1', 'node-1', '__proto__.toString', 'hacked');
			store.addAgentRequest('workflow-1', 'node-1', '__proto__.polluted', 'hacked');

			expect(Object.prototype.toString).toBe(originalProto);
			expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
			expect(
				(store.agentRequests.value['workflow-1'] as unknown as { [key: string]: IAgentRequest })[
					'node-1'
				].query['__proto__.toString'],
			).toBe('hacked');
		});

		it('prevents prototype pollution via constructor', () => {
			const store = useAgentRequestStore();
			const originalConstructor = Object.prototype.constructor;

			store.addAgentRequest('workflow-1', 'node-1', 'constructor.prototype.polluted', 'hacked');
			store.addAgentRequest('workflow-1', 'node-1', 'constructor.constructor', 'hacked');

			expect(Object.prototype.constructor).toBe(originalConstructor);
			expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
			expect(
				(store.agentRequests.value['workflow-1'] as unknown as { [key: string]: IAgentRequest })[
					'node-1'
				].query['constructor.prototype.polluted'],
			).toBe('hacked');
		});

		it('prevents prototype pollution in nested objects', () => {
			const store = useAgentRequestStore();
			const originalProto = Object.prototype.toString;

			store.addAgentRequests('workflow-1', 'node-1', {
				'parent.__proto__.toString': 'hacked',
				'parent.constructor.prototype.polluted': 'hacked',
			});

			expect(Object.prototype.toString).toBe(originalProto);
			expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
			expect(
				(store.agentRequests.value['workflow-1'] as unknown as { [key: string]: IAgentRequest })[
					'node-1'
				].query['parent.__proto__.toString'],
			).toBe('hacked');
		});

		it('prevents prototype pollution in arrays', () => {
			const store = useAgentRequestStore();
			const originalProto = Object.prototype.toString;

			store.addAgentRequests('workflow-1', 'node-1', {
				'array[0].__proto__.toString': 'hacked',
				'array[1].constructor.prototype.polluted': 'hacked',
			});

			expect(Object.prototype.toString).toBe(originalProto);
			expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
			expect(
				(store.agentRequests.value['workflow-1'] as unknown as { [key: string]: IAgentRequest })[
					'node-1'
				].query['array[0].__proto__.toString'],
			).toBe('hacked');
		});
	});
});
