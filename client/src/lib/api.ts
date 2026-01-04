/**
 * API Service for PublicSource Geographic Classification
 * Swiss Modernism: Clean, functional API layer with precise error handling
 */

const API_ENDPOINT = "https://yj5nbxrxq4.coze.site/stream_run";
const API_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjA1NWIzNDljLTE5ZWItNGVhMC1iY2YzLTYwODFmY2Q4OTIyZiJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbIlVIOE5CTzEyVTJCeEQyQmd5ZktNWFlHZkJRektYakc0Il0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzY3NTU0MzE3LCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NTkxNTcwNjIxNDA2OTA0MzgzIiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NTkxNTg3OTg1NjkxMjQ2NTkyIn0.jDMb0Fwa-JQKkmM7VS3TiYQU27ZiKMxDyz4NrRwwwAUk-UMoWgD9NaXTWPVpX7PS5MannNTiL13whDUYvVoze6w4VZQMqm-CKzERlGxWPyvKObep4aEGmnKVvBSpccU8ZJAGuZxdwGNJOR7XazehGst5PRUN5D_23rACBUzVAC1WnIaNKhuorEBqtM4pyKYi0oH4z2VBgrxTvqy5U9aFQPlEn1iLYYp6Ob49EOe9uajK6jujXrXzV5bVuFcnD-dWYmxBKBfimJBp8eiyHpAZC_ao5vWtBcoduOGAHZfT56NxbY0meTtIVi-ENigMWJNDBYI2llKN5Z44n6-zOAC9CQ";
const PROJECT_ID = 7591518110268817449;

export interface AnalysisResult {
  scope: string;
  areas: Array<{
    name: string;
    region: string;
    context: string;
  }>;
  summary: string;
  confidence: string;
  notes: string;
  rawMarkdown: string;
}

export interface AnalysisError {
  message: string;
  details?: string;
}

/**
 * Parse the markdown response from the API into structured data
 */
function parseMarkdownResponse(markdown: string): AnalysisResult {
  const lines = markdown.split('\n');
  let scope = '';
  let areas: Array<{ name: string; region: string; context: string }> = [];
  let summary = '';
  let confidence = '';
  let notes = '';
  
  let currentSection = '';
  let tableStarted = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('### Geographic Scope')) {
      currentSection = 'scope';
      continue;
    } else if (line.startsWith('### Identified Areas')) {
      currentSection = 'areas';
      continue;
    } else if (line.startsWith('### Analysis Summary')) {
      currentSection = 'summary';
      continue;
    } else if (line.startsWith('### Confidence Level')) {
      currentSection = 'confidence';
      continue;
    } else if (line.startsWith('### Additional Notes')) {
      currentSection = 'notes';
      continue;
    }
    
    // Skip empty lines and headers
    if (!line || line.startsWith('#') || line.startsWith('|--')) continue;
    
    switch (currentSection) {
      case 'scope':
        if (line) scope = line;
        break;
        
      case 'areas':
        if (line.startsWith('|')) {
          if (!tableStarted) {
            tableStarted = true;
            continue; // Skip header row
          }
          const cells = line.split('|').map(c => c.trim()).filter(c => c);
          if (cells.length >= 3) {
            areas.push({
              name: cells[0],
              region: cells[1],
              context: cells[2]
            });
          }
        }
        break;
        
      case 'summary':
        if (line) summary += (summary ? ' ' : '') + line;
        break;
        
      case 'confidence':
        if (line) confidence = line;
        break;
        
      case 'notes':
        if (line) notes += (notes ? ' ' : '') + line;
        break;
    }
  }
  
  return {
    scope,
    areas,
    summary,
    confidence,
    notes,
    rawMarkdown: markdown
  };
}

/**
 * Analyze text content for geographic classification
 */
export async function analyzeText(text: string): Promise<AnalysisResult> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: {
          query: {
            prompt: [
              {
                type: 'text',
                content: {
                  text: text
                }
              }
            ]
          }
        },
        type: 'query',
        project_id: PROJECT_ID
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let fullResponse = '';

    // Read the stream
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullResponse += chunk;
    }

    // Parse the streaming response (SSE format)
    // The API returns Server-Sent Events with 'event:' and 'data:' prefixes
    const lines = fullResponse.split('\n').filter(line => line.trim());
    let markdownContent = '';

    for (const line of lines) {
      // SSE format: lines starting with 'data:' contain the JSON payload
      if (line.startsWith('data:')) {
        const jsonStr = line.substring(5).trim(); // Remove 'data:' prefix
        try {
          const data = JSON.parse(jsonStr);
          if (data.type === 'answer' && data.content && data.content.answer) {
            markdownContent += data.content.answer;
          }
        } catch (e) {
          // Skip invalid JSON lines
          continue;
        }
      }
    }

    if (!markdownContent) {
      throw new Error('No valid response content received from API');
    }

    return parseMarkdownResponse(markdownContent);
  } catch (error) {
    console.error('Analysis error:', error);
    throw {
      message: 'Failed to analyze text',
      details: error instanceof Error ? error.message : 'Unknown error'
    } as AnalysisError;
  }
}

/**
 * Extract text from uploaded file
 */
export async function extractTextFromFile(file: File): Promise<string> {
  // Handle .docx files
  if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      throw new Error('Failed to parse .docx file. Please ensure the file is not corrupted.');
    }
  }
  
  // Handle PDF files
  if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
    throw new Error('PDF files are not supported yet. Please copy and paste the text content or convert to .txt/.docx format.');
  }
  
  // Handle plain text files
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        reject(new Error('Failed to read file content'));
        return;
      }
      resolve(text);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}
