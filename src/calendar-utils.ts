// calendar-utils.ts
// 📅 CALENDAR INTEGRATION UTILITY
//
// This module handles ICS (calendar invite) file generation for email reminders.
// Demonstrates how MCP tools can create rich, multi-format outputs.

import { createEvent, EventAttributes } from 'ics';

export interface CalendarEventData {
    title: string;
    description: string;
    startDateTime: string; // ISO string or relative time like "tomorrow at 2 PM"
    duration?: number; // in minutes, defaults to 30
    location?: string;
    attendeeEmail?: string;
}

export interface ParsedDateTime {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
}

/**
 * Parse natural language time expressions into specific datetime
 * This function demonstrates how AI can interpret human time expressions
 */
export function parseTimeExpression(timeStr: string): Date {
    const now = new Date();
    const timeStrLower = timeStr.toLowerCase().trim();
    
    // Handle "tomorrow" expressions
    if (timeStrLower.includes('tomorrow')) {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        
        // Extract time if specified (e.g., "tomorrow at 2 PM")
        const timeMatch = timeStrLower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
        if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2] || '0');
            const ampm = timeMatch[3];
            
            if (ampm === 'pm' && hour !== 12) hour += 12;
            if (ampm === 'am' && hour === 12) hour = 0;
            
            tomorrow.setHours(hour, minute, 0, 0);
        } else {
            // Default to 9 AM if no specific time
            tomorrow.setHours(9, 0, 0, 0);
        }
        return tomorrow;
    }
    
    // Handle "today" expressions
    if (timeStrLower.includes('today')) {
        const today = new Date(now);
        
        const timeMatch = timeStrLower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
        if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2] || '0');
            const ampm = timeMatch[3];
            
            if (ampm === 'pm' && hour !== 12) hour += 12;
            if (ampm === 'am' && hour === 12) hour = 0;
            
            today.setHours(hour, minute, 0, 0);
        }
        return today;
    }
    
    // Handle "next week" expressions
    if (timeStrLower.includes('next week')) {
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);
        nextWeek.setHours(9, 0, 0, 0); // Default to 9 AM
        return nextWeek;
    }
    
    // Handle "in X hours" expressions
    const hoursMatch = timeStrLower.match(/in (\d+) hours?/);
    if (hoursMatch) {
        const hours = parseInt(hoursMatch[1]);
        const futureTime = new Date(now);
        futureTime.setHours(now.getHours() + hours);
        return futureTime;
    }
    
    // Handle specific times today (e.g., "10 AM", "2:30 PM")
    const timeMatch = timeStrLower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
    if (timeMatch) {
        const today = new Date(now);
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2] || '0');
        const ampm = timeMatch[3];
        
        if (ampm === 'pm' && hour !== 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        
        today.setHours(hour, minute, 0, 0);
        
        // If the time has already passed today, schedule for tomorrow
        if (today <= now) {
            today.setDate(now.getDate() + 1);
        }
        
        return today;
    }
    
    // Default: 1 hour from now
    const defaultTime = new Date(now);
    defaultTime.setHours(now.getHours() + 1);
    return defaultTime;
}

/**
 * Convert JavaScript Date to ICS-compatible date array
 */
function dateToIcsArray(date: Date): ParsedDateTime {
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1, // ICS months are 1-based
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes()
    };
}

/**
 * Generate ICS calendar file content for an event
 */
export async function generateCalendarInvite(eventData: CalendarEventData): Promise<{ content: string; filename: string }> {
    try {
        // Parse the start time
        const startDate = parseTimeExpression(eventData.startDateTime);
        const endDate = new Date(startDate);
        endDate.setMinutes(startDate.getMinutes() + (eventData.duration || 30));
        
        // Convert to ICS format
        const startDateTime = dateToIcsArray(startDate);
        const endDateTime = dateToIcsArray(endDate);
        
        const event: EventAttributes = {
            start: [startDateTime.year, startDateTime.month, startDateTime.day, startDateTime.hour, startDateTime.minute],
            end: [endDateTime.year, endDateTime.month, endDateTime.day, endDateTime.hour, endDateTime.minute],
            title: eventData.title,
            description: eventData.description,
            location: eventData.location || 'Not specified',
            url: 'https://example.com/reminder-system',
            status: 'CONFIRMED',
            busyStatus: 'BUSY',
            organizer: { name: 'AI Reminder Assistant', email: process.env.EMAIL_USER || 'assistant@example.com' },
            attendees: eventData.attendeeEmail ? [
                { name: 'Attendee', email: eventData.attendeeEmail, rsvp: true, partstat: 'NEEDS-ACTION', role: 'REQ-PARTICIPANT' }
            ] : [],
            alarms: [
                {
                    action: 'display',
                    description: eventData.title,
                    trigger: { minutes: 15, before: true } // 15 minutes before
                },
                {
                    action: 'display', 
                    description: eventData.title,
                    trigger: { minutes: 5, before: true } // 5 minutes before
                }
            ]
        };
        
        const { error, value } = createEvent(event);
        
        if (error) {
            throw new Error(`Failed to create calendar event: ${error.message}`);
        }
        
        const filename = `reminder-${eventData.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${Date.now()}.ics`;
        
        return {
            content: value || '',
            filename: filename
        };
        
    } catch (error) {
        console.error('Error generating calendar invite:', error);
        throw new Error(`Calendar generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Enhanced time parsing that extracts structured information for the LLM
 */
export function analyzeTimeExpression(timeStr: string): {
    parsedDate: Date;
    confidence: 'high' | 'medium' | 'low';
    interpretation: string;
    suggestedDuration: number;
} {
    const parsedDate = parseTimeExpression(timeStr);
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    let interpretation = '';
    let suggestedDuration = 30; // default 30 minutes
    
    const timeStrLower = timeStr.toLowerCase();
    
    // High confidence patterns
    if (timeStrLower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/)) {
        confidence = 'high';
        interpretation = 'Specific time detected';
    } else if (timeStrLower.includes('tomorrow') || timeStrLower.includes('today')) {
        confidence = 'high';
        interpretation = 'Relative day with time';
    }
    
    // Medium confidence patterns
    else if (timeStrLower.includes('morning')) {
        confidence = 'medium';
        interpretation = 'General morning timeframe (assuming 9 AM)';
    } else if (timeStrLower.includes('afternoon')) {
        confidence = 'medium';
        interpretation = 'General afternoon timeframe (assuming 2 PM)';
    } else if (timeStrLower.includes('evening')) {
        confidence = 'medium';
        interpretation = 'General evening timeframe (assuming 6 PM)';
    }
    
    // Low confidence (fallback)
    else {
        confidence = 'low';
        interpretation = 'Vague time reference (defaulting to 1 hour from now)';
    }
    
    // Suggest duration based on task type
    if (timeStrLower.includes('call')) {
        suggestedDuration = 15; // Phone calls are usually shorter
    } else if (timeStrLower.includes('meeting') || timeStrLower.includes('appointment')) {
        suggestedDuration = 60; // Meetings are usually longer
    } else if (timeStrLower.includes('doctor') || timeStrLower.includes('dentist')) {
        suggestedDuration = 45; // Medical appointments
    }
    
    return {
        parsedDate,
        confidence,
        interpretation,
        suggestedDuration
    };
}
