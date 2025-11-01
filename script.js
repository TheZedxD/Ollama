// Chat history - NOT persisted (fresh on reload)
let chatHistory = [];
let currentTheme = 'dark';
let isGenerating = false;
let isSidebarCollapsed = false;
let activeTools = {
    'web-search': false,
    'code-interpreter': false,
    'image-generation': false,
    'file-analysis': false,
    'memory': false
};

// LocalStorage keys
const STORAGE_KEYS = {
    THEME: 'ollama_theme',
    OLLAMA_URL: 'ollama_url',
    TEMPERATURE: 'ollama_temperature',
    SYSTEM_PROMPT: 'ollama_system_prompt',
    SELECTED_MODEL: 'ollama_selected_model',
    ACTIVE_TOOLS: 'ollama_active_tools',
    SIDEBAR_COLLAPSED: 'ollama_sidebar_collapsed'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    refreshModels();
    checkConnection();
});

// Load settings from localStorage
function loadSettings() {
    // Load theme
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme) {
        currentTheme = savedTheme;
        document.documentElement.setAttribute('data-theme', currentTheme);
    }

    // Load Ollama URL
    const savedUrl = localStorage.getItem(STORAGE_KEYS.OLLAMA_URL);
    if (savedUrl) {
        document.getElementById('ollama-url').value = savedUrl;
    }

    // Load temperature
    const savedTemp = localStorage.getItem(STORAGE_KEYS.TEMPERATURE);
    if (savedTemp) {
        document.getElementById('temperature').value = savedTemp;
    }

    // Load system prompt
    const savedPrompt = localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT);
    if (savedPrompt) {
        document.getElementById('system-prompt').value = savedPrompt;
    }

    // Load active tools
    const savedTools = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOOLS);
    if (savedTools) {
        try {
            activeTools = JSON.parse(savedTools);
            // Update UI for active tools
            Object.keys(activeTools).forEach(toolName => {
                if (activeTools[toolName]) {
                    const checkbox = document.getElementById('tool-' + toolName);
                    if (checkbox) {
                        checkbox.classList.add('checked');
                    }
                }
            });
            updateToolsBadge();
        } catch (e) {
            console.error('Error loading active tools:', e);
        }
    }

    // Load sidebar collapsed state
    const savedSidebarState = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    if (savedSidebarState === 'true') {
        isSidebarCollapsed = true;
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle');
        const toggleIcon = document.getElementById('toggle-icon');
        sidebar.classList.add('collapsed');
        toggleBtn.classList.add('collapsed');
        toggleIcon.textContent = '›';
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.THEME, currentTheme);
    localStorage.setItem(STORAGE_KEYS.OLLAMA_URL, document.getElementById('ollama-url').value);
    localStorage.setItem(STORAGE_KEYS.TEMPERATURE, document.getElementById('temperature').value);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, document.getElementById('system-prompt').value);
    localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, document.getElementById('model-select').value);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TOOLS, JSON.stringify(activeTools));
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, isSidebarCollapsed);
}

// Add event listeners to save settings when they change
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ollama-url').addEventListener('change', saveSettings);
    document.getElementById('temperature').addEventListener('change', saveSettings);
    document.getElementById('system-prompt').addEventListener('change', saveSettings);
    document.getElementById('model-select').addEventListener('change', saveSettings);
});

// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const toggleIcon = document.getElementById('toggle-icon');
    isSidebarCollapsed = !isSidebarCollapsed;

    if (isSidebarCollapsed) {
        sidebar.classList.add('collapsed');
        toggleBtn.classList.add('collapsed');
        toggleIcon.textContent = '›';
    } else {
        sidebar.classList.remove('collapsed');
        toggleBtn.classList.remove('collapsed');
        toggleIcon.textContent = '‹';
    }

    saveSettings();
}

// Toggle Tools Popup
function toggleToolsPopup() {
    const popup = document.getElementById('tools-popup');
    popup.classList.toggle('active');
}

// Toggle Tool
function toggleTool(toolName) {
    activeTools[toolName] = !activeTools[toolName];
    const checkbox = document.getElementById('tool-' + toolName);

    if (activeTools[toolName]) {
        checkbox.classList.add('checked');
    } else {
        checkbox.classList.remove('checked');
    }

    // Update badge
    updateToolsBadge();
    saveSettings();
}

