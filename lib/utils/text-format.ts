/**
 * Converts a string to title case
 * Example: "HELLO WORLD" -> "Hello World"
 * Example: "hello-world" -> "Hello World"
 */
export function toTitleCase(str: string): string {
  if (!str) return str
  
  return str
    .split(/[\s\-_]+/)
    .map(word => {
      if (!word) return word
      
      // Handle acronyms (all caps) - keep them as is
      if (/^[A-Z0-9]+$/.test(word) && word.length > 1) {
        return word
      }
      
      // Handle numbers - keep as is
      if (/^\d+$/.test(word)) {
        return word
      }
      
      // Convert to title case: first letter uppercase, rest lowercase
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
    .trim()
}

/**
 * Generates a project human_id from client name in title case
 * Removes special characters and limits length
 */
export function generateProjectHumanId(clientName: string, maxLength: number = 20): string {
  if (!clientName) {
    return 'Proy-' + Date.now().toString().slice(-6)
  }
  
  // Convert to title case first
  const titleCase = toTitleCase(clientName)
  
  // Remove special characters, keep only letters, numbers, and spaces
  const cleaned = titleCase.replace(/[^A-Za-z0-9\s]/g, '')
  
  // Replace multiple spaces with single space, then replace spaces with nothing
  const noSpaces = cleaned.replace(/\s+/g, '')
  
  // Limit length
  const truncated = noSpaces.substring(0, maxLength)
  
  // If result is empty, use fallback
  return truncated || 'Proy-' + Date.now().toString().slice(-6)
}

