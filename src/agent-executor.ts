// agent-executor.ts
// 🤖 MCP AGENT IMPLEMENTATION
// 
// This module demonstrates core MCP concepts:
// 1. TOOL DECLARATION: How AI agents discover and understand available capabilities
// 2. SECURE COMMUNICATION: Standardized protocol between AI and external services
// 3. EXECUTION TRACKING: Complete audit trail of AI decisions and actions
// 4. ERROR HANDLING: Graceful failure management and recovery

import axios from 'axios';
import { z } from 'zod';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { tool } from '@langchain/core/tools';
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from '@langchain/core/prompts';
import 'dotenv/config';

interface ExecutionStep {
    id: string;
    type: 'start' | 'tool_call' | 'tool_response' | 'llm_response' | 'end' | 'error';
    timestamp: string;
    content: string;
    actor: string;
    target: string;
    duration?: number;
    metadata?: Record<string, any>;
}

const serverUrl = 'http://localhost:3000';

// Execution step tracker
class ExecutionTracker {
    private steps: ExecutionStep[] = [];
    private stepCounter = 0;

    addStep(type: ExecutionStep['type'], content: string, actor: string, target: string, metadata?: Record<string, any>): string {
        const id = `step-${++this.stepCounter}`;
        const step: ExecutionStep = {
            id,
            type,
            timestamp: new Date().toISOString(),
            content,
            actor,
            target,
            metadata
        };
        this.steps.push(step);
        return id;
    }

    updateStepDuration(id: string, duration: number) {
        const step = this.steps.find(s => s.id === id);
        if (step) {
            step.duration = duration;
        }
    }

    getSteps(): ExecutionStep[] {
        return [...this.steps];
    }

    clear() {
        this.steps = [];
        this.stepCounter = 0;
    }
}

// Create a tracker instance
const tracker = new ExecutionTracker();

// 🔧 MCP TOOL DEFINITIONS
// Each tool demonstrates MCP best practices:
// - Clear capability declaration (name, description, schema)
// - Input validation using Zod schemas  
// - Execution tracking for observability
// - Proper error handling and propagation

const addReminderTool = tool(
    async (input: { time: string; task: string }) => {
        const startTime = Date.now();
        
        // Step 1: Agent decides to call tool
        tracker.addStep('tool_call', `Agent selects add_reminder tool`, 'Agent', 'MCPClient', { 
            toolName: 'add_reminder', 
            parameters: input 
        });
        
        // Step 2: MCP Client prepares JSON-RPC request
        const mcpRequestId = Date.now();
        const mcpRequest = {
            jsonrpc: '2.0',
            id: mcpRequestId,
            method: 'tools/call',
            params: { name: 'add_reminder', arguments: input }
        };
        tracker.addStep('tool_call', `MCP JSON-RPC Request: tools/call`, 'MCPClient', 'MCPServer', { 
            request: mcpRequest 
        });
        
        // Step 3: MCP Server processes request
        tracker.addStep('tool_call', `MCP Server routes to tool handler`, 'MCPServer', 'ReminderService', { 
            toolName: 'add_reminder',
            mcpRequestId 
        });
        
        try {
            const response = await axios.post(`${serverUrl}/tools/add_reminder`, input);
            const duration = Date.now() - startTime;
            
            // Step 4: Business logic executes
            tracker.addStep('tool_response', `Reminder stored successfully`, 'ReminderService', 'MCPServer', { 
                statusCode: response.status,
                data: response.data 
            });
            
            // Step 5: MCP Server formats response
            const mcpResponse = {
                jsonrpc: '2.0',
                id: mcpRequestId,
                result: { content: [{ type: 'text', text: JSON.stringify(response.data) }] }
            };
            tracker.addStep('tool_response', `MCP JSON-RPC Response`, 'MCPServer', 'MCPClient', { 
                response: mcpResponse 
            });
            
            // Step 6: MCP Client returns to Agent
            const responseContent = JSON.stringify(response.data);
            const finalStepId = tracker.addStep('tool_response', responseContent, 'MCPClient', 'Agent', { 
                statusCode: response.status,
                totalDuration: duration 
            });
            
            return responseContent;
        } catch (error) {
            const duration = Date.now() - startTime;
            
            const errorMessage = 'Failed to add reminder. Please check the server.';
            tracker.addStep('error', `MCP Error: ${errorMessage}`, 'MCPServer', 'MCPClient', { 
                error: error instanceof Error ? error.message : 'Unknown error',
                totalDuration: duration 
            });
            tracker.addStep('error', errorMessage, 'MCPClient', 'Agent', { 
                error: error instanceof Error ? error.message : 'Unknown error' 
            });
            
            console.error('Error calling add_reminder:', error);
            return errorMessage;
        }
    },
    {
        name: 'add_reminder',
        description: 'Adds a new reminder for a specific task at a given time. Use this to add a new reminder.',
        schema: z.object({
            time: z.string().describe('The time for the reminder, e.g., "10:00 AM", "tonight at 8pm".'),
            task: z.string().describe('The task or message for the reminder, e.g., "call the doctor", "buy groceries".'),
        }),
    }
);

