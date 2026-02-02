/**
 * Legal Vision - Consent Moment Detection
 * Uses on-device AI (Gemma/Gemini Nano) to identify consent CTAs and encourage informed consent
 * 
 * NOTE: Chrome's Prompt API (window.ai.prompt) requires an origin trial token.
 * To enable:
 * 1. Register at https://developer.chrome.com/origintrials
 * 2. Add token to manifest.json: "trial_tokens": ["[YOUR_TOKEN]"]
 * 3. Requires Chrome 131+ on Windows 10+, macOS 13+, Linux, or ChromeOS
 * 
 * If Prompt API is unavailable, falls back to heuristic-based detection.
 */

/**
 * Icon cache for Lucide SVGs fetched from GitHub
 */
const iconCache = new Map();

/**
 * Processing state tracking
 */
let processingState = {
  isProcessing: false,
  hasFailed: false,
  currentRequest: null
};

/**
 * List of all icons needed by the extension
 */
const REQUIRED_ICONS = [
  'scale', 'loader-2', 'alert-circle', 'alert-triangle', 'check-circle-2',
  'x', 'chevron-down', 'chevron-up', 'file-text', 'file-x', 'shield',
  'file-contract', 'cookie', 'file', 'cube', 'map-pin', 'file-check',
  'target', 'folder-open', 'zap', 'database', 'box', 'rotate-ccw', 'rotate-cw'
];

/**
 * Pre-fetch all required icons on initialization
 */
async function preloadAllIcons() {
  const fetchPromises = REQUIRED_ICONS.map(iconName => fetchLucideIcon(iconName).catch(err => {
    console.warn(`[Legal Vision] Failed to preload icon ${iconName}:`, err);
    return null;
  }));
  
  await Promise.all(fetchPromises);
  console.log(`[Legal Vision] Preloaded ${iconCache.size} icons`);
}

/**
 * Fetch Lucide icon SVG from GitHub raw content
 */
async function fetchLucideIcon(iconName) {
  // Check cache first
  if (iconCache.has(iconName)) {
    return iconCache.get(iconName);
  }

  try {
    // Fetch from GitHub raw content
    const url = `https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/${iconName}.svg`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch icon: ${response.status}`);
    }
    let svgContent = await response.text();
    
    // Ensure SVG has proper attributes for styling
    if (!svgContent.includes('stroke=')) {
      svgContent = svgContent.replace('<svg', '<svg stroke="currentColor"');
    }
    if (!svgContent.includes('fill=')) {
      svgContent = svgContent.replace('<svg', '<svg fill="none"');
    }
    
    // Cache the result
    iconCache.set(iconName, svgContent);
    return svgContent;
  } catch (error) {
    console.warn(`[Legal Vision] Failed to fetch icon ${iconName} from GitHub:`, error);
    // Fallback to a simple placeholder
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
  }
}

/**
 * Create inline SVG icon using Lucide icons from GitHub
 */
async function createIcon(iconName, className = '', size = 20) {
  const svgContent = await fetchLucideIcon(iconName);
  
  // Update size in SVG
  const sizedSvg = svgContent
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`)
    .replace(/viewBox="([^"]*)"/, 'viewBox="$1"');
  
  return `<span class="${className}" style="display: inline-block; width: ${size}px; height: ${size}px; line-height: 1; vertical-align: middle;">${sizedSvg}</span>`;
}

/**
 * Create icon synchronously (for immediate use, uses fallback)
 */
function createIconSync(iconName, className = '', size = 20) {
  // Fallback icons for immediate rendering
  const fallbackIcons = {
    'scale': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`,
    'loader-2': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    'refresh-cw': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw-icon lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
    'alert-circle': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`,
    'alert-triangle': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    'check-circle-2': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    'x': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    'box': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box-icon lucide-box"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
    'rotate-ccw': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw-icon lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
    'rotate-cw': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-cw-icon lucide-rotate-cw"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>`,
    'chevron-down': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
    'chevron-up': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`,
    'file-text': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
    'file-x': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9.5 9.5 5 5"/><path d="m14.5 9.5-5 5"/></svg>`,
    'shield': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.67 8.83a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`,
    'file-contract': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
    'cookie': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5 4 4 0 0 1-5-5 4 4 0 0 1-5-5Z"/><path d="M12 12h.01"/></svg>`,
    'file': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
    'cube': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.5 6.5-9-4-9 4"/><path d="m21.5 6.5-9 4-9-4"/><path d="m21.5 6.5v11l-9 4-9-4v-11"/><path d="m12.5 10.5-9-4-9 4"/></svg>`,
    'map-pin': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    'file-check': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></svg>`,
    'target': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    'folder-open': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 18 6-6-6-6v12Z"/><path d="m18 6-6 6 6 6V6Z"/></svg>`,
    'zap': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    'database': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>`
  };
  
  const svg = fallbackIcons[iconName] || fallbackIcons['file'];
  return `<span class="${className}" style="display: inline-block; width: ${size}px; height: ${size}px; line-height: 1; vertical-align: middle;">${svg}</span>`;
}

/**
 * Initialize icons by replacing data-lucide attributes with inline SVG
 * Uses GitHub Lucide icons with fallback
 */
async function initializeIcons(container) {
  const iconElements = container.querySelectorAll('[data-lucide]');
  const iconPromises = Array.from(iconElements).map(async (el) => {
    const iconName = el.getAttribute('data-lucide');
    const className = el.className;
    const computedStyle = window.getComputedStyle(el);
    const size = parseInt(el.style.width) || parseInt(computedStyle.width) || 
                 parseInt(el.getAttribute('data-size')) || 20;
    
    // Use sync version for immediate rendering, then upgrade to GitHub version
    const fallbackIcon = createIconSync(iconName, className, size);
    const parent = el.parentNode;
    el.outerHTML = fallbackIcon;
    
    // Try to fetch from GitHub and upgrade
    try {
      const githubIcon = await createIcon(iconName, className, size);
      // Find the element by class in the same parent context
      const newElement = parent ? parent.querySelector(`.${className.split(' ')[0]}`) : container.querySelector(`.${className.split(' ')[0]}`);
      if (newElement && newElement.parentNode) {
        newElement.outerHTML = githubIcon;
      }
    } catch (error) {
      // Keep fallback if GitHub fetch fails
      console.warn(`[Legal Vision] Could not upgrade icon ${iconName} from GitHub:`, error);
    }
  });
  
  await Promise.all(iconPromises);
}

/**
 * Load Lucide icons library dynamically (DEPRECATED - kept for compatibility)
 */
function loadLucideIcons() {
  return new Promise((resolve) => {
    // Check if already loaded
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="lucide"]');
    if (existingScript) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
          resolve();
        } else {
          console.warn('[Legal Vision] Lucide icons failed to load');
          resolve(); // Resolve anyway to not block UI
        }
      }, 5000);
      return;
    }

    // Load Lucide from CDN
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lucide@latest';
    script.onload = () => {
      // Wait a bit for lucide to be fully initialized
      setTimeout(() => {
        const lucideExists = typeof lucide !== 'undefined';
        const createIconsExists = lucideExists && typeof lucide.createIcons === 'function';
        if (lucideExists && createIconsExists) {
          resolve();
        } else {
          console.warn('[Legal Vision] Lucide loaded but createIcons not available');
          resolve();
        }
      }, 100);
    };
    script.onerror = () => {
      console.warn('[Legal Vision] Failed to load Lucide icons');
      resolve(); // Resolve anyway to not block UI
    };
    document.head.appendChild(script);
  });
}

// Preload all icons on script load
preloadAllIcons().catch(err => {
  console.warn('[Legal Vision] Failed to preload some icons:', err);
});

// Guard: Run only once per page (but allow retry for dynamic content)
if (window.legalVisionProcessed) {
  console.log('[Legal Vision] Already processed this page');
  // For dynamic pages, allow a retry after a delay
  if (window.legalVisionRetryCount === undefined) {
    window.legalVisionRetryCount = 0;
  }
  if (window.legalVisionRetryCount < 2) {
    window.legalVisionRetryCount++;
    setTimeout(() => {
      console.log('[Legal Vision] Retry attempt', window.legalVisionRetryCount, 'for dynamic content');
      initConsentDetection();
    }, 3000);
  }
} else {
  window.legalVisionProcessed = true;
  window.legalVisionRetryCount = 0;
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConsentDetection);
  } else {
    initConsentDetection();
  }
  
  // Also retry after a delay for dynamically loaded content
  setTimeout(() => {
    if (!window.legalVisionLastResult || !window.legalVisionLastResult.success) {
      console.log('[Legal Vision] Retrying for dynamically loaded content');
      initConsentDetection();
    }
  }, 5000);
}

/**
 * Main initialization function
 */
async function initConsentDetection() {
  try {
    // Check for legal links (Terms/Privacy) - required for consent detection
    const hasLegalLinks = detectLegalLinks();
    
    if (!hasLegalLinks) {
      console.log('[Legal Vision] No legal links detected, skipping consent detection');
      return;
    }
    
    // Extract page context: buttons and nearby text
    const pageContext = extractPageContext();
    
    // Detect if this is a consent moment
    let isConsentMoment = false;
    try {
      const aiResponse = await queryGemmaModel(pageContext);
      const consentData = parseAIResponse(aiResponse);
      isConsentMoment = consentData && consentData.confidence > 0.7 && consentData.is_consent_moment;
    } catch (error) {
      // Fallback: Use heuristic detection
      isConsentMoment = detectConsentMomentHeuristic();
    }
    
    if (isConsentMoment) {
      console.log('[Legal Vision] Consent moment detected, analyzing terms and conditions');
      // Start processing terms and conditions proactively
      await processTermsAndConditions();
    }
    
  } catch (error) {
    console.error('[Legal Vision] Error in consent detection:', error);
  }
}

/**
 * Extract visible buttons and their context from the page
 * Returns structured data for AI analysis
 */
function extractPageContext() {
  const buttons = [];
  const allButtons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"], [onclick]');
  
  allButtons.forEach((btn, index) => {
    // Skip hidden or very small buttons
    const rect = btn.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || 
        window.getComputedStyle(btn).display === 'none' ||
        window.getComputedStyle(btn).visibility === 'hidden') {
      return;
    }
    
    // Extract button text
    const text = getButtonText(btn);
    
    // Extract nearby context (parent container, siblings, labels)
    const context = extractButtonContext(btn);
    
    // Generate CSS selector (fallback to index-based)
    const selector = generateSelector(btn, index);
    
    buttons.push({
      selector: selector,
      text: text,
      context: context,
      tagName: btn.tagName.toLowerCase(),
      classes: Array.from(btn.classList).join(' '),
      id: btn.id || null
    });
  });
  
  // Extract page-level context
  const pageText = document.body.innerText.substring(0, 2000); // Limit for AI context
  const title = document.title;
  const url = window.location.href;
  
  return {
    buttons: buttons,
    pageText: pageText,
    title: title,
    url: url
  };
}

/**
 * Get button text content, handling various button types
 */
function getButtonText(button) {
  // Try direct text content
  let text = button.textContent || button.innerText || '';
  
  // For input buttons, check value
  if (button.tagName === 'INPUT' && button.value) {
    text = button.value;
  }
  
  // Check aria-label
  if (!text && button.getAttribute('aria-label')) {
    text = button.getAttribute('aria-label');
  }
  
  // Check title attribute
  if (!text && button.title) {
    text = button.title;
  }
  
  return text.trim().substring(0, 200); // Limit length
}

/**
 * Extract context around a button (parent, siblings, labels)
 */
function extractButtonContext(button) {
  const context = [];
  
  // Get parent container text (limited)
  const parent = button.parentElement;
  if (parent) {
    const parentText = parent.innerText.substring(0, 300);
    context.push(`Parent: ${parentText}`);
  }
  
  // Get associated label
  if (button.id) {
    const label = document.querySelector(`label[for="${button.id}"]`);
    if (label) {
      context.push(`Label: ${label.textContent}`);
    }
  }
  
  // Get previous sibling text
  const prevSibling = button.previousElementSibling;
  if (prevSibling && prevSibling.textContent) {
    context.push(`Before: ${prevSibling.textContent.substring(0, 100)}`);
  }
  
  // Get next sibling text
  const nextSibling = button.nextElementSibling;
  if (nextSibling && nextSibling.textContent) {
    context.push(`After: ${nextSibling.textContent.substring(0, 100)}`);
  }
  
  return context.join(' | ');
}

/**
 * Generate a reliable CSS selector for a button
 */
function generateSelector(button, fallbackIndex) {
  // Prefer ID
  if (button.id) {
    return `#${button.id}`;
  }
  
  // Try class-based selector
  if (button.classList.length > 0) {
    const classes = Array.from(button.classList)
      .filter(c => !c.includes(' ') && c.length < 50)
      .slice(0, 2)
      .join('.');
    if (classes) {
      return `${button.tagName.toLowerCase()}.${classes}`;
    }
  }
  
  // Try data attributes
  for (const attr of button.attributes) {
    if (attr.name.startsWith('data-') && attr.value) {
      return `${button.tagName.toLowerCase()}[${attr.name}="${attr.value}"]`;
    }
  }
  
  // Fallback: tag + index
  return `${button.tagName.toLowerCase()}:nth-of-type(${fallbackIndex + 1})`;
}

