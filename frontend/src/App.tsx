import React, { useState } from 'react'
import { QueryForm } from './components/QueryForm'
import { SequenceDiagram } from './components/SequenceDiagram'
import { ExecutionStep } from './types/ExecutionStep'

function App() {
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastQuery, setLastQuery] = useState('')

  const handleQuerySubmit = async (query: string) => {
    setIsProcessing(true)
    setLastQuery(query)
    setSteps([])

    try {
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error('Failed to execute query')
      }

      const data = await response.json()
      setSteps(data.steps || [])
    } catch (error) {
      console.error('Error executing query:', error)
      setSteps([
        {
          id: 'error',
          type: 'error',
          timestamp: new Date().toISOString(),
          content: 'Failed to execute query. Please check if the server is running.',
          actor: 'System',
          target: 'Client'
        }
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container">
      <h1>MCP Agent Visualizer</h1>
      
      <QueryForm 
        onSubmit={handleQuerySubmit} 
        isProcessing={isProcessing}
      />
      
      {lastQuery && (
        <div className="query-display">
          <h3>Query: "{lastQuery}"</h3>
          <div className={`status ${isProcessing ? 'processing' : 'complete'}`}>
            {isProcessing ? 'Processing...' : 'Complete'}
          </div>
        </div>
      )}
      
      <SequenceDiagram steps={steps} />
    </div>
  )
}

export default App
