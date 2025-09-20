// File: mcp_server.ts
// 🔧 MCP TOOL SERVER
//
// This server implements the "Tool Registry" pattern from MCP architecture:
// 1. TOOL REGISTRY: Centralized catalog of available AI capabilities
// 2. STANDARDIZED ENDPOINTS: Consistent API for tool invocation
// 3. SERVICE ORCHESTRATION: Coordinates between AI agent and external services
// 4. EXECUTION MONITORING: Tracks and logs all tool interactions
//
// In production MCP systems, this server would handle:
// - Authentication and authorization
// - Rate limiting and quota management  
// - Tool discovery and capability negotiation
// - Cross-service communication and error handling

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import { executeAgentQuery } from './agent-executor';
import { MCPServerProtocol } from './mcp-server-protocol';

// A mock database for reminders
interface Reminder {
    id: string;
    time: string;
    task: string;
    email?: string;
    createdAt: string;
}
const remindersDb: Reminder[] = [];

const emailServerUrl = `http://localhost:${process.env.EMAIL_SERVER_PORT || 3002}`;

// Create the Express app
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('frontend/dist'));

// 🔌 Initialize MCP Protocol Support
// This adds proper MCP endpoints alongside the simple HTTP API
const mcpProtocol = new MCPServerProtocol(app);
console.log('🔌 MCP Protocol endpoints initialized');
console.log('📋 Available via both HTTP API and MCP protocol');

// --- Define the server tools (API endpoints) ---

/**
 * Returns a list of all current reminders.
 */
app.get('/tools/list_reminders', (req: Request, res: Response) => {
    console.log("Executing tool: list_reminders");
    res.json(remindersDb);
});

/**
 * Adds a new reminder to the list.
 * Expects a JSON body with 'time' and 'task' properties only.
 * This is for LOCAL reminders (no email involved).
 */
app.post('/tools/add_reminder', (req: Request, res: Response) => {
    const { time, task } = req.body;
    console.log(`Executing tool: add_reminder(time='${time}', task='${task}')`);

    if (!time || !task) {
        return res.status(400).json({ error: "Missing 'time' or 'task' in request body." });
    }

    const newReminder: Reminder = { 
        id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        time, 
        task,
        email: undefined, // Local reminders don't have email
        createdAt: new Date().toISOString()
    };
    remindersDb.push(newReminder);
    res.status(200).json({ message: `Reminder added: ${task} at ${time}`, reminder: newReminder });
});

/**
 * Sends an email reminder with calendar invite
 * Expects a JSON body with 'time', 'task', and 'email' properties.
 * Optional: 'eventDuration', 'eventLocation', 'senderName'
 */
app.post('/tools/send_email_reminder', async (req: Request, res: Response) => {
    const { time, task, email, senderName, eventDuration, eventLocation } = req.body;
    console.log(`Executing tool: send_email_reminder(time='${time}', task='${task}', email='${email}', duration=${eventDuration || 'auto'}, location='${eventLocation || 'none'}')`);

    if (!time || !task || !email) {
        return res.status(400).json({ error: "Missing required fields: 'time', 'task', or 'email'" });
    }

    try {
        // Send email via email server with calendar integration
        const emailResponse = await axios.post(`${emailServerUrl}/send-reminder`, {
            to: email,
            reminderText: task,
            reminderTime: time,
            senderName: senderName || process.env.SENDER_NAME,
            includeCalendarInvite: true, // Always include calendar invites
            eventDuration: eventDuration,
            eventLocation: eventLocation
        });

        // Also add to local database
        const newReminder: Reminder = { 
            id: `email_reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            time, 
            task,
            email,
            createdAt: new Date().toISOString()
        };
        remindersDb.push(newReminder);

        res.status(200).json({ 
            message: `Email reminder with calendar invite sent to ${email}: ${task} at ${time}`,
            emailResponse: emailResponse.data,
            reminder: newReminder,
            calendarIncluded: true,
            eventDetails: {
                duration: eventDuration || 'auto-suggested',
                location: eventLocation || 'not specified'
            }
        });
    } catch (error) {
        console.error('Error sending email reminder:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ 
            error: 'Failed to send email reminder',
            details: errorMessage,
            suggestion: 'Check if email server is running and configuration is correct'
        });
    }
});

// --- Agent Execution Endpoint ---

/**
 * Executes a query using the LangChain agent and returns execution steps
 */
app.post('/agent/execute', async (req: Request, res: Response) => {
    const { query } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: "Missing 'query' in request body." });
    }
    
    try {
        console.log(`Executing agent query: ${query}`);
        const result = await executeAgentQuery(query);
        res.json(result);
    } catch (error) {
        console.error('Error executing agent query:', error);
        res.status(500).json({ 
            error: 'Failed to execute query',
            steps: [{
                id: 'error',
                type: 'error',
                timestamp: new Date().toISOString(),
                content: 'Internal server error',
                actor: 'System',
                target: 'Client'
            }]
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`🚀 MCP Server running at http://localhost:${port}`);
    console.log('');
    console.log('📡 Available Interfaces:');
    console.log(`  • Simple HTTP API: http://localhost:${port}/tools/*`);
    console.log(`  • MCP Protocol: http://localhost:${port}/mcp/*`);
    console.log('');
    console.log('🔧 Tool Endpoints:');
    console.log('  • /tools/add_reminder (HTTP)');
    console.log('  • /tools/send_email_reminder (HTTP)'); 
    console.log('  • /tools/list_reminders (HTTP)');
    console.log('');
    console.log('🔌 MCP Endpoints:');
    console.log('  • /mcp/initialize (MCP Protocol)');
    console.log('  • /mcp/tools/list (MCP Protocol)');
    console.log('  • /mcp/tools/call (MCP Protocol)');
    console.log('');
    console.log('🎯 Usage:');
    console.log('  • Web UI: npm run start:frontend');
    console.log('  • CLI (MCP Protocol): npm run start:client');
    console.log('  • CLI (HTTP API): npm run start:http-client');
    console.log('');
    console.log("Ready for tool calls via HTTP API or MCP protocol...");
});
