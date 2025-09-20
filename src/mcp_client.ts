// mcp_client.ts
// 🔌 PROPER MCP CLIENT IMPLEMENTATION
//
// This demonstrates the REAL Model Context Protocol (MCP) vs simple HTTP API calls
// Key differences:
// 1. Protocol negotiation and capability discovery
// 2. Structured JSON-RPC 2.0 communication
// 3. Session management and tool registration
// 4. Standardized error handling and responses

import readline from 'readline';
import { z } from 'zod';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { tool } from '@langchain/core/tools';
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from '@langchain/core/prompts';
import { MCPClient, createMCPToolWrapper } from './mcp-protocol';
import 'dotenv/config';

const serverUrl = 'http://localhost:3000';

// --- MCP CLIENT INITIALIZATION ---
// This shows the proper MCP connection flow
async function initializeMCPClient(): Promise<MCPClient> {
    console.log('🚀 Starting MCP Client with proper protocol...\n');
    
    const mcpClient = new MCPClient(serverUrl);
    
    try {
        // Step 1: MCP Protocol Initialization
        console.log('🔌 STEP 1: MCP Protocol Initialization');
        const capabilities = await mcpClient.initialize();
        console.log(`✅ Connected to MCP server with ${capabilities.tools.length} tools\n`);
        
        // Step 2: Tool Discovery
        console.log('🔍 STEP 2: Tool Discovery via MCP');
        const tools = await mcpClient.discoverTools();
        console.log(`📋 Discovered tools: ${tools.map(t => t.name).join(', ')}\n`);
        
        return mcpClient;
    } catch (error) {
        console.error('❌ MCP initialization failed:', error);
        console.log('⚠️  Falling back to direct HTTP mode (non-MCP)');
        throw error;
    }
}

// --- LANGCHAIN INTEGRATION WITH MCP ---
// These tools use the MCP protocol instead of direct HTTP calls
async function createMCPTools(mcpClient: MCPClient) {
    const mcpWrapper = createMCPToolWrapper(mcpClient);
    
    // @ts-ignore: Deep type instantiation with LangChain tools
    const addReminderTool = tool(
        async (input: { time: string; task: string }) => {
            console.log('📞 Calling MCP tool: add_reminder');
            try {
                const result = await mcpWrapper.addReminder(input.time, input.task);
                return JSON.stringify(result);
            } catch (error) {
                console.error('❌ MCP tool call failed:', error);
                return 'Failed to add reminder via MCP. Please check the MCP server.';
            }
        },
        {
            name: 'add_reminder',
            description: 'Adds a new reminder via MCP protocol. Use this to add a new reminder.',
            schema: z.object({
                time: z.string().describe('The time for the reminder, e.g., "10:00 AM", "tonight at 8pm".'),
                task: z.string().describe('The task or message for the reminder, e.g., "call the doctor", "buy groceries".'),
            }),
        }
    );

    // @ts-ignore: Deep type instantiation with LangChain tools
    const listRemindersTool = tool(
        async () => {
            console.log('📞 Calling MCP tool: list_reminders');
            try {
                const result = await mcpWrapper.listReminders();
                return JSON.stringify(result);
            } catch (error) {
                console.error('❌ MCP tool call failed:', error);
                return 'Failed to list reminders via MCP. Please check the MCP server.';
            }
        },
        {
            name: 'list_reminders',
            description: 'Lists all current reminders via MCP protocol.',
            schema: z.object({}),
        }
    );

    // @ts-ignore: Deep type instantiation with LangChain tools
    const sendEmailReminderTool = tool(
        async (input: { time: string; task: string; email: string; eventDuration?: number; eventLocation?: string }) => {
            console.log('📞 Calling MCP tool: send_email_reminder');
            try {
                const result = await mcpWrapper.sendEmailReminder(
                    input.time, 
                    input.task, 
                    input.email, 
                    input.eventDuration, 
                    input.eventLocation
                );
                return JSON.stringify(result);
            } catch (error) {
                console.error('❌ MCP tool call failed:', error);
                return 'Failed to send email reminder via MCP. Please check the MCP server and email configuration.';
            }
        },
        {
            name: 'send_email_reminder',
            description: 'Sends an email reminder with calendar invite via MCP protocol.',
            schema: z.object({
                time: z.string().describe('The time for the reminder. Natural language supported.'),
                task: z.string().describe('The task or message for the reminder.'),
                email: z.string().email().describe('The email address to send the reminder to.'),
                eventDuration: z.number().optional().describe('Duration in minutes.'),
                eventLocation: z.string().optional().describe('Event location.'),
            }),
        }
    );

    return [addReminderTool, listRemindersTool, sendEmailReminderTool];
}

