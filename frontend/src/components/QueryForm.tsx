import React, { useState } from 'react'

interface QueryFormProps {
  onSubmit: (query: string) => void
  isProcessing: boolean
}

export const QueryForm: React.FC<QueryFormProps> = ({ onSubmit, isProcessing }) => {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && !isProcessing) {
      onSubmit(query.trim())
    }
  }

  const exampleQueries = [
    "Add a reminder to call the doctor at 10 AM",
    "Send me an email reminder to buy groceries at 5 PM to john@example.com",
    "What are my current reminders?",
    "Email reminder: Team meeting tomorrow at 2 PM in Conference Room A to team@company.com for 60 minutes",
    "Send calendar invite for dentist appointment next week at 3 PM to myself@email.com",
    "Email reminder to call mom tonight at 8 PM to mom@email.com for 15 minutes"
  ]

  return (
    <div className="input-section">
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query (e.g., 'Add a reminder to call the doctor at 10 AM')"
          className="input-field"
          disabled={isProcessing}
        />
        <button 
          type="submit" 
          className="submit-btn"
          disabled={!query.trim() || isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Execute'}
        </button>
      </form>
      
      <div className="example-queries">
        <p><strong>Example queries:</strong></p>
        <div className="examples">
          {exampleQueries.map((example, index) => (
            <button
              key={index}
              onClick={() => setQuery(example)}
              className="example-btn"
              disabled={isProcessing}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