const listRemindersTool = tool(
    async () => {
        const startTime = Date.now();
        const stepId = tracker.addStep('tool_call', 'list_reminders()', 'Agent', 'ReminderService');
        
        try {
            const response = await axios.get(`${serverUrl}/tools/list_reminders`);
            const duration = Date.now() - startTime;
            tracker.updateStepDuration(stepId, duration);
            
            const reminders = response.data;
            let responseContent: string;
            
            if (reminders.length === 0) {
                responseContent = 'You have no reminders set.';
            } else {
                responseContent = JSON.stringify(reminders);
            }
            
            tracker.addStep('tool_response', responseContent, 'ReminderService', 'Agent', { reminderCount: reminders.length });
            
            return responseContent;
        } catch (error) {
            const duration = Date.now() - startTime;
            tracker.updateStepDuration(stepId, duration);
            
            const errorMessage = 'Failed to list reminders. Please check the server.';
            tracker.addStep('error', errorMessage, 'ReminderService', 'Agent', { error: error instanceof Error ? error.message : 'Unknown error' });
            
            console.error('Error calling list_reminders:', error);
            return errorMessage;
        }
    },
    {
        name: 'list_reminders',
        description: 'Lists all current reminders. Use this to find out what reminders have been set.',
        schema: z.object({}),
    }
);

const sendEmailReminderTool = tool(
    async (input: { time: string; task: string; email: string; senderName?: string; eventDuration?: number; eventLocation?: string }) => {
        const startTime = Date.now();
        
        // Step 1: Agent decides to send email reminder
        tracker.addStep('tool_call', `Agent selects send_email_reminder tool`, 'Agent', 'MCPClient', { 
            toolName: 'send_email_reminder', 
            parameters: input 
        });
        
        // Step 2: MCP Client prepares JSON-RPC request
        const mcpRequestId = Date.now();
        const mcpRequest = {
            jsonrpc: '2.0',
            id: mcpRequestId,
            method: 'tools/call',
            params: { name: 'send_email_reminder', arguments: input }
        };
        tracker.addStep('tool_call', `MCP JSON-RPC Request: tools/call`, 'MCPClient', 'MCPServer', { 
            request: mcpRequest 
        });
        
        // Step 3: MCP Server routes to email service
        tracker.addStep('tool_call', `MCP Server routes to email tool handler`, 'MCPServer', 'EmailService', { 
            toolName: 'send_email_reminder',
            mcpRequestId,
            emailTarget: input.email 
        });
        
        try {
            const response = await axios.post(`${serverUrl}/tools/send_email_reminder`, input);
            const duration = Date.now() - startTime;
            
            // Step 4: Email service processes and sends email
            tracker.addStep('tool_response', `Email sent with calendar invite`, 'EmailService', 'MCPServer', { 
                statusCode: response.status,
                emailSent: true,
                calendarIncluded: response.data.calendarIncluded,
                data: response.data 
            });
            
            // Step 5: MCP Server formats response
            const mcpResponse = {
                jsonrpc: '2.0',
                id: mcpRequestId,
                result: { content: [{ type: 'text', text: JSON.stringify(response.data) }] }
            };
            tracker.addStep('tool_response', `MCP JSON-RPC Response`, 'MCPServer', 'MCPClient', { 
                response: mcpResponse 
            });
            
            // Step 6: MCP Client returns to Agent
            const responseContent = JSON.stringify(response.data);
            tracker.addStep('tool_response', responseContent, 'MCPClient', 'Agent', { 
                statusCode: response.status,
                emailSent: true,
                totalDuration: duration 
            });
            
            return responseContent;
        } catch (error) {
            const duration = Date.now() - startTime;
            
            const errorMessage = 'Failed to send email reminder. Please check the email server and configuration.';
            tracker.addStep('error', `MCP Error: ${errorMessage}`, 'MCPServer', 'MCPClient', { 
                error: error instanceof Error ? error.message : 'Unknown error',
                emailSent: false,
                totalDuration: duration 
            });
            tracker.addStep('error', errorMessage, 'MCPClient', 'Agent', { 
                error: error instanceof Error ? error.message : 'Unknown error',
                emailSent: false 
            });
            
            console.error('Error calling send_email_reminder:', error);
            return errorMessage;
        }
    },
    {
        name: 'send_email_reminder',
        description: 'Sends an email reminder with calendar invite to a specified email address. Automatically parses time expressions and creates calendar events.',
        schema: z.object({
            time: z.string().describe('The time for the reminder. Can be natural language like "tomorrow at 2 PM", "next week", "in 3 hours", or specific times like "10:00 AM".'),
            task: z.string().describe('The task or message for the reminder, e.g., "call the doctor", "team meeting", "dentist appointment".'),
            email: z.string().email().describe('The email address to send the reminder to.'),
            senderName: z.string().optional().describe('Optional name of the sender for personalization.'),
            eventDuration: z.number().optional().describe('Duration of the event in minutes. If not specified, will be automatically suggested based on the task type.'),
            eventLocation: z.string().optional().describe('Location for the calendar event, if mentioned in the request.'),
        }),
    }
);