/**
 * Detect presence of legal links (Terms, Privacy Policy, etc.)
 */
function detectLegalLinks() {
  const legalKeywords = [
    'terms', 'privacy', 'policy', 'agreement', 'conditions',
    'legal', 'terms of service', 'privacy policy', 'user agreement',
    'nondiscrimination', 'payments terms', 'cookie'
  ];
  
  const allLinks = document.querySelectorAll('a[href]');
  const linkTexts = Array.from(allLinks).map(link => 
    (link.textContent || link.innerText || link.getAttribute('aria-label') || '').toLowerCase().trim()
  );
  
  const linkHrefs = Array.from(allLinks).map(link => 
    (link.href || '').toLowerCase()
  );
  
  // Also check page text for legal mentions
  const pageText = (document.body.innerText || '').toLowerCase();
  
  // Check if any link text or href contains legal keywords
  for (const keyword of legalKeywords) {
    if (linkTexts.some(text => text.includes(keyword)) ||
        linkHrefs.some(href => href.includes(keyword)) ||
        pageText.includes(keyword)) {
      console.log('[Legal Vision] Legal links detected via keyword:', keyword);
      return true;
    }
  }
  
  // Check for common legal link patterns in text
  const legalPatterns = [
    /terms\s+of\s+service/i,
    /privacy\s+policy/i,
    /user\s+agreement/i,
    /terms\s+and\s+conditions/i
  ];
  
  for (const pattern of legalPatterns) {
    if (pattern.test(pageText)) {
      console.log('[Legal Vision] Legal links detected via pattern:', pattern);
      return true;
    }
  }
  
  console.log('[Legal Vision] No legal links detected');
  return false;
}

/**
 * Query the on-device Gemma/Gemini Nano model using Chrome's Prompt API
 * AI Guardrail: Validates response structure and confidence scores
 */
async function queryGemmaModel(pageContext) {
  // Check if Chrome's Prompt API is available (Chrome 140+)
  if (!('ai' in window) || !window.ai?.prompt) {
    console.warn('[Legal Vision] Prompt API not available, using fallback');
    throw new Error('Prompt API not available');
  }
  
  // Construct prompt for AI analysis
  const prompt = `Analyze this web page to detect if it represents a legal consent moment (account creation, checkout, agreement acceptance).

Page Title: ${pageContext.title}
Page URL: ${pageContext.url}

Buttons found on page:
${pageContext.buttons.map((btn, i) => 
  `${i + 1}. Selector: ${btn.selector}\n   Text: "${btn.text}"\n   Context: ${btn.context}`
).join('\n\n')}

Page context (first 500 chars): ${pageContext.pageText.substring(0, 500)}

Respond with ONLY valid JSON in this exact format:
{
  "is_consent_moment": boolean,
  "cta_selector": "string (CSS selector of the primary consent button, or empty string if none)",
  "cta_text": "string (current text of the consent button)",
  "reasoning": "string (brief explanation)",
  "confidence": number (0.0 to 1.0)
}

Rules:
- is_consent_moment: true only if this page clearly requires legal consent (signing up, checking out, accepting terms)
- cta_selector: The CSS selector for the button that represents the consent action
- confidence: Must be between 0.0 and 1.0. Only return >0.7 if you're very certain
- If no clear consent moment, set is_consent_moment to false and confidence to 0.5 or lower`;

  try {
    // Call Chrome's Prompt API (Gemini Nano on-device)
    const response = await window.ai.prompt(prompt, {
      temperature: 0.3, // Lower temperature for more deterministic, structured output
      topK: 40,
      topP: 0.95
    });
    
    return response;
  } catch (error) {
    console.error('[Legal Vision] Error calling AI model:', error);
    throw error;
  }
}

/**
 * Parse and validate AI response
 * AI Guardrail: Ensures response matches expected structure and values
 */
