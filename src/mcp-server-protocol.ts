// mcp-server-protocol.ts
// 🌐 MCP SERVER PROTOCOL IMPLEMENTATION
//
// This module shows the server side of MCP protocol
// It demonstrates how tools should be exposed via MCP vs simple HTTP

import express, { Request, Response } from 'express';
import { MCPRequest, MCPResponse, MCPCapabilities, MCPTool } from './mcp-protocol';

/**
 * MCP Protocol Handler for the server side
 * This shows how servers should implement MCP endpoints
 */
export class MCPServerProtocol {
    private app: express.Application;
    private tools: MCPTool[] = [];
    private activeSessions = new Map<string, any>();

    constructor(app: express.Application) {
        this.app = app;
        this.setupMCPEndpoints();
        this.registerTools();
    }

    /**
     * Register available tools in MCP format
     * This is the "tool registry" that MCP provides
     */
    private registerTools() {
        this.tools = [
            {
                name: 'add_reminder',
                description: 'Adds a new reminder for a specific task at a given time. Use this to add a new reminder.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        time: {
                            type: 'string',
                            description: 'The time for the reminder, e.g., "10:00 AM", "tonight at 8pm".'
                        },
                        task: {
                            type: 'string',
                            description: 'The task or message for the reminder, e.g., "call the doctor", "buy groceries".'
                        }
                    },
                    required: ['time', 'task']
                }
            },
            {
                name: 'send_email_reminder',
                description: 'Sends an email reminder with calendar invite to a specified email address. Automatically parses time expressions and creates calendar events.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        time: {
                            type: 'string',
                            description: 'The time for the reminder. Can be natural language like "tomorrow at 2 PM", "next week", "in 3 hours", or specific times like "10:00 AM".'
                        },
                        task: {
                            type: 'string',
                            description: 'The task or message for the reminder, e.g., "call the doctor", "team meeting", "dentist appointment".'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'The email address to send the reminder to.'
                        },
                        eventDuration: {
                            type: 'number',
                            description: 'Duration of the event in minutes. If not specified, will be automatically suggested based on the task type.'
                        },
                        eventLocation: {
                            type: 'string',
                            description: 'Location for the calendar event, if mentioned in the request.'
                        }
                    },
                    required: ['time', 'task', 'email']
                }
            },
            {
                name: 'list_reminders',
                description: 'Lists all current reminders. Use this to find out what reminders have been set.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        ];

        console.log(`📋 Registered ${this.tools.length} tools in MCP registry`);
    }

    /**
     * Set up MCP protocol endpoints
     * These follow the MCP specification for tool servers
     */
    private setupMCPEndpoints() {
        // MCP Initialize endpoint
        this.app.post('/mcp/initialize', (req: Request, res: Response) => {
            console.log('🔌 MCP client connecting...');
            
            const mcpRequest = req.body as MCPRequest;
            const sessionId = req.headers['mcp-session-id'] as string;
            
            // Store session info
            this.activeSessions.set(sessionId, {
                clientInfo: mcpRequest.params?.clientInfo,
                connectedAt: new Date().toISOString()
            });

            const capabilities: MCPCapabilities = {
                tools: this.tools,
                version: '2024-11-05',
                features: {
                    streaming: false,
                    cancellation: true,
                    progress: true
                }
            };

            const response: MCPResponse = {
                jsonrpc: '2.0',
                id: mcpRequest.id,
                result: capabilities
            };

            console.log(`✅ MCP session ${sessionId} initialized`);
            console.log(`📋 Exposed ${this.tools.length} tools to client`);
            
            res.json(response);
        });

        // MCP Tools discovery endpoint
        this.app.post('/mcp/tools/list', (req: Request, res: Response) => {
            console.log('🔍 Client discovering tools via MCP...');
            
            const mcpRequest = req.body as MCPRequest;
            
            const response: MCPResponse = {
                jsonrpc: '2.0',
                id: mcpRequest.id,
                result: {
                    tools: this.tools
                }
            };

            res.json(response);
        });

        // MCP Tool execution endpoint
        this.app.post('/mcp/tools/call', async (req: Request, res: Response) => {
            const mcpRequest = req.body as MCPRequest;
            const { name, arguments: args } = mcpRequest.params;
            
            console.log(`🔧 MCP tool call: ${name}`);
            console.log(`📝 MCP parameters:`, JSON.stringify(args, null, 2));

            try {
                // Route to appropriate tool implementation
                let result;
                switch (name) {
                    case 'add_reminder':
                        result = await this.executeAddReminder(args);
                        break;
                    case 'send_email_reminder':
                        result = await this.executeSendEmailReminder(args);
                        break;
                    case 'list_reminders':
                        result = await this.executeListReminders(args);
                        break;
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }

                const response: MCPResponse = {
                    jsonrpc: '2.0',
                    id: mcpRequest.id,
                    result: {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result)
                            }
                        ]
                    }
                };

                console.log(`✅ MCP tool ${name} executed successfully`);
                res.json(response);

            } catch (error) {
                console.error(`❌ MCP tool ${name} failed:`, error);
                
                const response: MCPResponse = {
                    jsonrpc: '2.0',
                    id: mcpRequest.id,
                    error: {
                        code: -32603,
                        message: error instanceof Error ? error.message : 'Tool execution failed'
                    }
                };

                res.status(500).json(response);
            }
        });

        // MCP Session info endpoint
        this.app.get('/mcp/sessions', (req: Request, res: Response) => {
            const sessions = Array.from(this.activeSessions.entries()).map(([id, info]) => ({
                sessionId: id,
                ...info
            }));

            res.json({
                activeSessions: sessions.length,
                sessions: sessions
            });
        });
    }

    /**
     * Tool implementations - these delegate to existing HTTP endpoints
     * This shows how MCP can wrap existing APIs
     */
    private async executeAddReminder(args: any) {
        const axios = require('axios');
        const response = await axios.post('http://localhost:3000/tools/add_reminder', args);
        return response.data;
    }

    private async executeSendEmailReminder(args: any) {
        const axios = require('axios');
        const response = await axios.post('http://localhost:3000/tools/send_email_reminder', args);
        return response.data;
    }

    private async executeListReminders(args: any) {
        const axios = require('axios');
        const response = await axios.get('http://localhost:3000/tools/list_reminders');
        return response.data;
    }

    /**
     * Get MCP server statistics
     */
    getServerStats() {
        return {
            toolsRegistered: this.tools.length,
            activeSessions: this.activeSessions.size,
            protocolVersion: '2024-11-05'
        };
    }
}
