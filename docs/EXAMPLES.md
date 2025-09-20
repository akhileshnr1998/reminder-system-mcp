# MCP Examples & Use Cases

## Real-World MCP Implementation Examples

This document showcases various MCP patterns and use cases that you can implement using this project as a foundation. All examples include calendar integration and rich output generation capabilities.

## 📅 **Calendar Integration Patterns**

The project includes sophisticated calendar integration through ICS file generation. Key features:
- **Natural Language Time Parsing**: "tomorrow at 2 PM", "next Friday", "in 3 hours"
- **Smart Duration Suggestions**: Calls (15min), Meetings (60min), Medical (45min)
- **Location Extraction**: Automatically detects and includes location information
- **Multi-format Output**: Email + Calendar invite attachments

## 📅 **Example 1: Enhanced Calendar Management Tool**

### Use Case: Executive Assistant AI with calendar coordination

```typescript
const calendarCoordinatorTool = tool(
    async (input: { 
        title: string; 
        participants: string[]; 
        preferredTimes: string[]; 
        duration: number;
        location?: string;
        priority: 'low' | 'medium' | 'high'
    }) => {
        // Advanced calendar coordination with multiple participants
        try {
            // Find optimal time slot across all participants
            const timeSlot = await findOptimalTimeSlot(input.participants, input.preferredTimes);
            
            // Generate calendar invites for all participants
            const invites = await Promise.all(
                input.participants.map(async (email) => {
                    return await generateCalendarInvite({
                        title: input.title,
                        description: `Meeting organized by AI Assistant\nPriority: ${input.priority}`,
                        startDateTime: timeSlot.start,
                        duration: input.duration,
                        location: input.location,
                        attendeeEmail: email
                    });
                })
            );
            
            // Send coordination email with all calendar invites
            const emailResult = await sendCoordinationEmail({
                participants: input.participants,
                meeting: {
                    title: input.title,
                    time: timeSlot.formatted,
                    location: input.location,
                    duration: input.duration
                },
                attachments: invites
            });
            
            return {
                success: true,
                meetingScheduled: timeSlot.start,
                participantsNotified: input.participants.length,
                calendarInvitesSent: invites.length,
                message: `Meeting "${input.title}" scheduled for ${timeSlot.formatted} with ${input.participants.length} participants`
            };
        } catch (error) {
            return {
                success: false,
                error: 'Failed to coordinate calendar event',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },
    {
        name: 'coordinate_meeting',
        description: 'Coordinates meetings across multiple participants with calendar integration',
        schema: z.object({
            title: z.string().describe('Meeting title'),
            participants: z.array(z.string().email()).describe('List of participant email addresses'),
            preferredTimes: z.array(z.string()).describe('Preferred time slots in natural language'),
            duration: z.number().describe('Meeting duration in minutes'),
            location: z.string().optional().describe('Meeting location or video link'),
            priority: z.enum(['low', 'medium', 'high']).describe('Meeting priority level'),
        }),
    }
);
```

## 📊 **Example 2: Database Tool with Calendar Integration**

### Use Case: Customer Support AI accessing customer database and scheduling follow-ups

```typescript
const customerLookupTool = tool(
    async (input: { customerId?: string; email?: string }) => {
        // Input validation
        if (!input.customerId && !input.email) {
            throw new Error('Either customerId or email must be provided');
        }
        
        // Database query with proper error handling
        try {
            const customer = await database.query(
                'SELECT id, name, email, status FROM customers WHERE id = ? OR email = ?',
                [input.customerId, input.email]
            );
            
            // Also offer to schedule follow-up if needed
            const followUpSuggestion = await suggestFollowUpAction(customer);
            
            return {
                success: true,
                customer: customer,
                message: `Found customer: ${customer.name}`,
                followUpSuggestion: followUpSuggestion,
                calendarIntegrationAvailable: true
            };
        } catch (error) {
            return {
                success: false,
                error: 'Customer not found or database error'
            };
        }
    },
    {
        name: 'lookup_customer',
        description: 'Look up customer information by ID or email address',
        schema: z.object({
            customerId: z.string().optional().describe('Customer ID to search for'),
            email: z.string().email().optional().describe('Customer email to search for'),
        }),
    }
);
```

**Security Considerations:**
- SQL injection protection via parameterized queries
- Limited data exposure (no sensitive fields like passwords)
- Audit logging of all customer data access
- Calendar integration only with explicit customer consent
- Meeting invites include privacy disclaimers

## 🔐 **Example 2: Authentication-Required Tool**

### Use Case: AI managing user permissions