function parseAIResponse(aiResponse) {
  if (!aiResponse || typeof aiResponse !== 'string') {
    throw new Error('Invalid AI response format');
  }
  
  // Extract JSON from response (AI might add extra text)
  let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }
  
  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('[Legal Vision] Failed to parse AI JSON:', e);
    throw new Error('Invalid JSON in AI response');
  }
  
  // Validate structure
  const requiredFields = ['is_consent_moment', 'cta_selector', 'cta_text', 'reasoning', 'confidence'];
  for (const field of requiredFields) {
    if (!(field in parsed)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate types and ranges
  if (typeof parsed.is_consent_moment !== 'boolean') {
    throw new Error('is_consent_moment must be boolean');
  }
  
  if (typeof parsed.confidence !== 'number' || 
      parsed.confidence < 0 || parsed.confidence > 1) {
    throw new Error('confidence must be a number between 0 and 1');
  }
  
  if (typeof parsed.cta_selector !== 'string') {
    throw new Error('cta_selector must be a string');
  }
  
  // AI Guardrail: Normalize confidence if out of bounds
  parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));
  
  console.log('[Legal Vision] AI Response:', parsed);
  return parsed;
}

// CTA modification functions removed - extension never modifies button text per requirements

/**
 * Detect consent moment using heuristics (simple check)
 * Returns true if consent moment detected, false otherwise
 * Does NOT modify any buttons - only detects
 */
function detectConsentMomentHeuristic() {
  const consentKeywords = [
    'sign up', 'create account', 'register', 'agree', 'accept',
    'continue', 'checkout', 'place order', 'submit', 'confirm',
    'i agree', 'i accept', 'terms and conditions', 'agree and continue'
  ];
  
  const allButtons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
  for (const btn of allButtons) {
    const text = getButtonText(btn).toLowerCase();
    if (consentKeywords.some(keyword => text.includes(keyword))) {
      return true;
    }
  }
  return false;
}

// API calls moved to background service worker - use message passing instead

/**
 * Fetch and analyze terms and conditions
 * Uses background service worker for API calls
 */
async function processTermsAndConditions() {
  // Check if already processing - if so, wait for it to complete
  if (processingState.isProcessing && !processingState.hasFailed) {
    console.log('[Legal Vision] Analysis already in progress, waiting...');
    // Wait for current request to complete
    try {
      await processingState.currentRequest;
    } catch (e) {
      // Request failed, allow retry
    }
    return;
  }

  // Reset failed state for new attempt
  processingState.hasFailed = false;
  processingState.isProcessing = true;

  try {
    // Find terms and privacy policy links
    const legalLinks = findLegalDocumentLinks();
    
    if (legalLinks.length === 0) {
      console.log('[Legal Vision] No legal document links found');
      processingState.isProcessing = false;
      processingState.hasFailed = true;
      showTermsNotification({ status: 'error', message: 'No legal documents found' }, null);
      return;
    }
    
    console.log('[Legal Vision] Found', legalLinks.length, 'legal document links');
    
    // Show notification immediately (processing state)
    showTermsNotification({ status: 'processing', message: 'Analyzing terms and conditions...' }, null);
    
    // Create promise for tracking
    const analysisPromise = (async () => {
      try {
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          throw new Error('Chrome runtime not available');
        }

        console.log('[Legal Vision] Sending analysis request to background worker');
        
        const response = await chrome.runtime.sendMessage({
          action: 'analyzeLegalDocuments',
          legalDocumentUrls: legalLinks
        });

        if (!response) {
          throw new Error('No response from background worker');
        }

        if (response.success && response.analysis) {
          console.log('[Legal Vision] Analysis completed successfully');
          processingState.isProcessing = false;
          processingState.hasFailed = false;
          showTermsNotification({ status: 'completed' }, response.analysis);
          return response.analysis;
        } else {
          throw new Error(response.error || 'Analysis failed');
        }
      } catch (error) {
        console.error('[Legal Vision] Error analyzing documents:', error);
        processingState.isProcessing = false;
        processingState.hasFailed = true;
        
        // Determine user-friendly error message
        let errorMessage = 'Analysis unavailable. You can still review the terms manually.';
        
        if (error.message.includes('timeout')) {
          errorMessage = 'Analysis is taking longer than expected. You can proceed or try again.';
        } else if (error.message.includes('connect') || error.message.includes('Network')) {
          errorMessage = 'Unable to connect to analysis service. You can still review the terms manually.';
        } else if (error.message.includes('Failed to analyze') || error.message.includes('Analysis failed')) {
          errorMessage = 'We couldn\'t analyze these terms automatically. Please review them manually.';
        } else if (error.message.includes('Chrome runtime')) {
          errorMessage = 'Extension service unavailable. Please refresh the page.';
        }
        
        showTermsNotification({ 
          status: 'error', 
          message: errorMessage
        }, null);
        throw error;
      }
    })();

    processingState.currentRequest = analysisPromise;
    await analysisPromise;
    
  } catch (error) {
    console.error('[Legal Vision] Error processing terms:', error);
    processingState.isProcessing = false;
    processingState.hasFailed = true;
    showTermsNotification({ 
      status: 'error', 
      message: 'Unable to analyze terms' 
    }, null);
  }
}

/**
 * Find links to legal documents (Terms, Privacy Policy, etc.)
 */
function findLegalDocumentLinks() {
  const links = [];
  const allLinks = document.querySelectorAll('a[href]');
  
  const legalKeywords = [
    'terms', 'privacy', 'policy', 'agreement', 'conditions',
    'legal', 'terms of service', 'privacy policy', 'user agreement'
  ];
  
  allLinks.forEach(link => {
    const text = (link.textContent || link.innerText || '').toLowerCase().trim();
    const href = link.href || '';
    
    for (const keyword of legalKeywords) {
      if (text.includes(keyword) || href.toLowerCase().includes(keyword)) {
        links.push({
          text: text,
          url: href,
          element: link
        });
        break; // Avoid duplicates
      }
    }
  });
  
  return links;
}

// analyzeLegalDocuments removed - now handled by fetchAnalysisFromServer() and pollJobStatus()

/**
 * Show notification popup in bottom left corner
 * @param {Object} analysisState - { status: 'processing'|'completed'|'error', message?: string }
 * @param {Object|null} analysisData - LegalAnalysis object from server, or null
 */