// Update Tools Badge
function updateToolsBadge() {
    const badge = document.getElementById('tools-badge');
    const activeCount = Object.values(activeTools).filter(v => v).length;

    badge.textContent = activeCount;

    if (activeCount > 0) {
        badge.classList.add('active');
    } else {
        badge.classList.remove('active');
    }
}

// Close popup when clicking outside
document.addEventListener('click', function(event) {
    const popup = document.getElementById('tools-popup');
    const toolsButton = event.target.closest('.tools-button');
    const popupElement = event.target.closest('.tools-popup');

    if (!toolsButton && !popupElement && popup.classList.contains('active')) {
        popup.classList.remove('active');
    }
});

// Theme Toggle
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    saveSettings();
}

// Check Ollama Connection
async function checkConnection() {
    const ollamaUrl = document.getElementById('ollama-url').value;
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    try {
        const response = await fetch(`${ollamaUrl}/api/tags`);
        if (response.ok) {
            statusDot.classList.add('connected');
            statusText.textContent = 'Connected';
        } else {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Disconnected';
        }
    } catch (error) {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
    }
}

// Refresh Models
async function refreshModels() {
    const ollamaUrl = document.getElementById('ollama-url').value;
    const modelSelect = document.getElementById('model-select');
    const savedModel = localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL);

    try {
        const response = await fetch(`${ollamaUrl}/api/tags`);
        const data = await response.json();

        modelSelect.innerHTML = '';

        if (data.models && data.models.length > 0) {
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = model.name;
                modelSelect.appendChild(option);
            });

            // Try to restore saved model selection
            if (savedModel && Array.from(modelSelect.options).some(opt => opt.value === savedModel)) {
                modelSelect.value = savedModel;
            }
        } else {
            const option = document.createElement('option');
            option.value = 'llama3.2:3b';
            option.textContent = 'llama3.2:3b (default)';
            modelSelect.appendChild(option);
        }

        checkConnection();
    } catch (error) {
        console.error('Error fetching models:', error);
        addMessage('system', 'Error connecting to Ollama. Make sure Ollama is running.');
    }
}

// Clear Chat
function clearChat() {
    chatHistory = [];
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = `
        <div class="message assistant">
            <div class="message-header">System</div>
            <div class="message-content">
                <p>Chat cleared. Ready for new conversation.</p>
            </div>
        </div>
    `;
}

// Handle Enter Key
function handleKeyPress(event) {
    // Ctrl+Enter or Shift+Enter for new line
    if ((event.ctrlKey || event.shiftKey) && event.key === 'Enter') {
        // Allow default behavior (new line)
        return;
    }

    // Enter alone to send
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
}