const tools = [addReminderTool, listRemindersTool, sendEmailReminderTool];

// Initialize the LLM
const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-1.5-flash',
    temperature: 0,
    apiKey: process.env.GEMINI_API_KEY,
});

// Define the agent's prompt
const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a helpful assistant that manages reminders. You have access to these tools:

    🔧 TOOL SELECTION RULES:
    1. add_reminder - Use for LOCAL reminders (no email mentioned)
       - Required: time, task
       - Example: "Add a reminder to call the doctor at 10 AM"
    
    2. send_email_reminder - Use ONLY when email is explicitly mentioned
       - Required: time, task, email
       - Optional: eventDuration (minutes), eventLocation
       - Automatically includes calendar invite (.ics file)
       - Example: "Send me an email reminder to call the doctor at 10 AM to john@example.com"
       - Advanced: "Email reminder for team meeting tomorrow at 2 PM in Conference Room A to team@company.com for 60 minutes"
    
    3. list_reminders - To show all current reminders
       - No parameters needed
    
    🧠 TIME PARSING INTELLIGENCE:
    - Can understand natural language: "tomorrow at 2 PM", "next week", "in 3 hours"
    - Automatically suggests event duration based on task type:
      * Calls: 15 minutes
      * Meetings: 60 minutes  
      * Medical appointments: 45 minutes
      * Default: 30 minutes
    
    📅 CALENDAR INTEGRATION:
    - All email reminders automatically include calendar invites
    - Attendee will receive .ics file attachment
    - Includes reminder alerts (15 min and 5 min before)
    - Time zone aware and properly formatted
    
    IMPORTANT: 
    - If user does NOT mention an email address, use add_reminder (local storage)
    - If user DOES mention an email address, use send_email_reminder (with calendar)
    - Never try to use send_email_reminder without an explicit email address
    - Extract location information if mentioned (e.g., "meeting in Conference Room A")
    
    Default email (only if user asks but doesn't specify): ${process.env.DEFAULT_REMINDER_EMAIL || 'Not configured'}
    
    Be helpful and ask for clarification if the user's request is ambiguous.`],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
]);

export async function executeAgentQuery(query: string): Promise<{ output: string; steps: ExecutionStep[] }> {
    // Clear previous execution steps
    tracker.clear();
    
    // Track query start
    tracker.addStep('start', `Processing query: "${query}"`, 'User', 'Agent', { query });
    
    try {
        // Create the agent
        const startTime = Date.now();
        const agent = await createToolCallingAgent({
            llm,
            tools,
            prompt,
        });

        const agentExecutor = new AgentExecutor({
            agent,
            tools,
            verbose: false, // Disable verbose logging to avoid console clutter
        });

        // Track LLM processing
        const llmStepId = tracker.addStep('llm_response', 'Analyzing query and planning actions...', 'Agent', 'LLM');
        
        // Execute the agent
        const response = await agentExecutor.invoke({
            input: query,
            chat_history: [],
        });
        
        const duration = Date.now() - startTime;
        tracker.updateStepDuration(llmStepId, duration);
        
        // Track final response
        tracker.addStep('llm_response', response.output, 'LLM', 'User', { totalDuration: duration });
        tracker.addStep('end', 'Query execution completed', 'Agent', 'User');

        return {
            output: response.output,
            steps: tracker.getSteps()
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        tracker.addStep('error', `Agent execution failed: ${errorMessage}`, 'Agent', 'User', { error: errorMessage });
        
        throw error;
    }
}