function showTermsNotification(analysisState, analysisData) {
  // Remove existing notification if present
  const existing = document.getElementById('legal-vision-notification');
  if (existing) {
    existing.remove();
  }
  
  const notification = document.createElement('div');
  notification.id = 'legal-vision-notification';
  
  // Determine message, icon, and CTA based on state and analysis data
  let message = '';
  let ctaText = 'Review Terms';
  let ctaDisabled = false;
  let iconName = 'scale'; // Default icon
  let isProcessing = false;
  
  if (analysisState.status === 'processing') {
    message = analysisState.message || 'Analyzing terms and conditions...';
    ctaText = 'Processing...';
    ctaDisabled = true;
    iconName = 'refresh-cw';
    isProcessing = true;
    notification.setAttribute('data-processing', 'true');
  } else if (analysisState.status === 'error') {
    message = analysisState.message || 'Analysis unavailable';
    ctaText = 'Review Terms';
    ctaDisabled = false;
    iconName = 'alert-circle';
  } else if (analysisState.status === 'completed' && analysisData) {
    // Extract data from analysis
    const riskCount = analysisData?.riskSummary?.totalRisks ?? 0;
    const consentSummary = analysisData?.consentMoment?.quickSummary;
    
    if (riskCount > 0) {
      message = `Hey, ${riskCount} clause${riskCount > 1 ? 's' : ''} found. See what you're agreeing to.`;
      ctaText = 'Review Terms';
      iconName = 'file-text';
    } else {
      message = consentSummary || 'Terms and conditions analyzed';
      ctaText = 'Review Terms';
      iconName = 'check-circle-2';
    }
    ctaDisabled = false;
  } else {
    // Fallback
    message = 'Terms and conditions detected';
    ctaText = 'Review Terms';
    ctaDisabled = false;
    iconName = 'file-text';
  }
  
  notification.innerHTML = `
    <div class="lv-notification-header">
      <span class="lv-notification-brand">Legal Vision</span>
      <button class="lv-notification-close" id="lv-notification-close" aria-label="Close">
        <i data-lucide="x" class="lv-close-icon"></i>
      </button>
    </div>
    <div class="lv-notification-body">
      <div class="lv-notification-icon">
        <i data-lucide="${iconName}" class="lv-icon"></i>
      </div>
      <div class="lv-notification-text">
        <p class="lv-notification-message">${message}</p>
      </div>
    </div>
    <div class="lv-notification-footer">
      <button class="lv-notification-cta" id="lv-notification-btn" ${ctaDisabled ? 'disabled' : ''}>${ctaText}</button>
    </div>
  `;
  
  // Add styles - Brutalist Design System
  const style = document.createElement('style');
  style.id = 'legal-vision-notification-style';
  style.textContent = `
    /* General Lucide icon styling */
    [data-lucide] {
      color: #000000;
      display: inline-block;
    }
    
    [data-lucide] svg {
      stroke: currentColor;
      fill: none;
      display: block;
      width: 100%;
      height: 100%;
    }
    
    #legal-vision-notification {
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #F0F5FF;
      border: 4px solid #000000;
      border-radius: 0;
      padding: 0;
      box-shadow: 8px 8px 0px 0px #000000;
      z-index: 1000000;
      width: 360px;
      min-width: 360px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: #000000;
      animation: slideInLeft 0.3s ease-out;
      overflow: hidden;
    }
    
    @keyframes slideInLeft {
      from {
        transform: translateX(-100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .lv-notification-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 2px solid #000000;
      background: #FFFFFF;
    }

    .lv-notification-brand {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000000;
    }

    .lv-notification-close {
      background: transparent;
      border: 2px solid #000000;
      color: #000000;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
      border-radius: 0;
    }
    
    .lv-notification-close:hover {
      transform: translate(-2px, -2px);
      box-shadow: 2px 2px 0px 0px #000000;
      background: #FFF8E7;
    }
    
    .lv-notification-close:active {
      transform: translate(0, 0);
      box-shadow: none;
    }

    .lv-close-icon {
      width: 14px;
      height: 14px;
      color: #000000;
      display: inline-block;
    }

    .lv-close-icon svg {
      stroke: currentColor;
      fill: none;
      width: 14px;
      height: 14px;
      display: block;
    }

    .lv-notification-body {
      display: flex;
      gap: 14px;
      padding: 20px 16px;
      align-items: flex-start;
    }
    
    .lv-notification-icon {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #000000;
      background: #FFFFFF;
    }
    
    .lv-notification-icon .lv-icon {
      width: 22px;
      height: 22px;
      color: #000000;
      display: inline-block;
    }

    .lv-notification-icon .lv-icon svg {
      stroke: currentColor;
      fill: none;
      width: 22px;
      height: 22px;
      display: block;
    }

    /* Animate loader icon when processing */
    #legal-vision-notification[data-processing="true"] .lv-notification-icon svg {
      animation: spin 1s linear infinite !important;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .lv-notification-text {
      flex: 1;
      min-width: 0;
    }
    
    .lv-notification-message {
      margin: 0;
      font-size: 16px;
      line-height: 1.5;
      font-weight: 500;
      color: #000000;
    }

    .lv-notification-footer {
      padding: 12px 16px 16px;
      border-top: 2px solid #000000;
      background: #FFFFFF;
    }
    
    .lv-notification-cta {
      width: 100%;
      background: #88aaee;
      border: 2px solid #000000;
      color: #000000;
      padding: 12px 20px;
      border-radius: 0;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 4px 4px 0px 0px #000000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .lv-notification-cta:hover {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0px 0px #000000;
    }
    
    .lv-notification-cta:active {
      transform: translate(0, 0);
      box-shadow: 4px 4px 0px 0px #000000;
    }
    
    .lv-notification-cta:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: 4px 4px 0px 0px #000000;
    }
  `;
  
  // Add styles if not already present
  if (!document.getElementById('legal-vision-notification-style')) {
    document.head.appendChild(style);
  }
  
  // Add to DOM first
  document.body.appendChild(notification);
  
  // Initialize icons using Lucide icons from GitHub
  initializeIcons(notification).then(() => {
    const iconElementsAfter = notification.querySelectorAll('svg');
    console.log('[Legal Vision] Notification icons initialized from GitHub');
  });
  
  // Add event listeners
  const closeBtn = notification.querySelector('#lv-notification-close');
  closeBtn.addEventListener('click', () => {
    hideTermsNotification();
  });
  
  const ctaBtn = notification.querySelector('#lv-notification-btn');
  if (!ctaDisabled) {
    ctaBtn.addEventListener('click', () => {
      // Open a detailed view or scroll to terms
      showTermsDetails(analysisData);
    });
  } else {
    ctaBtn.style.opacity = '0.6';
    ctaBtn.style.cursor = 'not-allowed';
  }

  
  // Auto-hide after 10 seconds (optional)
  // setTimeout(() => {
  //   hideTermsNotification();
  // }, 10000);
  
  console.log('[Legal Vision] Notification shown:', { 
    status: analysisState.status, 
    hasAnalysis: !!analysisData,
    riskCount: analysisData?.riskSummary?.totalRisks ?? 0
  });
}

/**
 * Hide notification popup
 */