```typescript
const userManagementTool = tool(
    async (input: { action: 'create' | 'disable' | 'enable'; userId: string; requesterToken: string }) => {
        // Authentication check
        const requester = await authenticateToken(input.requesterToken);
        if (!requester || !requester.hasPermission('USER_MANAGEMENT')) {
            throw new Error('Insufficient permissions for user management');
        }
        
        // Action execution with audit trail
        const result = await userService[input.action](input.userId);
        await auditLogger.log({
            action: input.action,
            target: input.userId,
            requester: requester.id,
            timestamp: new Date(),
            result: result.success
        });
        
        return result;
    },
    {
        name: 'manage_user',
        description: 'Create, enable, or disable user accounts (requires admin permissions)',
        schema: z.object({
            action: z.enum(['create', 'disable', 'enable']).describe('Action to perform'),
            userId: z.string().describe('User ID to manage'),
            requesterToken: z.string().describe('Authentication token of requester'),
        }),
    }
);
```

## 🌐 **Example 3: Travel Planning with Calendar Integration**

### Use Case: AI booking complete travel itinerary with calendar coordination

```typescript
const travelBookingTool = tool(
    async (input: { destination: string; dates: string[]; budget: number }) => {
        const bookingSteps = [];
        
        try {
            // Step 1: Find flights
            const flightResponse = await axios.post('/api/flights/search', {
                destination: input.destination,
                dates: input.dates,
                maxPrice: input.budget * 0.6 // 60% of budget for flights
            });
            
            bookingSteps.push({ step: 'flight_search', status: 'success', data: flightResponse.data });
            
            // Step 2: Find hotels
            const hotelResponse = await axios.post('/api/hotels/search', {
                destination: input.destination,
                dates: input.dates,
                maxPrice: input.budget * 0.4 // 40% of budget for hotels
            });
            
            bookingSteps.push({ step: 'hotel_search', status: 'success', data: hotelResponse.data });
            
            // Step 3: Create itinerary with calendar events
            const itinerary = {
                flights: flightResponse.data.options[0],
                hotel: hotelResponse.data.options[0],
                totalCost: flightResponse.data.options[0].price + hotelResponse.data.options[0].price
            };
            
            // Step 4: Generate calendar events for travel
            const calendarEvents = await generateTravelCalendar({
                destination: input.destination,
                flights: itinerary.flights,
                hotel: itinerary.hotel,
                travelerEmail: input.travelerEmail
            });
            
            bookingSteps.push({ step: 'calendar_generation', status: 'success', data: calendarEvents });
            
            return {
                success: true,
                itinerary: itinerary,
                steps: bookingSteps,
                message: `Found complete itinerary for ${input.destination} within budget of ${input.budget}`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                completedSteps: bookingSteps,
                message: 'Failed to complete booking - partial results available'
            };
        }
    },
    {
        name: 'book_travel',
        description: 'Search and book complete travel itinerary including flights and hotels',
        schema: z.object({
            destination: z.string().describe('Travel destination'),
            dates: z.array(z.string()).describe('Travel dates in YYYY-MM-DD format'),
            budget: z.number().describe('Total budget in dollars'),
        }),
    }
);
```

## 📁 **Example 4: File System Tool (Sandboxed)**

### Use Case: AI managing document processing

```typescript
const documentProcessorTool = tool(
    async (input: { filePath: string; operation: 'read' | 'summarize' | 'convert'; format?: string }) => {
        // Security: Ensure file is in allowed directory
        const allowedPath = path.resolve('./uploads');
        const requestedPath = path.resolve(input.filePath);
        
        if (!requestedPath.startsWith(allowedPath)) {
            throw new Error('File access denied: Path outside allowed directory');
        }
        
        // File operation with proper error handling
        try {
            switch (input.operation) {
                case 'read':
                    const content = await fs.readFile(requestedPath, 'utf8');
                    return { success: true, content: content };
                    
                case 'summarize':
                    const text = await fs.readFile(requestedPath, 'utf8');
                    const summary = await aiService.summarize(text);
                    return { success: true, summary: summary };
                    
                case 'convert':
                    const converted = await converterService.convert(requestedPath, input.format);
                    return { success: true, convertedPath: converted };
                    
                default:
                    throw new Error(`Unsupported operation: ${input.operation}`);
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: `Failed to ${input.operation} file: ${input.filePath}`
            };
        }
    },
    {
        name: 'process_document',
        description: 'Read, summarize, or convert documents in the uploads directory',
        schema: z.object({
            filePath: z.string().describe('Path to the document file'),
            operation: z.enum(['read', 'summarize', 'convert']).describe('Operation to perform'),
            format: z.string().optional().describe('Target format for conversion (pdf, docx, txt)'),
        }),
    }
);
```

