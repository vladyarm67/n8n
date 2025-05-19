import { type INodeParameters, type NodeParameterValueType } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';
import { LOCAL_STORAGE_AGENT_REQUESTS } from '@/constants';

export interface IAgentRequest {
	query: INodeParameters | string;
	toolName?: string;
}

export interface IAgentRequestStoreState {
	[workflowId: string]: {
		[nodeName: string]: IAgentRequest;
	};
}

const validateNodeId = (nodeId: string): string => {
	if (!nodeId || typeof nodeId !== 'string') {
		throw new Error('Invalid nodeId');
	}
	return nodeId; // No need to sanitize UUIDs as they're already in a safe format
};

const validateWorkflowId = (workflowId: string): string => {
	if (!workflowId || typeof workflowId !== 'string') {
		throw new Error('Invalid workflowId');
	}
	return workflowId;
};

export const useAgentRequestStore = defineStore('agentRequest', () => {
	// State
	const agentRequests = useLocalStorage<IAgentRequestStoreState>(LOCAL_STORAGE_AGENT_REQUESTS, {});

	// Helper function to ensure workflow and node entries exist
	const ensureWorkflowAndNodeExist = (workflowId: string, nodeId: string): void => {
		const safeWorkflowId = validateWorkflowId(workflowId);
		const safeNodeId = validateNodeId(nodeId);

		if (!agentRequests.value[safeWorkflowId]) {
			agentRequests.value[safeWorkflowId] = {};
		}

		if (!agentRequests.value[safeWorkflowId][safeNodeId]) {
			agentRequests.value[safeWorkflowId][safeNodeId] = { query: {} };
		}
	};

	// Getters
	const getAgentRequests = (workflowId: string, nodeId: string): INodeParameters | string => {
		const safeWorkflowId = validateWorkflowId(workflowId);
		const safeNodeId = validateNodeId(nodeId);
		return agentRequests.value[safeWorkflowId]?.[safeNodeId]?.query || {};
	};

	const getAgentRequest = (
		workflowId: string,
		nodeId: string,
		paramName: string,
	): NodeParameterValueType | undefined => {
		const safeWorkflowId = validateWorkflowId(workflowId);
		const safeNodeId = validateNodeId(nodeId);
		const query = agentRequests.value[safeWorkflowId]?.[safeNodeId]?.query;
		if (typeof query === 'string') {
			return undefined;
		}
		return query?.[paramName] as NodeParameterValueType;
	};

	const setAgentRequestForNode = (
		workflowId: string,
		nodeId: string,
		request: IAgentRequest,
	): void => {
		const safeWorkflowId = validateWorkflowId(workflowId);
		const safeNodeId = validateNodeId(nodeId);
		ensureWorkflowAndNodeExist(safeWorkflowId, safeNodeId);

		agentRequests.value[safeWorkflowId][safeNodeId] = {
			...request,
			query: typeof request.query === 'string' ? request.query : { ...request.query },
		};
	};

	const clearAgentRequests = (workflowId: string, nodeId: string): void => {
		const safeWorkflowId = validateWorkflowId(workflowId);
		const safeNodeId = validateNodeId(nodeId);
		if (agentRequests.value[safeWorkflowId]) {
			agentRequests.value[safeWorkflowId][safeNodeId] = { query: {} };
		}
	};

	const clearAllAgentRequests = (workflowId?: string): void => {
		if (workflowId) {
			const safeWorkflowId = validateWorkflowId(workflowId);
			agentRequests.value[safeWorkflowId] = {};
		} else {
			agentRequests.value = {};
		}
	};

	const generateAgentRequest = (workflowId: string, nodeId: string): IAgentRequest => {
		const safeWorkflowId = validateWorkflowId(workflowId);
		const safeNodeId = validateNodeId(nodeId);
		return agentRequests.value[safeWorkflowId][safeNodeId];
	};

	return {
		agentRequests,
		getAgentRequests,
		getAgentRequest,
		setAgentRequestForNode,
		clearAgentRequests,
		clearAllAgentRequests,
		generateAgentRequest,
	};
});
