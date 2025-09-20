# MCP Agent Visualizer

A comprehensive educational project demonstrating **Model Context Protocol (MCP)** concepts through a real-world reminder system with email integration and interactive sequence diagram visualization.

## 🧠 **What is MCP?**

**Model Context Protocol (MCP)** is a standard that enables AI models to securely interact with external tools and data sources. This project demonstrates core MCP concepts:

- **Tool Declaration**: How AI agents discover and understand available capabilities
- **Secure Communication**: Standardized protocol between AI and external services  
- **Error Handling**: Graceful failure management and recovery
- **Observability**: Real-time monitoring of AI decision-making processes
- **Multi-Service Architecture**: AI orchestrating multiple independent services

## 🎓 **Learning Resources**

- **[📚 MCP Concepts](docs/MCP_CONCEPTS.md)**: Deep dive into MCP theory and benefits
- **[🛠️ Step-by-Step Tutorial](docs/TUTORIAL.md)**: Build your first MCP tool from scratch
- **[💡 Real-World Examples](docs/EXAMPLES.md)**: Advanced MCP patterns and use cases

## 🎯 **Why This Project Matters**

This isn't just a reminder app—it's a **complete MCP learning environment** that shows how AI agents can:
- Make intelligent decisions about tool usage
- Safely interact with external APIs and services
- Handle complex multi-step workflows
- Provide transparent, debuggable execution flows

## Features

- **Interactive Query Input**: Enter natural language queries to interact with the reminder agent
- **Email Reminders**: Send reminder emails via Nodemailer integration
- **📅 Calendar Integration**: Automatic ICS file generation with calendar invites attached to emails
- **🧠 Smart Time Parsing**: Natural language time understanding ("tomorrow at 2 PM", "next week")
- **⏰ Intelligent Duration**: Auto-suggests event duration based on task type (calls, meetings, appointments)
- **Real-time Sequence Diagrams**: Visual representation of agent execution flow using Mermaid diagrams
- **Execution Step Tracking**: Detailed breakdown of each step in the agent's decision-making process
- **Tool Call Visualization**: See exactly when and how the agent calls different tools
- **Multi-Service Architecture**: MCP server communicates with separate email service

## Setup

### Prerequisites

- Node.js (v18 or later)
- npm
- A valid GEMINI_API_KEY in your environment variables

### Installation

1. **Install backend dependencies:**
   ```bash
   npm install
   ```

2. **Install frontend dependencies:**
   ```bash
   npm run install:frontend
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory (see `env.example` for reference):
   ```env
   # AI Model Configuration
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Email Configuration
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password_here
   
   # Optional: Default email for reminders
   DEFAULT_REMINDER_EMAIL=your_email@gmail.com
   ```
   
   **Note for Gmail users:** You'll need to:
   - Enable 2-factor authentication
   - Generate an "App Password" for `EMAIL_PASS`
   - Use the app password, not your regular Gmail password

### Running the Application

#### Option 1: Run Both Backend and Frontend (Recommended)
```bash
npm run start:full
```

This will start:
- MCP server on http://localhost:3000
- Email server on http://localhost:3002  
- Frontend development server on http://localhost:3001

#### Option 2: Run Separately

**MCP Server only:**
```bash
npm run start:dev
```

**Email Server only:**
```bash
npm run start:email
```

**Frontend only:**
```bash
npm run start:frontend
```

**CLI Client (original):**
```bash
npm run start:client
```

## Usage

1. Open your browser to http://localhost:3001
2. Enter a query in the input field, such as:
   - "Add a reminder to call the doctor at 10 AM"
   - "Send me an email reminder to buy groceries at 5 PM to john@example.com"
   - "What are my current reminders?"
   - "Email reminder: Team meeting tomorrow at 2 PM in Conference Room A to team@company.com for 60 minutes"
   - "Send calendar invite for dentist appointment next week at 3 PM to myself@email.com"
3. Click "Execute" to run the query
4. Watch the sequence diagram populate with the agent's execution steps
5. Review detailed step information below the diagram

## 🏗️ **MCP Architecture Demonstration**

This project implements a **canonical MCP architecture** with clear separation of concerns:

### **Core Components**
- **🤖 AI Agent** (`src/agent-executor.ts`): LangChain agent that makes tool decisions
- **🔧 MCP Server** (`src/mcp_server.ts`): Tool registry and execution coordinator  
- **📧 Email Service** (`src/email-server.ts`): Independent service for email operations
- **📊 Visualization** (`frontend/src/`): Real-time execution monitoring with sequence diagrams

### **MCP Communication Flow**
```
👤 User Query 
    ↓
