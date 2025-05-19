import { type INodeParameters, type NodeParameterValueType } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

export interface IAgentRequest {
	query: INodeParameters;
	toolName?: string;
}

export interface IAgentRequestStoreState {
	[workflowId: string]: {
		[nodeName: string]: {
			query: INodeParameters;
			toolName?: string;
		};
	};
}

const STORAGE_KEY = 'n8n-agent-requests';

export const useAgentRequestStore = defineStore('agentRequest', () => {
	// State
	const agentRequests = useLocalStorage<IAgentRequestStoreState>(STORAGE_KEY, {});

	// Helper function to ensure workflow and node entries exist
	const ensureWorkflowAndNodeExist = (workflowId: string, nodeId: string): void => {
		if (!agentRequests.value[workflowId]) {
			agentRequests.value[workflowId] = {};
		}

		if (!agentRequests.value[workflowId][nodeId]) {
			agentRequests.value[workflowId][nodeId] = { query: {} };
		}
	};

	// Getters
	const getAgentRequests = (workflowId: string, nodeId: string): INodeParameters => {
		return agentRequests.value[workflowId]?.[nodeId]?.query || {};
	};

	const getAgentRequest = (
		workflowId: string,
		nodeId: string,
		paramName: string,
	): NodeParameterValueType | undefined => {
		return agentRequests.value[workflowId]?.[nodeId]?.query?.[paramName];
	};

	// Actions
	const addAgentRequest = (
		workflowId: string,
		nodeId: string,
		paramName: string,
		paramValues: NodeParameterValueType,
	): INodeParameters => {
		ensureWorkflowAndNodeExist(workflowId, nodeId);

		agentRequests.value[workflowId][nodeId] = {
			...agentRequests.value[workflowId][nodeId],
			query: {
				...agentRequests.value[workflowId][nodeId].query,
				[paramName]: paramValues,
			},
		};

		return agentRequests.value[workflowId][nodeId].query;
	};

	const addAgentRequests = (workflowId: string, nodeId: string, params: INodeParameters): void => {
		ensureWorkflowAndNodeExist(workflowId, nodeId);

		agentRequests.value[workflowId][nodeId] = {
			...agentRequests.value[workflowId][nodeId],
			query: {
				...agentRequests.value[workflowId][nodeId].query,
				...params,
			},
		};
	};

	const clearAgentRequests = (workflowId: string, nodeId: string): void => {
		if (agentRequests.value[workflowId]) {
			agentRequests.value[workflowId][nodeId] = { query: {} };
		}
	};

	const clearAllAgentRequests = (workflowId?: string): void => {
		if (workflowId) {
			// Clear requests for a specific workflow
			agentRequests.value[workflowId] = {};
		} else {
			// Clear all requests
			agentRequests.value = {};
		}
	};

	function sanitizeKey(key: string): string {
		if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
			return `_${key}`;
		}
		return key;
	}

	function parsePath(path: string): string[] {
		return path.split('.').reduce((acc: string[], part) => {
			if (part.includes('[')) {
				const [arrayName, index] = part.split('[');
				if (arrayName) acc.push(sanitizeKey(arrayName));
				if (index) acc.push(index.replace(']', ''));
			} else {
				acc.push(sanitizeKey(part));
			}
			return acc;
		}, []);
	}

	function buildRequestObject(path: string[], value: NodeParameterValueType): INodeParameters {
		const result: INodeParameters = {};
		let current = result;

		for (let i = 0; i < path.length - 1; i++) {
			const part = sanitizeKey(path[i]);
			const nextPart = path[i + 1];
			const isArrayIndex = nextPart && !isNaN(Number(nextPart));

			if (isArrayIndex) {
				if (!current[part]) {
					current[part] = [];
				}
				while ((current[part] as NodeParameterValueType[]).length <= Number(nextPart)) {
					(current[part] as NodeParameterValueType[]).push({});
				}
			} else if (!current[part]) {
				current[part] = {};
			}

			current = current[part] as INodeParameters;
		}

		current[sanitizeKey(path[path.length - 1])] = value;
		return result;
	}

	function deepMerge(target: INodeParameters, source: INodeParameters): INodeParameters {
		const result = { ...target };

		for (const key in source) {
			const sanitizedKey = sanitizeKey(key);
			if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
				result[sanitizedKey] = deepMerge(
					(result[sanitizedKey] as INodeParameters) || {},
					source[key] as INodeParameters,
				);
			} else if (Array.isArray(source[key])) {
				if (Array.isArray(result[sanitizedKey])) {
					const targetArray = result[sanitizedKey] as NodeParameterValueType[];
					const sourceArray = source[key] as NodeParameterValueType[];

					while (targetArray.length < sourceArray.length) {
						targetArray.push({});
					}

					sourceArray.forEach((item, index) => {
						if (item && typeof item === 'object') {
							targetArray[index] = deepMerge(
								(targetArray[index] as INodeParameters) || {},
								item as INodeParameters,
							) as NodeParameterValueType;
						} else {
							targetArray[index] = item;
						}
					});
				} else {
					result[sanitizedKey] = source[key];
				}
			} else {
				result[sanitizedKey] = source[key];
			}
		}

		return result;
	}

	const generateAgentRequest = (workflowId: string, nodeId: string): INodeParameters => {
		const nodeRequests = agentRequests.value[workflowId]?.[nodeId]?.query || {};

		return Object.entries(nodeRequests).reduce(
			(acc, [path, value]) => deepMerge(acc, buildRequestObject(parsePath(path), value)),
			{} as INodeParameters,
		);
	};

	return {
		agentRequests,
		getAgentRequests,
		getAgentRequest,
		addAgentRequest,
		addAgentRequests,
		clearAgentRequests,
		clearAllAgentRequests,
		generateAgentRequest,
	};
});