function hideTermsNotification() {
  const notification = document.getElementById('legal-vision-notification');
  if (notification) {
    notification.style.animation = 'slideOutLeft 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
    }, 300);
    
    // Add slideOut animation if not present
    if (!document.getElementById('legal-vision-slideout-style')) {
      const style = document.createElement('style');
      style.id = 'legal-vision-slideout-style';
      style.textContent = `
        @keyframes slideOutLeft {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(-100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

/**
 * Show analysis side sheet (slides from right, overlaps window)
 * @param {Object} analysisData - LegalAnalysis object from server
 */
function showAnalysisSideSheet(analysisData) {
  // Remove existing sheet if present
  const existing = document.getElementById('legal-vision-side-sheet');
  if (existing) {
    existing.remove();
  }

  const sheet = document.createElement('div');
  sheet.id = 'legal-vision-side-sheet';

  // Extract data with fallbacks
  const consentMoment = analysisData?.consentMoment || {};
  const riskSummary = analysisData?.riskSummary || { totalRisks: 0, highSeverityCount: 0, overallAssessment: 'low_concern' };
  const risks = analysisData?.risks || [];
  const consentScope = analysisData?.consentScope || { summary: 'Unable to analyze consent scope' };
  const documents = analysisData?.documents || [];

  // Build risk list HTML with icons from AI or fallback to cube - side-by-side expandable cards
  let risksHTML = '';
  if (risks.length > 0) {
    risksHTML = risks.map((risk, index) => {
      const severityColor = risk.severity === 'high' ? '#ff6b6b' : risk.severity === 'medium' ? '#ffa500' : '#4CAF50';
      // Use icon from AI if provided, otherwise fallback to cube
      const riskIcon = (risk.icon && typeof risk.icon === 'string') ? risk.icon : 'cube';
      const riskId = `risk-${index}`;
      return `
        <div class="lv-risk-card" data-risk-id="${riskId}" style="border-top: 3px solid ${severityColor}">
          <div class="lv-risk-card-header" data-toggle-risk="${riskId}">
            <div class="lv-risk-card-icon-wrapper">
              <i data-lucide="${riskIcon}" class="lv-risk-card-icon" style="color: ${severityColor}"></i>
            </div>
            <div class="lv-risk-card-title-wrapper">
              <div class="lv-risk-card-title">${risk.title}</div>
              <div class="lv-risk-card-badge">${risk.severity}</div>
            </div>
            <i data-lucide="chevron-down" class="lv-risk-chevron"></i>
          </div>
          <div class="lv-risk-card-details">
            <div class="lv-risk-card-description">${risk.description}</div>
            <div class="lv-risk-card-meta">
              <span class="lv-risk-card-category">${risk.category.replace(/_/g, ' ')}</span>
              ${risk.location ? `<span class="lv-risk-card-location"><i data-lucide="map-pin" class="lv-inline-icon"></i> ${risk.location}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } else {
    risksHTML = '<div class="lv-no-risks"><i data-lucide="check-circle-2" class="lv-success-icon"></i> No clauses identified</div>';
  }

  // Build documents list HTML with icons
  let documentsHTML = '';
  if (documents.length > 0) {
    documentsHTML = documents.map(doc => {
      const docIconMap = {
        'terms_of_service': 'file-text',
        'privacy_policy': 'shield',
        'user_agreement': 'file-contract',
        'cookie_policy': 'cookie',
        'other': 'file'
      };
      const docIcon = docIconMap[doc.type] || 'file';
      return `
        <div class="lv-document-item" data-document-url="${doc.url}" data-document-type="${doc.type}">
          <div class="lv-document-header">
            <i data-lucide="${docIcon}" class="lv-document-icon"></i>
            <div>
              <div class="lv-document-type">${doc.type.replace(/_/g, ' ')}</div>
              <a href="${doc.url}" target="_blank" class="lv-document-link" data-view-document="${doc.url}">${doc.title || doc.url}</a>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } else {
    documentsHTML = '<div class="lv-no-documents"><i data-lucide="file-x" class="lv-icon"></i> No documents detected</div>';
  }

  // Get quick summary for each section
  const agreementSummary = consentMoment.quickSummary || consentMoment.actionDescription || 'Legal agreement';
  const clausesSummary = riskSummary.totalRisks > 0 
    ? `${riskSummary.totalRisks} clause${riskSummary.totalRisks > 1 ? 's' : ''} found`
    : 'No clauses identified';
  const scopeSummary = consentScope.summary || 'Review consent scope details';
  const documentsSummary = documents.length > 0 
    ? `${documents.length} document${documents.length > 1 ? 's' : ''} referenced`
    : 'No documents found';

  sheet.innerHTML = `
    <div class="lv-sheet-overlay"></div>
    <div class="lv-sheet-content">
      <div class="lv-sheet-header">
        <div class="lv-sheet-title-row">
          <div class="lv-sheet-icon">
            <i data-lucide="scale" class="lv-header-icon"></i>
          </div>
          <div class="lv-sheet-title-text">
            <h2 class="lv-sheet-title">Legal Analysis</h2>
            <p class="lv-sheet-subtitle">See what you're agreeing to</p>
          </div>
        </div>
        <button class="lv-sheet-close" id="lv-sheet-close" aria-label="Close">
          <i data-lucide="x" class="lv-close-icon"></i>
        </button>
      </div>
      <div class="lv-sheet-body">
        <div class="lv-section lv-collapsible" data-section="agreement">
          <div class="lv-section-header" data-toggle="agreement">
            <div class="lv-section-title-wrapper">
              <i data-lucide="file-check" class="lv-section-icon"></i>
              <div class="lv-section-title-text">
                <div class="lv-section-title">What you're agreeing to</div>
                <div class="lv-section-preview">${agreementSummary}</div>
              </div>
            </div>
            <i data-lucide="chevron-down" class="lv-chevron-icon"></i>
          </div>
          <div class="lv-section-details">
            <div class="lv-section-content">${consentMoment.actionDescription || 'Legal agreement'}</div>
            ${consentMoment.quickSummary ? `<div class="lv-section-summary">${consentMoment.quickSummary}</div>` : ''}
          </div>
        </div>

        ${riskSummary.totalRisks > 0 ? `
        <div class="lv-section lv-risks-section">
          <div class="lv-section-header-static">
            <div class="lv-section-title-wrapper">
              <i data-lucide="file-text" class="lv-section-icon"></i>
              <div class="lv-section-title-text">
                <div class="lv-section-title">
                  Clauses found
                  <span class="lv-clause-count">${riskSummary.totalRisks}</span>
                </div>
                <div class="lv-section-preview">${clausesSummary}</div>
              </div>
            </div>
          </div>
          <div class="lv-risks-list">
            ${risksHTML}
          </div>
        </div>
        ` : ''}

        <div class="lv-section lv-collapsible" data-section="scope">
          <div class="lv-section-header" data-toggle="scope">
            <div class="lv-section-title-wrapper">
              <i data-lucide="target" class="lv-section-icon"></i>
              <div class="lv-section-title-text">
                <div class="lv-section-title">Consent Scope</div>
                <div class="lv-section-preview">${scopeSummary}</div>
              </div>
            </div>
            <i data-lucide="chevron-down" class="lv-chevron-icon"></i>
          </div>
          <div class="lv-section-details">
            <div class="lv-section-content">${consentScope.summary}</div>
            ${consentScope.primaryActions?.length > 0 ? `
              <div class="lv-scope-list">
                <i data-lucide="zap" class="lv-inline-icon"></i>
                <strong>Actions:</strong> ${consentScope.primaryActions.join(', ')}
              </div>
            ` : ''}
            ${consentScope.dataCollected?.length > 0 ? `
              <div class="lv-scope-list">
                <i data-lucide="database" class="lv-inline-icon"></i>
                <strong>Data collected:</strong> ${consentScope.dataCollected.join(', ')}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="lv-section lv-collapsible" data-section="documents">
          <div class="lv-section-header" data-toggle="documents">
            <div class="lv-section-title-wrapper">
              <i data-lucide="folder-open" class="lv-section-icon"></i>
              <div class="lv-section-title-text">
                <div class="lv-section-title">Documents</div>
                <div class="lv-section-preview">${documentsSummary}</div>
              </div>
            </div>
            <i data-lucide="chevron-down" class="lv-chevron-icon"></i>
          </div>
          <div class="lv-section-details">
            <div class="lv-documents-list">
              ${documentsHTML}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add styles - Brutalist Design System
  const style = document.createElement('style');
  style.id = 'legal-vision-side-sheet-style';
  style.textContent = `
    /* General Lucide icon styling */
    #legal-vision-side-sheet [data-lucide] {
      color: #000000;
      display: inline-block;
    }
    
    #legal-vision-side-sheet [data-lucide] svg {
      stroke: currentColor;
      fill: none;
      display: block;
      width: 100%;
      height: 100%;
    }
    
    #legal-vision-side-sheet {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000001;
      pointer-events: none;
    }

    .lv-sheet-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      animation: fadeIn 0.3s ease-out forwards;
      pointer-events: all;
    }

    .lv-sheet-content {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 480px;
      min-width: 480px;
      background: #F0F5FF;
      border-left: 4px solid #000000;
      box-shadow: -8px 0px 0px 0px #000000;
      transform: translateX(100%);
      animation: slideInRight 0.3s ease-out forwards;
      pointer-events: all;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: #000000;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .lv-sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px 24px;
      border-bottom: 4px solid #000000;
      background: #FFFFFF;
    }

    .lv-sheet-title-row {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .lv-sheet-icon {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #000000;
      background: #F0F5FF;
    }

    .lv-header-icon {
      width: 26px;
      height: 26px;
      color: #000000;
      display: inline-block;
    }

    .lv-header-icon svg {
      stroke: currentColor;
      fill: none;
      width: 26px;
      height: 26px;
      display: block;
      stroke-width: 2;
    }

    .lv-sheet-title-text {
      flex: 1;
      min-width: 0;
    }

    .lv-sheet-title {
      font-size: 24px;
      font-weight: 900;
      color: #000000;
      margin: 0 0 4px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }

    .lv-sheet-subtitle {
      font-size: 14px;
      font-weight: 500;
      color: #000000;
      margin: 0;
      opacity: 0.85;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.4;
    }

    .lv-sheet-close {
      background: transparent;
      border: 2px solid #000000;
      color: #000000;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      border-radius: 0;
    }

    .lv-sheet-close .lv-close-icon {
      width: 20px;
      height: 20px;
      display: inline-block;
      color: #000000;
    }

    .lv-sheet-close .lv-close-icon svg {
      stroke: currentColor;
      fill: none;
      width: 20px;
      height: 20px;
      display: block;
    }

    .lv-sheet-close:hover {
      transform: translate(-2px, -2px);
      box-shadow: 2px 2px 0px 0px #000000;
      background: #FFF8E7;
    }

    .lv-sheet-close:active {
      transform: translate(0, 0);
      box-shadow: none;
    }

    .lv-sheet-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      background: #F0F5FF;
    }

    .lv-section {
      background: #FFFFFF;
      border: 3px solid #000000;
      border-radius: 0;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 4px 4px 0px 0px #000000;
      transition: all 0.2s;
    }

    .lv-section:last-child {
      margin-bottom: 0;
    }

    .lv-section:hover {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0px 0px #000000;
    }

    .lv-section.lv-expanded {
      background: #FFFFFF;
      border-color: #000000;
    }

    .lv-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      padding: 8px 0;
      user-select: none;
      transition: opacity 0.2s ease;
    }

    .lv-section-header:hover {
      opacity: 0.9;
    }

    .lv-section-title-wrapper {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      flex: 1;
    }

    .lv-section-title-text {
      flex: 1;
      min-width: 0;
    }

    .lv-section-title {
      font-size: 14px;
      font-weight: 900;
      color: #000000;
      display: flex;
      align-items: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      margin-bottom: 6px;
    }

    .lv-section-preview {
      font-size: 15px;
      color: #000000;
      line-height: 1.5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      margin-top: 0;
      font-weight: 500;
    }

    .lv-chevron-icon {
      width: 18px;
      height: 18px;
      color: #000000;
      flex-shrink: 0;
      transition: transform 0.3s ease;
      display: inline-block;
    }

    .lv-chevron-icon svg {
      stroke: currentColor;
      fill: none;
      width: 18px;
      height: 18px;
      display: block;
    }

    .lv-section.lv-expanded .lv-chevron-icon {
      transform: rotate(180deg);
    }

    .lv-section-details {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease, padding 0.3s ease, margin 0.3s ease;
      padding: 0;
      margin: 0;
    }

    .lv-section.lv-expanded .lv-section-details {
      max-height: 2000px;
      padding-top: 16px;
      margin-top: 12px;
      border-top: 2px solid #000000;
    }

    .lv-section-icon {
      width: 22px;
      height: 22px;
      color: #000000;
      flex-shrink: 0;
      display: inline-block;
      margin-top: 2px;
    }

    .lv-section-icon svg {
      stroke: currentColor;
      fill: none;
      width: 22px;
      height: 22px;
      display: block;
      stroke-width: 2;
    }

    .lv-section-content {
      font-size: 15px;
      color: #000000;
      line-height: 1.6;
      margin-bottom: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-weight: 500;
    }

    .lv-section-summary {
      font-size: 15px;
      color: #000000;
      line-height: 1.6;
      margin-top: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-weight: 500;
    }

    .lv-clause-count {
      background: #000000;
      color: #FFFFFF;
      padding: 4px 10px;
      border-radius: 0;
      font-size: 12px;
      font-weight: 900;
      margin-left: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .lv-risks-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 0;
    }

    .lv-risks-section {
      background: #FFFFFF;
    }

    .lv-risk-card {
      background: #FFFFFF;
      border-radius: 0;
      border: 2px solid #000000;
      transition: all 0.2s;
      cursor: pointer;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 2px 2px 0px 0px #000000;
    }

    .lv-risk-card:hover {
      transform: translate(-2px, -2px);
      box-shadow: 4px 4px 0px 0px #000000;
    }

    .lv-risk-card.lv-expanded {
      background: #FFFFFF;
      border-color: #000000;
      grid-column: 1 / -1;
    }

    .lv-risk-card-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px;
      user-select: none;
    }

    .lv-risk-card-icon-wrapper {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #FFFFFF;
      border: 2px solid #000000;
      border-radius: 0;
    }

    .lv-risk-card-icon {
      width: 32px;
      height: 32px;
      display: inline-block;
      color: #000000;
    }

    .lv-risk-card-icon svg {
      stroke: currentColor;
      fill: none;
      width: 32px;
      height: 32px;
      display: block;
      stroke-width: 2;
    }

    .lv-risk-card-title-wrapper {
      flex: 1;
      min-width: 0;
    }

    .lv-risk-card-title {
      font-size: 15px;
      font-weight: 900;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.4;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .lv-risk-card-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 0;
      background: #000000;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      letter-spacing: 0.5px;
      border: 2px solid #000000;
    }

    .lv-risk-chevron {
      width: 18px;
      height: 18px;
      color: #000000;
      flex-shrink: 0;
      transition: transform 0.3s ease;
      display: inline-block;
    }

    .lv-risk-chevron svg {
      stroke: currentColor;
      fill: none;
      width: 18px;
      height: 18px;
      display: block;
    }

    .lv-risk-card.lv-expanded .lv-risk-chevron {
      transform: rotate(180deg);
    }

    .lv-risk-card-details {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease, padding 0.3s ease;
      padding: 0 16px;
    }

    .lv-risk-card.lv-expanded .lv-risk-card-details {
      max-height: 500px;
      padding: 0 18px 18px 18px;
    }

    .lv-risk-card-description {
      font-size: 15px;
      color: #000000;
      line-height: 1.6;
      margin-bottom: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-weight: 500;
    }

    .lv-risk-card-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 12px;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-weight: 500;
    }

    .lv-risk-card-category {
      text-transform: uppercase;
      padding: 4px 8px;
      background: #FFFFFF;
      border: 2px solid #000000;
      border-radius: 0;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .lv-risk-card-location {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .lv-risk-card-location .lv-inline-icon {
      width: 12px;
      height: 12px;
      color: #000000;
      display: inline-block;
    }

    .lv-risk-card-location .lv-inline-icon svg {
      stroke: currentColor;
      fill: none;
      width: 12px;
      height: 12px;
      display: block;
    }

    @media (max-width: 600px) {
      .lv-risks-list {
        grid-template-columns: 1fr;
      }
    }

    .lv-section-header-static {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 8px 0;
      margin-bottom: 20px;
    }

    .lv-no-risks, .lv-no-documents {
      font-size: 15px;
      color: #000000;
      text-align: center;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-weight: 500;
      line-height: 1.5;
    }

    .lv-success-icon {
      width: 16px;
      height: 16px;
      color: #4CAF50;
      display: inline-block;
    }

    .lv-success-icon svg {
      stroke: currentColor;
      fill: none;
      width: 16px;
      height: 16px;
      display: block;
    }

    .lv-icon {
      display: inline-block;
      color: #000000;
    }

    .lv-icon svg {
      stroke: currentColor;
      fill: none;
      display: block;
      width: 100%;
      height: 100%;
    }

    .lv-scope-list {
      font-size: 15px;
      color: #000000;
      margin-top: 12px;
      line-height: 1.6;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-weight: 500;
    }

    .lv-inline-icon {
      width: 14px;
      height: 14px;
      color: #000000;
      flex-shrink: 0;
      margin-top: 2px;
      display: inline-block;
    }

    .lv-inline-icon svg {
      stroke: currentColor;
      fill: none;
      width: 14px;
      height: 14px;
      display: block;
    }

    .lv-documents-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .lv-document-item {
      padding: 16px;
      background: #FFFFFF;
      border: 2px solid #000000;
      border-radius: 0;
      transition: all 0.2s;
      box-shadow: 2px 2px 0px 0px #000000;
    }

    .lv-document-item:hover {
      transform: translate(-2px, -2px);
      box-shadow: 4px 4px 0px 0px #000000;
    }

    .lv-document-header {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .lv-document-icon {
      width: 20px;
      height: 20px;
      color: #000000;
      flex-shrink: 0;
      margin-top: 2px;
      display: inline-block;
    }

    .lv-document-icon svg {
      stroke: currentColor;
      fill: none;
      width: 20px;
      height: 20px;
      display: block;
      stroke-width: 2;
    }

    .lv-document-type {
      font-size: 12px;
      color: #000000;
      text-transform: uppercase;
      margin-bottom: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .lv-document-link {
      font-size: 15px;
      color: #000000;
      text-decoration: underline;
      word-break: break-all;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-weight: 500;
      line-height: 1.5;
    }

    .lv-document-link:hover {
      color: #000000;
      text-decoration: underline;
    }
  `;

  if (!document.getElementById('legal-vision-side-sheet-style')) {
    document.head.appendChild(style);
  }

  // Add to DOM first
  document.body.appendChild(sheet);
  
  // Add collapsible functionality for sections
  const collapsibleSections = sheet.querySelectorAll('.lv-collapsible');
  collapsibleSections.forEach(section => {
    const header = section.querySelector('.lv-section-header');
    if (header) {
      header.addEventListener('click', () => {
        section.classList.toggle('lv-expanded');
        // Update chevron icon - find the span container (not SVG or parent)
        let chevron = header.querySelector('.lv-chevron-icon');
        // If not found as class, try finding by SVG parent
        if (!chevron) {
          const svg = header.querySelector('svg');
          if (svg && svg.parentElement && svg.parentElement.classList.contains('lv-chevron-icon')) {
            chevron = svg.parentElement;
          }
        }
        if (chevron) {
          const iconName = section.classList.contains('lv-expanded') ? 'chevron-up' : 'chevron-down';
          const size = 18;
          const className = chevron.className || 'lv-chevron-icon';
          const newIcon = createIconSync(iconName, className, size);
          chevron.outerHTML = newIcon;
          // Upgrade to GitHub version
          createIcon(iconName, className, size).then(upgradedIcon => {
            const upgradedEl = header.querySelector(`.${className.split(' ')[0]}`);
            if (upgradedEl && upgradedEl.parentNode) {
              upgradedEl.outerHTML = upgradedIcon;
            }
          });
        }
      });
    }
  });

  // Add expandable functionality for risk cards
  const riskCards = sheet.querySelectorAll('.lv-risk-card');
  riskCards.forEach(card => {
    const header = card.querySelector('.lv-risk-card-header');
    if (header) {
      header.addEventListener('click', () => {
        const isExpanding = !card.classList.contains('lv-expanded');
        
        // Collapse all other cards
        riskCards.forEach(otherCard => {
          if (otherCard !== card) {
            otherCard.classList.remove('lv-expanded');
            // Find the chevron span container
            let otherChevron = otherCard.querySelector('.lv-risk-chevron');
            if (!otherChevron) {
              const svg = otherCard.querySelector('svg');
              if (svg && svg.parentElement && svg.parentElement.classList.contains('lv-risk-chevron')) {
                otherChevron = svg.parentElement;
              }
            }
            if (otherChevron) {
              const size = 18;
              const className = otherChevron.className || 'lv-risk-chevron';
              const newIcon = createIconSync('chevron-down', className, size);
              otherChevron.outerHTML = newIcon;
            }
          }
        });
        
        // Toggle current card
        card.classList.toggle('lv-expanded');
        
        // Update chevron icon - find the span container (not SVG or parent)
        let chevron = header.querySelector('.lv-risk-chevron');
        // If not found as class, try finding by SVG parent
        if (!chevron) {
          const svg = header.querySelector('svg');
          if (svg && svg.parentElement && svg.parentElement.classList.contains('lv-risk-chevron')) {
            chevron = svg.parentElement;
          }
        }
        if (chevron) {
          const iconName = card.classList.contains('lv-expanded') ? 'chevron-up' : 'chevron-down';
          const size = 18;
          const className = chevron.className || 'lv-risk-chevron';
          const newIcon = createIconSync(iconName, className, size);
          chevron.outerHTML = newIcon;
          // Upgrade to GitHub version
          createIcon(iconName, className, size).then(upgradedIcon => {
            const upgradedEl = header.querySelector(`.${className.split(' ')[0]}`);
            if (upgradedEl && upgradedEl.parentNode) {
              upgradedEl.outerHTML = upgradedIcon;
            }
          });
        }
      });
    }
  });
  
  // Initialize icons using Lucide icons from GitHub
  initializeIcons(sheet).then(() => {
    const sheetSvgElementsAfter = sheet.querySelectorAll('svg');
    console.log('[Legal Vision] Side sheet icons initialized from GitHub');
  });

  // Add event listeners
  const closeBtn = sheet.querySelector('#lv-sheet-close');
  closeBtn.addEventListener('click', () => {
    hideAnalysisSideSheet();
  });

  const overlay = sheet.querySelector('.lv-sheet-overlay');
  overlay.addEventListener('click', () => {
    hideAnalysisSideSheet();
  });

  // Add click handlers for document links to open document viewer
  const documentLinks = sheet.querySelectorAll('[data-view-document]');
  documentLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const url = link.getAttribute('data-view-document');
      if (url) {
        showDocumentViewer(url);
      }
    });
  });

  console.log('[Legal Vision] Side sheet shown');
}