📱 Frontend (React UI)
    ↓ HTTP Request
🔧 MCP Server (Tool Registry)
    ↓ Agent Invocation  
🤖 AI Agent (Decision Making)
    ↓ Tool Selection & Execution
🛠️ Tools (Local Storage + Email Service)
    ↓ Results
📊 Sequence Diagram Visualization
```

### **Key MCP Patterns Demonstrated**
1. **Tool Discovery**: Agent learns available capabilities at runtime
2. **Parameter Validation**: Zod schemas ensure type safety
3. **Error Propagation**: Failures handled gracefully with meaningful messages
4. **Execution Tracking**: Complete audit trail of AI decisions and actions
5. **Service Isolation**: Each tool runs independently with clear boundaries

## Example Queries

### Local Reminders
- "Add a reminder to call Ranjith at 2pm tomorrow"
- "Set a reminder to buy groceries tonight at 8pm"
- "List all my reminders"

### Email Reminders with Calendar Invites
- "Send me an email reminder to call the doctor at 10 AM to john@example.com"
- "Email reminder: Team meeting tomorrow at 2 PM in Conference Room A to team@company.com for 60 minutes"
- "Send calendar invite for dentist appointment next week at 3 PM to myself@email.com"
- "Email reminder to call mom tonight at 8 PM to mom@email.com for 15 minutes"

### 📅 Calendar Features
- **Automatic ICS Generation**: All email reminders include calendar invite attachments
- **Smart Time Parsing**: Natural language understanding ("tomorrow at 2 PM", "next Tuesday")
- **Duration Intelligence**: Auto-suggests duration based on task type:
  - Phone calls: 15 minutes
  - Meetings: 60 minutes
  - Medical appointments: 45 minutes
  - Default: 30 minutes
- **Location Support**: Extracts and includes location information
- **Reminder Alerts**: Includes 15-minute and 5-minute pre-event notifications

## Sequence Diagram Legend

- **Blue arrows**: Agent → Tool calls
- **Green arrows**: Tool responses
- **Orange arrows**: LLM processing and responses
- **Red arrows**: Error conditions

## Development

### Building for Production

```bash
npm run build
npm run build:frontend
```

### **Project Structure**

```
├── src/
│   ├── mcp_server.ts          # 🔧 MCP Tool Server (core protocol implementation)
│   ├── email-server.ts        # 📧 Independent Email Service  
│   ├── agent-executor.ts      # 🤖 AI Agent with Tool Orchestration
│   └── mcp_client.ts          # 💻 CLI Interface (alternative to web UI)
├── frontend/
│   ├── src/
│   │   ├── components/        # 📊 React UI Components
│   │   ├── types/            # 📝 TypeScript Interfaces
│   │   └── App.tsx           # 🎨 Main Application
│   └── package.json          # Frontend Dependencies
├── docs/
│   ├── MCP_CONCEPTS.md        # 📚 MCP Theory & Benefits
│   ├── TUTORIAL.md            # 🛠️ Step-by-Step Learning Guide  
│   └── EXAMPLES.md            # 💡 Advanced Patterns & Use Cases
├── env.example                # ⚙️ Configuration Template
└── package.json              # Backend Dependencies
```

## 🚀 **Quick Start for MCP Learning**

1. **Understand the Concepts**: Read [MCP_CONCEPTS.md](docs/MCP_CONCEPTS.md)
2. **See It in Action**: Run `npm run start:full` and try the UI
3. **Build Your Own Tool**: Follow [TUTORIAL.md](docs/TUTORIAL.md) 
4. **Explore Advanced Patterns**: Study [EXAMPLES.md](docs/EXAMPLES.md)
5. **Experiment**: Modify existing tools or add new ones

## 🎯 **Educational Value**

This project demonstrates **production-ready MCP concepts**:
- ✅ **Security**: Input validation, error boundaries, service isolation
- ✅ **Scalability**: Modular architecture, independent service deployment
- ✅ **Observability**: Complete execution tracking and debugging capabilities  
- ✅ **Reliability**: Graceful error handling and recovery mechanisms
- ✅ **Developer Experience**: Clear interfaces, comprehensive documentation

Perfect for developers learning to build **agentic AI systems** that can safely and effectively interact with real-world services.
