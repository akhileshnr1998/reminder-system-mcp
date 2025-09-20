export interface ExecutionStep {
  id: string
  type: 'start' | 'tool_call' | 'tool_response' | 'llm_response' | 'end' | 'error'
  timestamp: string
  content: string
  actor: string
  target: string
  duration?: number
  metadata?: Record<string, any>
}
