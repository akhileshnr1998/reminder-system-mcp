import React, { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { ExecutionStep } from '../types/ExecutionStep'

interface SequenceDiagramProps {
  steps: ExecutionStep[]
}

export const SequenceDiagram: React.FC<SequenceDiagramProps> = ({ steps }) => {
  const diagramRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    })
  }, [])

  useEffect(() => {
    if (steps.length > 0 && diagramRef.current) {
      renderDiagram()
    }
  }, [steps])

  const truncateText = (text: string, maxLength: number = 60): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const generateMermaidDiagram = () => {
    if (steps.length === 0) return ''

    const participants = Array.from(new Set([
      ...steps.map(step => step.actor),
      ...steps.map(step => step.target)
    ]))

    let diagram = 'sequenceDiagram\n'
    
    // Add participants in logical order
    const orderedList = ['User', 'Agent', 'MCPClient', 'MCPServer', 'ReminderService', 'EmailService', 'LLM']
    const presentFromOrdered = orderedList.filter(p => participants.includes(p))
    const additionalOnes = participants.filter(p => !orderedList.includes(p))
    
    const allParticipants = presentFromOrdered.concat(additionalOnes)
    allParticipants.forEach(participant => {
      diagram += `    participant ${participant.replace(/\s/g, '')}\n`
    })
    
    diagram += '\n'

    // Add sequence steps
    steps.forEach((step) => {
      const actor = step.actor.replace(/\s/g, '')
      const target = step.target.replace(/\s/g, '')
      // Truncate content and escape quotes
      const truncatedContent = truncateText(step.content).replace(/"/g, '\\"')
      
      switch (step.type) {
        case 'start':
          diagram += `    Note over ${actor}: ${truncatedContent}\n`
          break
        case 'tool_call':
          // MCP protocol calls use specific arrow types
          if (actor === 'Agent' && target === 'MCPClient') {
            diagram += `    ${actor}->>+${target}: ${truncatedContent}\n`
          } else if (actor === 'MCPClient' && target === 'MCPServer') {
            diagram += `    ${actor}->>+${target}: 🔌 ${truncatedContent}\n`
          } else if (actor === 'MCPServer' && (target === 'ReminderService' || target === 'EmailService')) {
            diagram += `    ${actor}->>+${target}: ${truncatedContent}\n`
          } else {
            diagram += `    ${actor}->>+${target}: ${truncatedContent}\n`
          }
          break
        case 'tool_response':
          // MCP protocol responses
          if (actor === 'ReminderService' && target === 'MCPServer') {
            diagram += `    ${actor}-->>-${target}: ${truncatedContent}\n`
          } else if (actor === 'EmailService' && target === 'MCPServer') {
            diagram += `    ${actor}-->>-${target}: ${truncatedContent}\n`
          } else if (actor === 'MCPServer' && target === 'MCPClient') {
            diagram += `    ${actor}-->>-${target}: 🔌 ${truncatedContent}\n`
          } else if (actor === 'MCPClient' && target === 'Agent') {
            diagram += `    ${actor}-->>-${target}: ${truncatedContent}\n`
          } else {
            diagram += `    ${actor}-->>-${target}: ${truncatedContent}\n`
          }
          break
        case 'llm_response':
          diagram += `    ${actor}->>${target}: ${truncatedContent}\n`
          break
        case 'end':
          diagram += `    Note over ${actor}: ${truncatedContent}\n`
          break
        case 'error':
          diagram += `    ${actor}-x${target}: ❌ ERROR: ${truncatedContent}\n`
          break
        default:
          diagram += `    ${actor}->${target}: ${truncatedContent}\n`
      }
    })

    return diagram
  }

  const renderDiagram = async () => {
    if (!diagramRef.current) return

    const diagramDefinition = generateMermaidDiagram()
    
    try {
      const { svg } = await mermaid.render('sequence-diagram', diagramDefinition)
      diagramRef.current.innerHTML = svg
      
      // Add hover functionality to show full text
      addHoverTooltips()
    } catch (error) {
      console.error('Error rendering diagram:', error)
      diagramRef.current.innerHTML = '<p>Error rendering sequence diagram</p>'
    }
  }

  const addHoverTooltips = () => {
    if (!diagramRef.current) return

    // Find all text elements in the SVG
    const textElements = diagramRef.current.querySelectorAll('text')
    
    // Create a mapping of truncated content to full step content
    const contentMap = new Map<string, string>()
    steps.forEach(step => {
      if (step.content.length > 60) {
        const truncated = truncateText(step.content)
        contentMap.set(truncated, step.content)
        // Also store without quotes escaping for better matching
        const unescaped = truncated.replace(/\\"/g, '"')
        contentMap.set(unescaped, step.content)
      }
    })
    
    console.log('Content map:', contentMap) // Debug logging
    
    textElements.forEach((textElement) => {
      const textContent = textElement.textContent || ''
      
      // Check if this text contains truncation
      if (textContent.includes('...')) {
        console.log(`Found truncated text: "${textContent}"`) // Debug logging
        
        // Try to find matching full content
        let fullContent = contentMap.get(textContent)
        
        // If not found, try partial matching
        if (!fullContent) {
          for (const [truncated, full] of contentMap.entries()) {
            if (textContent.includes(truncated.replace('...', '')) || 
                truncated.includes(textContent.replace('...', ''))) {
              fullContent = full
              break
            }
          }
        }
        
        if (fullContent) {
          console.log(`Matched with full content: "${fullContent}"`) // Debug logging
          
          // Add visual styling for truncated text
          textElement.style.cursor = 'help'
          textElement.style.textDecoration = 'underline'
          textElement.style.textDecorationStyle = 'dotted'
          textElement.style.textDecorationColor = '#6b7280'
          
          // Create tooltip element
          let tooltip: HTMLDivElement | null = null
          
          const showTooltip = (e: MouseEvent) => {
            // Remove existing tooltip
            const existingTooltip = document.querySelector('.mermaid-tooltip')
            if (existingTooltip) {
              existingTooltip.remove()
            }
            
            tooltip = document.createElement('div')
            tooltip.className = 'mermaid-tooltip'
            tooltip.textContent = fullContent!
            tooltip.style.cssText = `
              position: fixed;
              background: rgba(0, 0, 0, 0.9);
              color: white;
              padding: 8px 12px;
              border-radius: 4px;
              font-size: 12px;
              max-width: 300px;
              word-wrap: break-word;
              z-index: 10000;
              pointer-events: none;
              white-space: pre-wrap;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              border: 1px solid rgba(255, 255, 255, 0.1);
              animation: tooltipFadeIn 0.2s ease-out;
            `
            
            document.body.appendChild(tooltip)
            
            // Position tooltip
            const updatePosition = (event: MouseEvent) => {
              if (tooltip) {
                let left = event.clientX + 10
                let top = event.clientY - 10
                
                // Keep tooltip on screen
                const rect = tooltip.getBoundingClientRect()
                if (left + rect.width > window.innerWidth) {
                  left = event.clientX - rect.width - 10
                }
                if (top < 0) {
                  top = event.clientY + 20
                }
                
                tooltip.style.left = left + 'px'
                tooltip.style.top = top + 'px'
              }
            }
            
            updatePosition(e)
          }
          
          const hideTooltip = () => {
            if (tooltip) {
              tooltip.remove()
              tooltip = null
            }
          }
          
          textElement.addEventListener('mouseenter', showTooltip)
          textElement.addEventListener('mouseleave', hideTooltip)
          textElement.addEventListener('mousemove', (e) => {
            if (tooltip) {
              let left = e.clientX + 10
              let top = e.clientY - 10
              
              const rect = tooltip.getBoundingClientRect()
              if (left + rect.width > window.innerWidth) {
                left = e.clientX - rect.width - 10
              }
              if (top < 0) {
                top = e.clientY + 20
              }
              
              tooltip.style.left = left + 'px'
              tooltip.style.top = top + 'px'
            }
          })
        } else {
          console.log(`No match found for: "${textContent}"`) // Debug logging
        }
      }
    })
  }

  return (
    <div className="diagram-section">
      <h2>Execution Flow</h2>
      
      {steps.length > 0 ? (
        <>
          <div className="sequence-diagram">
            <div ref={diagramRef} />
          </div>
          
          <div className="step-details">
            <h3>Execution Steps</h3>
            <ul className="step-list">
              {steps.map((step, index) => {
                const isMCPStep = step.actor === 'MCPClient' || step.actor === 'MCPServer' || 
                                  step.target === 'MCPClient' || step.target === 'MCPServer' ||
                                  step.content.includes('JSON-RPC') || step.content.includes('MCP');
                
                return (
                  <li 
                    key={step.id} 
                    className={`step-item ${step.type}`}
                    data-mcp={isMCPStep}
                    data-actor={step.actor}
                    data-target={step.target}
                  >
                    <div className="step-timestamp">
                      Step {index + 1} - {new Date(step.timestamp).toLocaleTimeString()}
                      {step.duration && ` (${step.duration}ms)`}
                      {isMCPStep && <span style={{marginLeft: '8px', fontSize: '12px', color: '#6366f1'}}>🔌 MCP</span>}
                    </div>
                    <div className="step-content">
                      <strong>{step.actor} → {step.target}:</strong> {step.content}
                    </div>
                    {step.metadata && (
                      <div className="step-metadata">
                        <details>
                          <summary>Metadata {isMCPStep && '(MCP Protocol)'}</summary>
                          <pre>{JSON.stringify(step.metadata, null, 2)}</pre>
                        </details>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>Execute a query to see the sequence diagram</p>
        </div>
      )}
    </div>
  )
}
