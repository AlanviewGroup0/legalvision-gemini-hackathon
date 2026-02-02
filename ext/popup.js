/**
 * Legal Vision - Popup Script
 * Updates popup status display and handles button clicks
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    const statusElement = document.getElementById('status');
    
    if (!statusElement) {
        console.error('[Legal Vision] Status element not found');
        return;
    }
    
    // Try to check AI availability via messaging with content script
    // If content script is available, it can tell us if AI is enabled
    try {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime) {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'checkAI' }, function(response) {
                        if (chrome.runtime.lastError) {
                            // Content script not ready or page doesn't support messaging
                            statusElement.textContent = 'Active';
                        } else if (response && response.aiAvailable) {
                            statusElement.textContent = 'Active (AI Enabled)';
                        } else {
                            statusElement.textContent = 'Active (Heuristic Mode)';
                        }
                    });
                } else {
                    statusElement.textContent = 'Active';
                }
            });
        } else {
            statusElement.textContent = 'Active';
        }
    } catch (error) {
        console.error('[Legal Vision] Error checking AI status:', error);
        statusElement.textContent = 'Active';
    }

    // Add event listener for "Learn More" button
    const learnMoreBtn = document.querySelector('.btn');
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', function() {
            // Open a new tab with the current page URL
            // This allows users to navigate to the page they're viewing
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    if (tabs[0] && tabs[0].url) {
                        // Open the current page in a new tab
                        chrome.tabs.create({ url: tabs[0].url });
                    } else {
                        // Fallback: if no active tab, open a default page
                        chrome.tabs.create({ url: 'chrome://newtab' });
                    }
                });
            } else {
                // Fallback for non-Chrome browsers
                window.open(window.location.href, '_blank');
            }
        });
    }
});
