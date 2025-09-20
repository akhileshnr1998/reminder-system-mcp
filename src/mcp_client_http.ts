// mcp_client_http.ts
// 📡 SIMPLE HTTP API CLIENT (Educational Comparison)
//
// This shows the "old way" of doing tool integration without MCP protocol.
// Compare this with mcp_client.ts to see the benefits of proper MCP implementation.
//
// Key limitations of simple HTTP approach:
// 1. No protocol negotiation or capability discovery
// 2. Hardcoded tool knowledge
// 3. No session management
// 4. Basic error handling

import axios from 'axios';
import readline from 'readline';
import { z } from 'zod';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { tool } from '@langchain/core/tools';
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from '@langchain/core/prompts';
import 'dotenv/config';

const serverUrl = 'http://localhost:3000';

// --- SIMPLE HTTP TOOLS (No MCP Protocol) ---
// These make direct HTTP calls without any protocol negotiation

const addReminderTool = tool(
    async (input: { time: string; task: string }) => {
        console.log('📡 Making direct HTTP call: POST /tools/add_reminder');
        try {
            const response = await axios.post(`${serverUrl}/tools/add_reminder`, input);
            return JSON.stringify(response.data);
        } catch (error) {
            console.error('❌ HTTP request failed:', error);
            return 'Failed to add reminder. Please check the server.';
        }
    },
    {
        name: 'add_reminder',
        description: 'Adds a new reminder via direct HTTP API.',
        schema: z.object({
            time: z.string().describe('The time for the reminder, e.g., "10:00 AM", "tonight at 8pm".'),
            task: z.string().describe('The task or message for the reminder, e.g., "call the doctor", "buy groceries".'),
        }),
    }
);

const listRemindersTool = tool(
    async () => {
        console.log('📡 Making direct HTTP call: GET /tools/list_reminders');
        try {
            const response = await axios.get(`${serverUrl}/tools/list_reminders`);
            const reminders = response.data;
            if (reminders.length === 0) {
                return 'You have no reminders set.';
            }
            return JSON.stringify(reminders);
        } catch (error) {
            console.error('❌ HTTP request failed:', error);
            return 'Failed to list reminders. Please check the server.';
        }
    },
    {
        name: 'list_reminders',
        description: 'Lists all current reminders via direct HTTP API.',
        schema: z.object({}),
    }
);

const sendEmailReminderTool = tool(
    async (input: { time: string; task: string; email: string; eventDuration?: number; eventLocation?: string }) => {
        console.log('📡 Making direct HTTP call: POST /tools/send_email_reminder');
        try {
            const response = await axios.post(`${serverUrl}/tools/send_email_reminder`, input);
            return JSON.stringify(response.data);
        } catch (error) {
            console.error('❌ HTTP request failed:', error);
            return 'Failed to send email reminder. Please check the server and email configuration.';
        }
    },
    {
        name: 'send_email_reminder',
        description: 'Sends an email reminder with calendar invite via direct HTTP API.',
        schema: z.object({
            time: z.string().describe('The time for the reminder. Natural language supported.'),
            task: z.string().describe('The task or message for the reminder.'),
            email: z.string().email().describe('The email address to send the reminder to.'),
            eventDuration: z.number().optional().describe('Duration in minutes.'),
            eventLocation: z.string().optional().describe('Event location.'),
        }),
    }
);

const tools = [addReminderTool, listRemindersTool, sendEmailReminderTool];

// --- MAIN APPLICATION ---
async function main() {
    console.log('📡 Starting Simple HTTP API Client...\n');
    console.log('⚠️  NO MCP PROTOCOL - Direct HTTP calls only');
    console.log('🔧 Hardcoded tool knowledge');
    console.log('❌ No capability discovery');
    console.log('❌ No session management');
    console.log('❌ Basic error handling\n');

    // Initialize the LLM
    const llm = new ChatGoogleGenerativeAI({
        model: 'gemini-1.5-flash',
        temperature: 0,
        apiKey: process.env.GEMINI_API_KEY,
    });

    // Simple prompt without MCP features
    const prompt = ChatPromptTemplate.fromMessages([
        ['system', `You are an AI assistant that manages reminders via simple HTTP API calls.

🔧 AVAILABLE TOOLS (Hardcoded):
1. add_reminder - Local reminder storage
2. list_reminders - Retrieve all reminders  
3. send_email_reminder - Email + calendar integration

📅 FEATURES:
- Natural language time parsing
- Automatic ICS file generation
- Smart duration suggestions
- Location support

Note: This uses direct HTTP calls without MCP protocol benefits.`],
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
    console.log('🎯 HTTP API CLIENT READY!\n');
    console.log('📡 Using simple HTTP API calls');
    console.log(`🛠️  Available tools: ${tools.length} (hardcoded)`);
    console.log('');
    console.log('🚨 LIMITATIONS OF HTTP APPROACH:');
    console.log('  • No tool discovery mechanism');
    console.log('  • No protocol version negotiation');
    console.log('  • No structured error handling');
    console.log('  • No session management');
    console.log('');
    console.log('📝 Try these queries:');
    console.log('  • "Add a reminder to call the doctor at 10 AM"');
    console.log('  • "Send me an email reminder for team meeting tomorrow at 2 PM to team@company.com"');
    console.log('  • "What are my reminders?"');
    console.log('');
    console.log("Type 'exit' to quit\n");

    // Interactive loop
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.on('line', async (input) => {
        if (input.toLowerCase() === 'exit') {
            console.log('\n👋 Goodbye!');
            rl.close();
            process.exit(0);
        }

        try {
            console.log('\n🤖 Processing via HTTP API...');
            const response = await agentExecutor.invoke({
                input: input,
                chat_history: [],
            });
            console.log(`\n✅ HTTP Agent Response: ${response.output}\n`);
        } catch (error) {
            console.error('\n❌ HTTP Agent Error:', error);
            console.log('');
        }
    });
}

// Start the HTTP client
main().catch(console.error);