## 🔄 **Example 5: Stateful Workflow Tool**

### Use Case: AI managing multi-step approval processes

```typescript
class WorkflowManager {
    private workflows = new Map<string, WorkflowState>();
    
    async processWorkflow(input: { workflowId: string; action: string; data?: any }) {
        const workflow = this.workflows.get(input.workflowId) || this.createWorkflow(input.workflowId);
        
        switch (workflow.currentStep) {
            case 'CREATED':
                return await this.handleCreatedStep(workflow, input);
            case 'REVIEW':
                return await this.handleReviewStep(workflow, input);
            case 'APPROVAL':
                return await this.handleApprovalStep(workflow, input);
            default:
                throw new Error(`Unknown workflow step: ${workflow.currentStep}`);
        }
    }
}

const workflowTool = tool(
    async (input: { workflowId: string; action: string; data?: any }) => {
        const manager = new WorkflowManager();
        const result = await manager.processWorkflow(input);
        
        return {
            success: true,
            workflowId: input.workflowId,
            currentStep: result.nextStep,
            message: result.message,
            availableActions: result.availableActions
        };
    },
    {
        name: 'manage_workflow',
        description: 'Manage multi-step approval workflows',
        schema: z.object({
            workflowId: z.string().describe('Unique workflow identifier'),
            action: z.string().describe('Action to take (submit, approve, reject, query)'),
            data: z.any().optional().describe('Additional data for the action'),
        }),
    }
);
```

## 📊 **Example 6: Analytics and Reporting Tool**

### Use Case: AI generating business reports

```typescript
const analyticsReportTool = tool(
    async (input: { reportType: string; dateRange: string[]; filters?: any }) => {
        const startTime = Date.now();
        
        try {
            // Generate report based on type
            let reportData;
            switch (input.reportType) {
                case 'sales':
                    reportData = await analyticsService.generateSalesReport(input.dateRange, input.filters);
                    break;
                case 'user_engagement':
                    reportData = await analyticsService.generateEngagementReport(input.dateRange, input.filters);
                    break;
                case 'performance':
                    reportData = await analyticsService.generatePerformanceReport(input.dateRange, input.filters);
                    break;
                default:
                    throw new Error(`Unsupported report type: ${input.reportType}`);
            }
            
            // Generate visualizations
            const charts = await chartService.generateCharts(reportData);
            
            // Create downloadable report
            const pdfReport = await pdfService.generateReport({
                title: `${input.reportType} Report`,
                dateRange: input.dateRange,
                data: reportData,
                charts: charts
            });
            
            return {
                success: true,
                reportData: reportData,
                charts: charts,
                downloadUrl: pdfReport.url,
                executionTime: Date.now() - startTime,
                message: `Generated ${input.reportType} report for ${input.dateRange.join(' to ')}`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                executionTime: Date.now() - startTime
            };
        }
    },
    {
        name: 'generate_analytics_report',
        description: 'Generate various types of business analytics reports with visualizations',
        schema: z.object({
            reportType: z.enum(['sales', 'user_engagement', 'performance']).describe('Type of report to generate'),
            dateRange: z.array(z.string()).describe('Date range for report in YYYY-MM-DD format'),
            filters: z.any().optional().describe('Additional filters for the report'),
        }),
    }
);
```

## 🏗️ **Best Practices from These Examples**

### 1. **Security First**
- Always validate inputs
- Implement proper authentication
- Use sandboxed execution environments
- Log all sensitive operations

### 2. **Error Handling**
- Graceful degradation on failures
- Meaningful error messages
- Partial success scenarios
- Retry mechanisms where appropriate

### 3. **Observability**
- Comprehensive logging
- Performance metrics
- Step-by-step execution tracking
- Audit trails for sensitive operations

### 4. **Modularity**
- Each tool has a single responsibility
- Tools can be combined for complex workflows
- Independent testing and deployment
- Clear interfaces between components

### 5. **Performance**
- Async operations where possible
- Timeout handling
- Resource management
- Efficient data structures

## 🎯 **Implementation Tips**

1. **Start Simple**: Begin with read-only tools before adding write operations
2. **Test Thoroughly**: Each tool should have comprehensive error testing
3. **Document Everything**: Clear descriptions help the AI use tools correctly
4. **Monitor Usage**: Track which tools are used most and optimize accordingly
5. **Security Review**: Regular security audits of tool implementations

These examples show how MCP enables AI systems to safely and effectively interact with complex, real-world systems while maintaining security, reliability, and observability.