// --- MAIN APPLICATION ---
async function main() {
    let mcpClient: MCPClient;
    
    try {
        // Initialize MCP connection
        mcpClient = await initializeMCPClient();
        
        console.log('🔧 STEP 3: Creating LangChain Agent with MCP Tools');
        const tools = await createMCPTools(mcpClient);
        
        // Initialize the LLM
        const llm = new ChatGoogleGenerativeAI({
            model: 'gemini-1.5-flash',
            temperature: 0,
            apiKey: process.env.GEMINI_API_KEY,
        });

        // Enhanced prompt that explains MCP
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', `You are an AI assistant using the Model Context Protocol (MCP) to manage reminders and calendar events.

🔌 MCP PROTOCOL FEATURES:
- Tool discovery and capability negotiation
- Structured JSON-RPC 2.0 communication
- Session management and error handling
- Standardized tool interfaces

🔧 AVAILABLE MCP TOOLS:
1. add_reminder - Local reminder storage via MCP
2. list_reminders - Retrieve all reminders via MCP  
3. send_email_reminder - Email + calendar integration via MCP

📅 CALENDAR INTEGRATION:
- Natural language time parsing
- Automatic ICS file generation
- Smart duration suggestions
- Location support

When you use tools, you're communicating through the MCP protocol, which provides:
- Tool capability discovery
- Structured error handling
- Session management
- Protocol version negotiation

Be helpful and explain when you're using MCP protocol features!`],
            new MessagesPlaceholder('chat_history'),
            ['human', '{input}'],
            new MessagesPlaceholder('agent_scratchpad'),
        ]);

        // Create the agent
        const agent = await createToolCallingAgent({
            llm,
            tools,
            prompt,
        });

        const agentExecutor = new AgentExecutor({
            agent,
            tools,
            verbose: true,
        });

        // Display startup information
        console.log('🎯 MCP CLIENT READY!\n');
        console.log('🔌 Connected via Model Context Protocol (MCP)');
        console.log(`📊 Session: ${mcpClient.getSessionInfo().sessionId}`);
        console.log(`🛠️  Available tools: ${tools.length}`);
        console.log('');
        console.log('🆚 DIFFERENCE FROM SIMPLE HTTP:');
        console.log('  • Protocol negotiation and capability discovery');
        console.log('  • Structured JSON-RPC 2.0 communication');
        console.log('  • Session management and tool registration');
        console.log('  • Standardized error handling');
        console.log('');
        console.log('📝 Try these MCP-powered queries:');
        console.log('  • "Add a reminder to call the doctor at 10 AM"');
        console.log('  • "Send me an email reminder for team meeting tomorrow at 2 PM to team@company.com"');
        console.log('  • "What are my reminders?"');
        console.log('');
        console.log("Type 'exit' to quit or 'session' for MCP session info\n");

        // Interactive loop
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.on('line', async (input) => {
            if (input.toLowerCase() === 'exit') {
                console.log('\n👋 Closing MCP session...');
                rl.close();
                process.exit(0);
            }

            if (input.toLowerCase() === 'session') {
                console.log('\n📊 MCP Session Information:');
                console.log(JSON.stringify(mcpClient.getSessionInfo(), null, 2));
                console.log('');
                return;
            }

            try {
                console.log('\n🤖 Processing via MCP protocol...');
                const response = await agentExecutor.invoke({
                    input: input,
                    chat_history: [],
                });
                console.log(`\n✅ MCP Agent Response: ${response.output}\n`);
            } catch (error) {
                console.error('\n❌ MCP Agent Error:', error);
                console.log('');
            }
        });

    } catch (error) {
        console.error('💥 Failed to start MCP client:', error);
        console.log('\n🔄 To run this properly:');
        console.log('1. Start the MCP server: npm run start:dev');
        console.log('2. Start the email server: npm run start:email');
        console.log('3. Ensure MCP protocol endpoints are available');
        process.exit(1);
    }
}

// Start the MCP client
main().catch(console.error);