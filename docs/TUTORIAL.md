# Step-by-Step MCP Tutorial

## Tutorial: Building Your First MCP Tool

This tutorial walks you through creating a new MCP tool from scratch, using this project as your foundation.

### 🎯 **Goal**: Create a Calendar Event Tool

We'll add a calendar event scheduling tool that demonstrates:
- External API integration
- Time parsing and calendar generation
- Rich multi-format output (email + ICS)
- Parameter validation
- Security considerations

**Note**: This project already includes email reminders with calendar invites. This tutorial shows you how to build similar functionality for learning purposes.

### Step 1: Define the Tool Interface

First, let's add a weather tool to our agent:

```typescript
// In src/agent-executor.ts, add this new tool:

const scheduleEventTool = tool(
    async (input: { title: string; time: string; attendeeEmail: string; duration?: number; location?: string }) => {
        const startTime = Date.now();
        const stepId = tracker.addStep('tool_call', 
            `schedule_event(title: "${input.title}", time: "${input.time}", attendee: "${input.attendeeEmail}")`, 
            'Agent', 'CalendarService', input);
        
        try {
            const response = await axios.post(`${serverUrl}/tools/schedule_event`, input);
            const duration = Date.now() - startTime;
            tracker.updateStepDuration(stepId, duration);
            
            const responseContent = JSON.stringify(response.data);
            tracker.addStep('tool_response', responseContent, 'CalendarService', 'Agent', 
                { statusCode: response.status, calendarGenerated: true });
            
            return responseContent;
        } catch (error) {
            const duration = Date.now() - startTime;
            tracker.updateStepDuration(stepId, duration);
            
            const errorMessage = 'Failed to schedule calendar event.';
            tracker.addStep('error', errorMessage, 'CalendarService', 'Agent', 
                { error: error instanceof Error ? error.message : 'Unknown error' });
            
            return errorMessage;
        }
    },
    {
        name: 'schedule_event',
        description: 'Schedules a calendar event and sends email invite with ICS attachment.',
        schema: z.object({
            title: z.string().describe('Event title, e.g., "Team Meeting", "Doctor Appointment"'),
            time: z.string().describe('Event time in natural language, e.g., "tomorrow at 2 PM", "next Friday at 10 AM"'),
            attendeeEmail: z.string().email().describe('Email address of the attendee'),
            duration: z.number().optional().describe('Event duration in minutes (auto-suggested if not provided)'),
            location: z.string().optional().describe('Event location, e.g., "Conference Room A", "Zoom"'),
        }),
    }
);

// Add to tools array:
const tools = [addReminderTool, listRemindersTool, sendEmailReminderTool, scheduleEventTool];
```

### Step 2: Implement the Server Endpoint

Add this to your `src/mcp_server.ts`:

```typescript
/**
 * Schedules a calendar event with email invite
 * Expects a JSON body with 'title', 'time', 'attendeeEmail' properties.
 */
app.post('/tools/schedule_event', async (req: Request, res: Response) => {
    const { title, time, attendeeEmail, duration, location } = req.body;
    console.log(`Executing tool: schedule_event(title='${title}', time='${time}', attendee='${attendeeEmail}')`);

    if (!title || !time || !attendeeEmail) {
        return res.status(400).json({ error: "Missing required fields: 'title', 'time', or 'attendeeEmail'" });
    }

    try {
        // Use the existing email service with calendar integration
        const emailResponse = await axios.post(`${emailServerUrl}/send-reminder`, {
            to: attendeeEmail,
            reminderText: title,
            reminderTime: time,
            senderName: 'Calendar Assistant',
            includeCalendarInvite: true,
            eventDuration: duration,
            eventLocation: location
        });

        // Store in local database
        const newEvent = { 
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title,
            time, 
            attendeeEmail,
            duration: duration || 'auto-suggested',
            location: location || 'not specified',
            createdAt: new Date().toISOString()
        };

        res.status(200).json({ 
            success: true,
            message: `Calendar event "${title}" scheduled and invite sent to ${attendeeEmail}`,
            event: newEvent,
            emailResponse: emailResponse.data,
            calendarIncluded: true
        });
    } catch (error) {
        console.error('Error scheduling event:', error);
        res.status(500).json({ 
            error: 'Failed to schedule calendar event',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
```

### Step 3: Update the Agent Prompt

Modify the system prompt in `src/agent-executor.ts`:

```typescript
const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a helpful assistant that manages reminders and provides information. You have access to:
    1. add_reminder - For basic reminders stored locally
    2. list_reminders - To show all current reminders
    3. send_email_reminder - To send reminders via email
    4. get_weather - To get current weather information for any location
    
    When users ask about weather, use the get_weather tool.
    When users mention email addresses or want email reminders, use send_email_reminder.
    If no email is specified, use add_reminder for local storage.
    
    Default email for reminders: ${process.env.DEFAULT_REMINDER_EMAIL || 'No default set'}
    
    Be helpful and ask for clarification if requests are ambiguous.`],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
]);
```

### Step 4: Test Your New Tool

1. **Restart your servers**:
   ```bash
   npm run start:full
   ```

2. **Try calendar scheduling queries** in the UI:
   - "Schedule a team meeting tomorrow at 2 PM with john@company.com"
   - "Create calendar event for dentist appointment next week at 3 PM with myself@email.com"
   - "Schedule 60-minute client call on Friday at 10 AM in Conference Room A with client@business.com"

3. **Watch the sequence diagram** show:
   ```
   User → Agent → MCP Server → CalendarService → Email Service → Calendar System
   ```

### Step 5: Enhanced Calendar Features

To add more advanced calendar functionality:

1. **Add recurring events support**:
   ```env
   CALENDAR_TIMEZONE=America/New_York
   CALENDAR_DEFAULT_DURATION=30
   ```

2. **Enhanced time parsing**:
   ```typescript
   // The calendar-utils.ts already includes smart time parsing for:
   // - "tomorrow at 2 PM" 
   // - "next Friday at 10 AM"
   // - "in 3 hours"
   // - "every Wednesday at 9 AM" (for recurring events)
   ```

3. **Advanced calendar integration**:
   ```typescript
   // Example: Add timezone support
   const timeAnalysis = analyzeTimeExpression(time, {
       timezone: process.env.CALENDAR_TIMEZONE || 'UTC',
       defaultDuration: parseInt(process.env.CALENDAR_DEFAULT_DURATION || '30')
   });
   ```

4. **Multi-participant events**:
   ```typescript
   // Support multiple attendees
   attendees: attendeeEmails.map(email => ({
       name: 'Attendee',
       email: email,
       rsvp: true,
       partstat: 'NEEDS-ACTION'
   }))
   ```

## 🎓 **Key MCP Lessons from This Tutorial**

### 1. **Tool Isolation**
Each tool is independent and can be developed/tested separately.

### 2. **Standardized Interface**
All tools follow the same pattern: input validation, processing, response formatting.

### 3. **Error Handling**
Proper error handling ensures the AI can gracefully handle failures.

### 4. **Observability**
The sequence diagram shows exactly what happened, making debugging easy.

### 5. **Security**
Input validation and error boundaries prevent malicious or malformed requests.

## 🚀 **Next Steps**

Try creating tools for:
- **Database queries** (with proper SQL injection protection)
- **File operations** (with sandboxed access)
- **API integrations** (with rate limiting)
- **Calendar management** (with authentication)

Each new tool teaches you more about building reliable, secure MCP systems!