// Send Message
async function sendMessage() {
    if (isGenerating) return;

    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();

    if (!message) return;

    // Add user message
    addMessage('user', message);
    chatHistory.push({ role: 'user', content: message });
    chatInput.value = '';

    // Disable input
    isGenerating = true;
    const sendButton = document.getElementById('send-button');
    const thinkingAnimation = document.getElementById('thinking-animation');

    sendButton.disabled = true;
    chatInput.disabled = true;
    chatInput.style.opacity = '0.5';
    chatInput.style.cursor = 'not-allowed';
    thinkingAnimation.classList.add('active');
    document.getElementById('typing-indicator').classList.add('active');

    // Prepare request
    const ollamaUrl = document.getElementById('ollama-url').value;
    const model = document.getElementById('model-select').value;
    const temperature = parseFloat(document.getElementById('temperature').value);
    const systemPrompt = document.getElementById('system-prompt').value;

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push(...chatHistory);

    // Create assistant message container
    const messageDiv = createMessageElement('assistant');
    const contentDiv = messageDiv.querySelector('.message-content');

    let fullResponse = '';

    try {
        const response = await fetch(`${ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true,
                options: {
                    temperature: temperature
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                // Process any remaining buffer
                if (buffer.trim()) {
                    try {
                        const json = JSON.parse(buffer);
                        if (json.message && json.message.content) {
                            fullResponse += json.message.content;
                        }
                    } catch (e) {
                        console.error('Error parsing final buffer:', e);
                    }
                }
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const json = JSON.parse(line);
                        if (json.message && json.message.content) {
                            fullResponse += json.message.content;

                            // Parse and render, handling incomplete code blocks during streaming
                            try {
                                contentDiv.innerHTML = parseMarkdown(fullResponse) + '<span class="streaming-cursor"></span>';
                            } catch (parseError) {
                                // If parsing fails mid-stream, just show raw text with cursor
                                contentDiv.innerHTML = escapeHtml(fullResponse) + '<span class="streaming-cursor"></span>';
                            }

                            scrollToBottom();
                        }
                        if (json.done) {
                            console.log('Stream complete');
                        }
                    } catch (e) {
                        console.error('Error parsing JSON line:', e, 'Line:', line);
                    }
                }
            }
        }

        // Final update - remove cursor and ensure proper parsing
        if (fullResponse) {
            contentDiv.innerHTML = parseMarkdown(fullResponse);
            chatHistory.push({ role: 'assistant', content: fullResponse });
            scrollToBottom();
        } else {
            throw new Error('No response received from model');
        }

    } catch (error) {
        console.error('Error:', error);
        contentDiv.innerHTML = `<p style="color: #ff4444;">Error: ${error.message}</p>`;
        // Remove the failed assistant message from history
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages.lastChild === messageDiv) {
            // Only show error in UI, don't add to history
        }
    } finally {
        isGenerating = false;
        const sendButton = document.getElementById('send-button');
        const chatInput = document.getElementById('chat-input');
        const thinkingAnimation = document.getElementById('thinking-animation');

        sendButton.disabled = false;
        chatInput.disabled = false;
        chatInput.style.opacity = '1';
        chatInput.style.cursor = 'text';
        thinkingAnimation.classList.remove('active');
        document.getElementById('typing-indicator').classList.remove('active');
    }
}

// Create Message Element
function createMessageElement(role) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    headerDiv.textContent = role === 'user' ? 'You' : role === 'assistant' ? 'AI' : 'System';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    scrollToBottom();
    return messageDiv;
}

// Add Message
function addMessage(role, content) {
    const messageDiv = createMessageElement(role);
    const contentDiv = messageDiv.querySelector('.message-content');
    contentDiv.innerHTML = parseMarkdown(content);
}

// Parse Markdown
function parseMarkdown(text) {
    // Store original text for processing
    let result = text;

    // Array to store code blocks temporarily
    const codeBlocks = [];
    let codeBlockIndex = 0;

    // Extract and replace code blocks with placeholders
    result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'code';
        const placeholder = `___CODEBLOCK_${codeBlockIndex}___`;
        codeBlocks.push({ language, code: code.trim() });
        codeBlockIndex++;
        return placeholder;
    });

    // Now escape HTML in the remaining text (non-code parts)
    result = result.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');

    // Process inline code (after HTML escaping)
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Line breaks
    result = result.replace(/\n/g, '<br>');

    // Restore code blocks with proper formatting
    codeBlocks.forEach((block, index) => {
        const placeholder = `___CODEBLOCK_${index}___`;
        const codeBlockHtml = `<div class="code-block">
            <div class="code-header">
                <span>${block.language}</span>
                <button class="copy-button" onclick="copyCode(this)">Copy</button>
            </div>
            <pre><code>${escapeHtml(block.code)}</code></pre>
        </div>`;
        result = result.replace(placeholder, codeBlockHtml);
    });

    // Paragraphs (split by double line breaks)
    const parts = result.split('<br><br>');
    result = parts.map(p => {
        p = p.trim();
        // Don't wrap code blocks in paragraphs
        if (p.startsWith('<div class="code-block">')) {
            return p;
        }
        return p ? `<p>${p}</p>` : '';
    }).join('');

    return result;
}

// Helper function to escape HTML in code blocks
function escapeHtml(text) {
    return text.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

// Copy Code
function copyCode(button) {
    // Get the specific code block that contains this button
    const codeBlock = button.closest('.code-block');
    if (!codeBlock) {
        console.error('Code block not found');
        return;
    }

    // Get only the code element within THIS specific code block
    const codeElement = codeBlock.querySelector('pre code');
    if (!codeElement) {
        console.error('Code element not found');
        return;
    }

    // Get the text content of only this specific code block
    const code = codeElement.textContent;

    // Copy to clipboard
    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.style.opacity = '0.7';

        setTimeout(() => {
            button.textContent = originalText;
            button.style.opacity = '1';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy code:', err);
        button.textContent = 'Error';
        setTimeout(() => {
            button.textContent = 'Copy';
        }, 2000);
    });
}

// Scroll to Bottom
function scrollToBottom() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