/**
 * Hide analysis side sheet
 */
function hideAnalysisSideSheet() {
  const sheet = document.getElementById('legal-vision-side-sheet');
  if (sheet) {
    const content = sheet.querySelector('.lv-sheet-content');
    const overlay = sheet.querySelector('.lv-sheet-overlay');
    
    if (content) {
      content.style.animation = 'slideOutRight 0.3s ease-out forwards';
    }
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.3s ease-out forwards';
    }

    // Add slideOut animation if not present
    if (!document.getElementById('legal-vision-slideout-sheet-style')) {
      const style = document.createElement('style');
      style.id = 'legal-vision-slideout-sheet-style';
      style.textContent = `
        @keyframes slideOutRight {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      sheet.remove();
    }, 300);
  }
}

/**
 * Show detailed terms view in side sheet
 * @param {Object|null} analysisData - LegalAnalysis object from server, or null
 */
function showTermsDetails(analysisData) {
  console.log('[Legal Vision] Showing terms details:', analysisData);
  
  // If no analysis data, just scroll to terms links
  if (!analysisData) {
    const termsLinks = document.querySelectorAll('a[href*="terms"], a[href*="privacy"], a[href*="policy"]');
    if (termsLinks.length > 0) {
      termsLinks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      termsLinks[0].style.outline = '2px solid #667eea';
      termsLinks[0].style.outlineOffset = '2px';
      setTimeout(() => {
        termsLinks[0].style.outline = '';
      }, 3000);
    }
    return;
  }
  
  // Show side sheet with analysis details
  showAnalysisSideSheet(analysisData);
}

/**
 * Show non-blocking processing indicator
 */
function showProcessingIndicator() {
  // Remove existing indicator if present
  const existing = document.getElementById('legal-vision-indicator');
  if (existing) {
    existing.remove();
  }
  
  const indicator = document.createElement('div');
  indicator.id = 'legal-vision-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000000;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;
  indicator.textContent = 'Legal Vision is analyzing what this agreement actually means…';
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(indicator);
}

/**
 * Hide processing indicator
 */
function hideProcessingIndicator() {
  const indicator = document.getElementById('legal-vision-indicator');
  if (indicator) {
    indicator.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => indicator.remove(), 300);
    
    // Add slideOut animation if not present
    if (!document.getElementById('legal-vision-slideout-style')) {
      const style = document.createElement('style');
      style.id = 'legal-vision-slideout-style';
      style.textContent = `
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

/**
 * Fallback consent detection using heuristics
 * Used when AI model is unavailable or returns uncertain results
 * Returns true if consent moment detected, false otherwise
 * Does NOT modify any buttons - only detects
 */
function fallbackConsentDetection() {
  console.log('[Legal Vision] Using fallback heuristic detection');
  
  // Check for legal links first
  const hasLegalLinks = detectLegalLinks();
  if (!hasLegalLinks) {
    console.log('[Legal Vision] No legal links found for fallback detection');
    return false;
  }
  
  // Expanded consent keywords and phrases
  const consentKeywords = [
    'sign up', 'create account', 'register', 'agree', 'accept',
    'continue', 'checkout', 'place order', 'submit', 'confirm',
    'i agree', 'i accept', 'terms and conditions',
    'agree and continue', 'agree & continue', 'agree and join',
    'get started', 'join now', 'create', 'sign up now',
    'proceed', 'next', 'complete', 'finish'
  ];
  
  const allButtons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"]');
  console.log('[Legal Vision] Checking', allButtons.length, 'buttons for consent keywords');
  
  // Score buttons by relevance
  const buttonScores = [];
  
  for (const btn of allButtons) {
    // Skip hidden buttons
    const rect = btn.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || 
        window.getComputedStyle(btn).display === 'none' ||
        window.getComputedStyle(btn).visibility === 'hidden') {
      continue;
    }
    
    const text = getButtonText(btn).toLowerCase().trim();
    if (!text) continue;
    
    // Check for consent keywords
    let score = 0;
    let matchedKeyword = '';
    
    for (const keyword of consentKeywords) {
      if (text.includes(keyword)) {
        // Longer/more specific matches get higher scores
        score += keyword.length;
        matchedKeyword = keyword;
      }
    }
    
    // Bonus for buttons with "agree" or "accept" in text
    if (text.includes('agree') || text.includes('accept')) {
      score += 10;
    }
    
    // Bonus for primary action buttons (usually larger, more prominent)
    const computedStyle = window.getComputedStyle(btn);
    if (computedStyle.backgroundColor !== 'transparent' && 
        computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      score += 5;
    }
    
    if (score > 0) {
      buttonScores.push({
        button: btn,
        text: text,
        score: score,
        keyword: matchedKeyword
      });
    }
  }
  
  // Sort by score (highest first)
  buttonScores.sort((a, b) => b.score - a.score);
  
  console.log('[Legal Vision] Found', buttonScores.length, 'potential consent buttons:', 
    buttonScores.map(b => ({ text: b.text, score: b.score })));
  
  // Return true if we found any consent buttons (detection only, no modification)
  return buttonScores.length > 0;
}

// CTA modification logging removed - extension never modifies button text per requirements

/**
 * Show document viewer modal to display terms and conditions content
 * @param {string} documentUrl - URL of the document to display
 */
async function showDocumentViewer(documentUrl) {
  // Remove existing viewer if present
  const existing = document.getElementById('legal-vision-document-viewer');
  if (existing) {
    existing.remove();
  }

  const viewer = document.createElement('div');
  viewer.id = 'legal-vision-document-viewer';

  // Show loading state
  viewer.innerHTML = `
    <div class="lv-viewer-overlay"></div>
    <div class="lv-viewer-content">
      <div class="lv-viewer-header">
        <div class="lv-viewer-title">
          <i data-lucide="file-text" class="lv-viewer-icon"></i>
          Loading Document...
        </div>
        <button class="lv-viewer-close" id="lv-viewer-close">
          <i data-lucide="x" class="lv-close-icon"></i>
        </button>
      </div>
      <div class="lv-viewer-body">
        <div class="lv-viewer-loading">
          <i data-lucide="refresh-cw" class="lv-loading-icon"></i>
          <p>Fetching document content...</p>
        </div>
      </div>
    </div>
  `;

  // Add styles for document viewer
  const style = document.createElement('style');
  style.id = 'legal-vision-document-viewer-style';
  style.textContent = `
    #legal-vision-document-viewer {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000002;
      pointer-events: none;
    }

    .lv-viewer-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      opacity: 0;
      animation: fadeIn 0.3s ease-out forwards;
      pointer-events: all;
    }

    .lv-viewer-content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      width: 90%;
      max-width: 900px;
      max-height: 90vh;
      background: #F0F5FF;
      border: 4px solid #000000;
      border-radius: 0;
      box-shadow: 12px 12px 0px 0px #000000;
      display: flex;
      flex-direction: column;
      animation: scaleIn 0.3s ease-out forwards;
      pointer-events: all;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: #000000;
    }

    @keyframes scaleIn {
      from {
        transform: translate(-50%, -50%) scale(0.95);
        opacity: 0;
      }
      to {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
    }

    .lv-viewer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 3px solid #000000;
      flex-shrink: 0;
    }

    .lv-viewer-title {
      font-size: 24px;
      font-weight: 900;
      color: #000000;
      display: flex;
      align-items: center;
      gap: 12px;
      letter-spacing: -0.5px;
    }

    .lv-viewer-icon {
      width: 28px;
      height: 28px;
      color: #000000;
      display: inline-block;
      flex-shrink: 0;
    }

    .lv-viewer-icon svg {
      stroke: currentColor;
      fill: none;
      width: 28px;
      height: 28px;
      display: block;
      stroke-width: 2;
    }

    .lv-viewer-close {
      background: transparent;
      border: 2px solid #000000;
      color: #000000;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      border-radius: 0;
    }

    .lv-viewer-close:hover {
      transform: translate(-2px, -2px);
      box-shadow: 2px 2px 0px 0px #000000;
    }

    .lv-viewer-close:active {
      transform: translate(0, 0);
      box-shadow: none;
    }

    .lv-viewer-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      min-height: 0;
    }

    .lv-viewer-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 16px;
    }

    .lv-loading-icon {
      width: 48px;
      height: 48px;
      color: #000000;
      display: inline-block;
      animation: spin 1s linear infinite;
    }

    .lv-loading-icon svg {
      stroke: currentColor;
      fill: none;
      width: 48px;
      height: 48px;
      display: block;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .lv-viewer-loading p {
      font-size: 16px;
      font-weight: 500;
      color: #000000;
      margin: 0;
    }

    .lv-viewer-document {
      background: #FFFFFF;
      border: 3px solid #000000;
      border-radius: 0;
      padding: 24px;
      box-shadow: 4px 4px 0px 0px #000000;
    }

    .lv-viewer-document-header {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #000000;
    }

    .lv-viewer-document-title {
      font-size: 20px;
      font-weight: 900;
      color: #000000;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .lv-viewer-document-url {
      font-size: 14px;
      color: #000000;
      word-break: break-all;
      font-weight: 500;
    }

    .lv-viewer-document-content {
      font-size: 14px;
      line-height: 1.8;
      color: #000000;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-weight: 400;
    }

    .lv-viewer-error {
      background: #FFFFFF;
      border: 3px solid #000000;
      border-radius: 0;
      padding: 24px;
      box-shadow: 4px 4px 0px 0px #000000;
      text-align: center;
    }

    .lv-viewer-error-icon {
      width: 48px;
      height: 48px;
      color: #000000;
      display: inline-block;
      margin-bottom: 16px;
    }

    .lv-viewer-error-icon svg {
      stroke: currentColor;
      fill: none;
      width: 48px;
      height: 48px;
      display: block;
    }

    .lv-viewer-error-message {
      font-size: 16px;
      font-weight: 500;
      color: #000000;
      margin-bottom: 12px;
    }

    .lv-viewer-error-action {
      background: #88aaee;
      border: 2px solid #000000;
      color: #000000;
      padding: 8px 16px;
      border-radius: 5px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-block;
      text-decoration: none;
      box-shadow: none;
    }

    .lv-viewer-error-action:hover {
      transform: translate(-4px, -4px);
      box-shadow: 4px 4px 0px 0px #000000;
    }

    .lv-viewer-error-action:active {
      transform: translate(0, 0);
      box-shadow: none;
    }
  `;

  if (!document.getElementById('legal-vision-document-viewer-style')) {
    document.head.appendChild(style);
  }

  document.body.appendChild(viewer);

  // Initialize icons
  await initializeIcons(viewer);

  // Fetch document content via background worker
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const response = await chrome.runtime.sendMessage({
        action: 'fetchDocumentContent',
        url: documentUrl
      });

      if (response && response.success && response.html) {
        // Parse HTML and extract text content
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.html, 'text/html');
        
        // Remove script and style elements
        const scripts = doc.querySelectorAll('script, style, noscript, iframe, embed, object');
        scripts.forEach(el => el.remove());
        
        // Get main content - try common content selectors
        const contentSelectors = [
          'main',
          'article',
          '[role="main"]',
          '.content',
          '#content',
          '.main-content',
          '#main-content',
          '.terms-content',
          '.privacy-content',
          '.legal-content'
        ];
        
        let contentElement = null;
        for (const selector of contentSelectors) {
          contentElement = doc.querySelector(selector);
          if (contentElement) break;
        }
        
        if (!contentElement) {
          contentElement = doc.body;
        }
        
        // Extract text content
        let textContent = contentElement.innerText || contentElement.textContent || '';
        
        // Clean up whitespace
        textContent = textContent
          .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
          .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
          .trim();
        
        // Limit content length (prevent huge documents)
        const maxLength = 500000; // ~500KB of text
        if (textContent.length > maxLength) {
          textContent = textContent.substring(0, maxLength) + '\n\n[... Content truncated due to length ...]';
        }
        
        // Display document content
        const body = viewer.querySelector('.lv-viewer-body');
        body.innerHTML = `
          <div class="lv-viewer-document">
            <div class="lv-viewer-document-header">
              <div class="lv-viewer-document-title">Document Content</div>
              <div class="lv-viewer-document-url">${escapeHtml(documentUrl)}</div>
            </div>
            <div class="lv-viewer-document-content">${escapeHtml(textContent)}</div>
          </div>
        `;
      } else {
        throw new Error(response?.error || 'Failed to fetch document');
      }
    } else {
      throw new Error('Chrome runtime not available');
    }
  } catch (error) {
    console.error('[Legal Vision] Error fetching document:', error);
    const body = viewer.querySelector('.lv-viewer-body');
    body.innerHTML = `
      <div class="lv-viewer-error">
        <i data-lucide="alert-circle" class="lv-viewer-error-icon"></i>
        <div class="lv-viewer-error-message">Failed to load document</div>
        <div style="font-size: 14px; color: #000000; margin-bottom: 16px;">${escapeHtml(error.message || 'Unknown error')}</div>
        <a href="${documentUrl}" target="_blank" class="lv-viewer-error-action">Open in New Tab</a>
      </div>
    `;
    await initializeIcons(viewer);
  }

  // Add event listeners
  const closeBtn = viewer.querySelector('#lv-viewer-close');
  closeBtn.addEventListener('click', () => {
    hideDocumentViewer();
  });

  const overlay = viewer.querySelector('.lv-viewer-overlay');
  overlay.addEventListener('click', () => {
    hideDocumentViewer();
  });

  // Update title
  const titleEl = viewer.querySelector('.lv-viewer-title');
  if (titleEl) {
    titleEl.innerHTML = `
      <i data-lucide="file-text" class="lv-viewer-icon"></i>
      Document Viewer
    `;
    await initializeIcons(viewer);
  }
}

/**
 * Hide document viewer
 */
function hideDocumentViewer() {
  const viewer = document.getElementById('legal-vision-document-viewer');
  if (viewer) {
    const content = viewer.querySelector('.lv-viewer-content');
    const overlay = viewer.querySelector('.lv-viewer-overlay');
    
    if (content) {
      content.style.animation = 'scaleOut 0.3s ease-out forwards';
    }
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.3s ease-out forwards';
    }

    // Add scaleOut animation if not present
    if (!document.getElementById('legal-vision-viewer-scaleout-style')) {
      const style = document.createElement('style');
      style.id = 'legal-vision-viewer-scaleout-style';
      style.textContent = `
        @keyframes scaleOut {
          from {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          to {
            transform: translate(-50%, -50%) scale(0.95);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      viewer.remove();
    }, 300);
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Message listener for popup communication
 * Allows popup to check if AI Prompt API is available
 */
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkAI') {
      // Check if Prompt API is available
      const aiAvailable = typeof window.ai !== 'undefined' && 
                          typeof window.ai.prompt === 'function';
      sendResponse({ aiAvailable: aiAvailable });
      return true; // Indicates we will send a response asynchronously
    }
  });
}
