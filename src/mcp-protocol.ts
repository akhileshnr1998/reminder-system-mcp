// mcp-protocol.ts
// 🔌 MCP PROTOCOL IMPLEMENTATION
//
// This module demonstrates the Model Context Protocol (MCP) standard
// for AI-tool communication. It shows how MCP differs from simple HTTP APIs.

export interface MCPRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: any;
}

export interface MCPResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

export interface MCPTool {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
    };
}

export interface MCPCapabilities {
    tools: MCPTool[];
    version: string;
    features: {
        streaming?: boolean;
        cancellation?: boolean;
        progress?: boolean;
    };
}

/**
 * MCP Client - Demonstrates proper MCP protocol communication
 * This shows how AI agents should discover and use tools via MCP
 */
export class MCPClient {
    private serverUrl: string;
    private sessionId: string;
    private capabilities: MCPCapabilities | null = null;

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
        this.sessionId = `mcp_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * MCP PROTOCOL STEP 1: Initialize connection and discover capabilities
     * This is what makes it MCP vs simple HTTP API
     */
    async initialize(): Promise<MCPCapabilities> {
        console.log('🔌 Initializing MCP connection...');
        
        const request: MCPRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {
                    roots: { listChanged: true },
                    sampling: {}
                },
                clientInfo: {
                    name: 'MCP Learning Client',
                    version: '1.0.0'
                }
            }
        };

        try {
            const response = await this.sendMCPRequest('/mcp/initialize', request);
            this.capabilities = response.result;
            
            console.log('✅ MCP connection established');
            console.log(`📋 Discovered ${this.capabilities.tools.length} tools:`, 
                this.capabilities.tools.map(t => t.name).join(', '));
            
            return this.capabilities;
        } catch (error) {
            console.error('❌ MCP initialization failed:', error);
            throw new Error('Failed to establish MCP connection');
        }
    }

    /**
     * MCP PROTOCOL STEP 2: Tool discovery
     * Shows how AI agents learn about available capabilities
     */
    async discoverTools(): Promise<MCPTool[]> {
        if (!this.capabilities) {
            throw new Error('MCP not initialized. Call initialize() first.');
        }

        console.log('🔍 Discovering available tools via MCP protocol...');
        
        const request: MCPRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list'
        };

        const response = await this.sendMCPRequest('/mcp/tools/list', request);
        const tools = response.result.tools || this.capabilities.tools;
        
        console.log('📋 Available MCP tools:');
        tools.forEach((tool: MCPTool) => {
            console.log(`  • ${tool.name}: ${tool.description}`);
        });

        return tools;
    }

    /**
     * MCP PROTOCOL STEP 3: Tool execution with proper MCP formatting
     * This shows the structured way MCP handles tool calls
     */
    async callTool(toolName: string, parameters: any): Promise<any> {
        console.log(`🔧 Executing MCP tool: ${toolName}`);
        console.log(`📝 Parameters:`, JSON.stringify(parameters, null, 2));

        const request: MCPRequest = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: parameters
            }
        };

        try {
            const response = await this.sendMCPRequest('/mcp/tools/call', request);
            
            console.log(`✅ Tool ${toolName} executed successfully`);
            console.log(`📤 Result:`, JSON.stringify(response.result, null, 2));
            
            return response.result;
        } catch (error) {
            console.error(`❌ Tool ${toolName} execution failed:`, error);
            throw error;
        }
    }

    /**
     * Send MCP-formatted request to server
     * This demonstrates the JSON-RPC 2.0 protocol that MCP uses
     */
    private async sendMCPRequest(endpoint: string, request: MCPRequest): Promise<MCPResponse> {
        const response = await fetch(`${this.serverUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'MCP-Session-ID': this.sessionId,
                'MCP-Protocol-Version': '2024-11-05'
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
        }

        const mcpResponse: MCPResponse = await response.json();
        
        if (mcpResponse.error) {
            throw new Error(`MCP Error ${mcpResponse.error.code}: ${mcpResponse.error.message}`);
        }

        return mcpResponse;
    }

    /**
     * Get session information for debugging
     */
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            serverUrl: this.serverUrl,
            initialized: !!this.capabilities,
            availableTools: this.capabilities?.tools.length || 0
        };
    }
}

/**
 * MCP Tool Wrapper - Shows how to wrap existing tools for MCP
 * This demonstrates the adapter pattern for MCP integration
 */
export function createMCPToolWrapper(mcpClient: MCPClient) {
    return {
        async addReminder(time: string, task: string) {
            return await mcpClient.callTool('add_reminder', { time, task });
        },

        async sendEmailReminder(time: string, task: string, email: string, eventDuration?: number, eventLocation?: string) {
            return await mcpClient.callTool('send_email_reminder', {
                time,
                task,
                email,
                eventDuration,
                eventLocation
            });
        },

        async listReminders() {
            return await mcpClient.callTool('list_reminders', {});
        }
    };
}
