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
let currentImage = null; // Store current image data

// Model configurations
const MODEL_CONFIGS = {
    'llama3.2:3b': {
        name: 'llama3.2:3b',
        supportsVision: false,
        isDefault: true
    },
    'qwen2-vl:2b': {
        name: 'qwen2-vl:2b',
        supportsVision: true,
        isDefault: false
    },
    // Support for other common vision model names
    'llava': {
        name: 'llava',
        supportsVision: true,
        isDefault: false
    },
    'llava:latest': {
        name: 'llava:latest',
        supportsVision: true,
        isDefault: false
    }
};

// LocalStorage keys
const STORAGE_KEYS = {
    THEME: 'ollama_theme',
    OLLAMA_URL: 'ollama_url',
    TEMPERATURE: 'ollama_temperature',
    MAX_TOKENS: 'ollama_max_tokens',
    TOP_P: 'ollama_top_p',
    TOP_K: 'ollama_top_k',
    REPEAT_PENALTY: 'ollama_repeat_penalty',
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
    updateImageButtonVisibility();
    setupDragAndDrop();
});

// Estimate token count (rough approximation: ~4 chars = 1 token)
function estimateTokenCount(text) {
    if (!text) return 0;
    // More accurate estimation: count words and characters
    const words = text.trim().split(/\s+/).length;
    const chars = text.length;
    // Average of word-based (1.3 tokens per word) and char-based (4 chars per token)
    return Math.ceil((words * 1.3 + chars / 4) / 2);
}

// Check if current model supports vision
function isVisionModelSelected() {
    const selectedModel = document.getElementById('model-select').value.toLowerCase();

    // Check hardcoded configs first
    if (MODEL_CONFIGS[selectedModel]?.supportsVision) {
        return true;
    }

    // Pattern matching for common vision model names
    const visionPatterns = [
        'llava',
        'bakllava',
        'qwen',
        'qwen2-vl',
        'qwen-vl',
        'minicpm-v',
        'cogvlm',
        'yi-vl',
        'internvl',
        'moondream',
        'vision',
        'vl-'
    ];

    return visionPatterns.some(pattern => selectedModel.includes(pattern));
}

// Update image button visibility based on selected model
function updateImageButtonVisibility() {
    const imageButton = document.getElementById('image-button');
    if (isVisionModelSelected()) {
        imageButton.style.display = 'flex';
    } else {
        imageButton.style.display = 'none';
        // Clear any uploaded image if switching away from vision model
        if (currentImage) {
            removeImage();
        }
    }
}

// Handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        currentImage = e.target.result; // Base64 string

        // Show preview
        const preview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');
        previewImg.src = currentImage;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Remove uploaded image
function removeImage() {
    currentImage = null;
    const preview = document.getElementById('image-preview');
    preview.style.display = 'none';
    document.getElementById('image-input').value = '';
}

// Setup drag and drop for images
function setupDragAndDrop() {
    const chatInputWrapper = document.querySelector('.chat-input-wrapper');
    const chatInput = document.getElementById('chat-input');

    // Prevent default drag behaviors on the entire wrapper
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        chatInputWrapper.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        chatInputWrapper.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        chatInputWrapper.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        // Only highlight if vision model is selected
        if (isVisionModelSelected()) {
            chatInputWrapper.classList.add('drag-over');
        }
    }

    function unhighlight(e) {
        chatInputWrapper.classList.remove('drag-over');
    }

    // Handle dropped files
    chatInputWrapper.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        // Only allow drop if vision model is selected
        if (!isVisionModelSelected()) {
            alert('Please select a vision model to upload images');
            return;
        }

        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const file = files[0];

            // Check if it's an image
            if (!file.type.startsWith('image/')) {
                alert('Please drop an image file');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                currentImage = e.target.result; // Base64 string

                // Show preview
                const preview = document.getElementById('image-preview');
                const previewImg = document.getElementById('preview-img');
                previewImg.src = currentImage;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }
}

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

    // Load max tokens
    const savedMaxTokens = localStorage.getItem(STORAGE_KEYS.MAX_TOKENS);
    if (savedMaxTokens) {
        document.getElementById('max-tokens').value = savedMaxTokens;
    }

    // Load top_p
    const savedTopP = localStorage.getItem(STORAGE_KEYS.TOP_P);
    if (savedTopP) {
        document.getElementById('top-p').value = savedTopP;
    }

    // Load top_k
    const savedTopK = localStorage.getItem(STORAGE_KEYS.TOP_K);
    if (savedTopK) {
        document.getElementById('top-k').value = savedTopK;
    }

    // Load repeat penalty
    const savedRepeatPenalty = localStorage.getItem(STORAGE_KEYS.REPEAT_PENALTY);
    if (savedRepeatPenalty) {
        document.getElementById('repeat-penalty').value = savedRepeatPenalty;
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
    localStorage.setItem(STORAGE_KEYS.MAX_TOKENS, document.getElementById('max-tokens').value);
    localStorage.setItem(STORAGE_KEYS.TOP_P, document.getElementById('top-p').value);
    localStorage.setItem(STORAGE_KEYS.TOP_K, document.getElementById('top-k').value);
    localStorage.setItem(STORAGE_KEYS.REPEAT_PENALTY, document.getElementById('repeat-penalty').value);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, document.getElementById('system-prompt').value);
    localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, document.getElementById('model-select').value);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TOOLS, JSON.stringify(activeTools));
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, isSidebarCollapsed);
}

// Add event listeners to save settings when they change
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ollama-url').addEventListener('change', saveSettings);
    document.getElementById('temperature').addEventListener('change', saveSettings);
    document.getElementById('max-tokens').addEventListener('change', saveSettings);
    document.getElementById('top-p').addEventListener('change', saveSettings);
    document.getElementById('top-k').addEventListener('change', saveSettings);
    document.getElementById('repeat-penalty').addEventListener('change', saveSettings);
    document.getElementById('system-prompt').addEventListener('change', saveSettings);
    document.getElementById('model-select').addEventListener('change', () => {
        saveSettings();
        updateImageButtonVisibility();
    });
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
        const response = await fetch(`${ollamaUrl}/api/tags`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (response.ok) {
            statusDot.classList.add('connected');
            statusText.textContent = 'Connected';
            return true;
        } else {
            statusDot.classList.remove('connected');
            statusText.textContent = `Error: ${response.status}`;
            console.error('Ollama connection error:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        statusDot.classList.remove('connected');

        // Provide more detailed error messages
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            statusText.textContent = 'CORS Error';
            console.error('CORS error - Ollama needs CORS enabled. See README for setup instructions.');
            console.error('Error details:', error);

            // Show user-friendly error message
            if (document.getElementById('chat-messages').children.length === 0) {
                addMessage('system', `⚠️ **Connection Failed: CORS Error**\n\nOllama is blocking the connection due to CORS (Cross-Origin Resource Sharing) restrictions.\n\n**To fix this, you need to run Ollama with CORS enabled:**\n\n**On macOS/Linux:**\n\`\`\`bash\nOLLAMA_ORIGINS="*" ollama serve\n\`\`\`\n\n**On Windows (PowerShell):**\n\`\`\`powershell\n$env:OLLAMA_ORIGINS="*"\nollama serve\n\`\`\`\n\n**On Windows (CMD):**\n\`\`\`cmd\nset OLLAMA_ORIGINS=*\nollama serve\n\`\`\`\n\nThen click **Refresh Models** to reconnect.`);
            }
        } else {
            statusText.textContent = 'Connection Failed';
            console.error('Connection error:', error);
        }
        return false;
    }
}

// Refresh Models
async function refreshModels() {
    const ollamaUrl = document.getElementById('ollama-url').value;
    const modelSelect = document.getElementById('model-select');
    const savedModel = localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL);

    try {
        const response = await fetch(`${ollamaUrl}/api/tags`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

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

            // Update image button visibility after model is loaded
            updateImageButtonVisibility();

            // Show success message if reconnected
            const statusText = document.getElementById('status-text');
            if (statusText.textContent === 'CORS Error' || statusText.textContent === 'Connection Failed') {
                addMessage('system', '✅ **Connected Successfully!**\n\nOllama connection established. You can now start chatting.');
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

        // Provide detailed error information
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            // CORS error - checkConnection will handle the message
            checkConnection();
        } else {
            addMessage('system', `⚠️ **Connection Error**\n\nCould not connect to Ollama at \`${ollamaUrl}\`\n\nPlease make sure:\n1. Ollama is installed and running\n2. Ollama is started with CORS enabled (see error message above for instructions)\n3. The URL is correct (default: http://localhost:11434)`);
        }
    }
}

// Clear Chat
function clearChat() {
    chatHistory = [];
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
}

// ===============================
// FUNCTION CALLING / TOOLS SYSTEM
// ===============================

// DuckDuckGo HTML Web Search Function (primary)
async function searchDuckDuckGo(query) {
    try {
        // Use DuckDuckGo HTML search for actual web results
        const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
        const html = await response.text();

        // Parse HTML to extract search results
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const results = [];
        const resultElements = doc.querySelectorAll('.result');

        // Extract up to 5 search results
        for (let i = 0; i < Math.min(resultElements.length, 5); i++) {
            const result = resultElements[i];

            const titleElement = result.querySelector('.result__a');
            const snippetElement = result.querySelector('.result__snippet');
            const urlElement = result.querySelector('.result__url');

            if (titleElement && snippetElement) {
                results.push({
                    title: titleElement.textContent.trim(),
                    snippet: snippetElement.textContent.trim(),
                    url: urlElement ? urlElement.textContent.trim() : (titleElement.href || '')
                });
            }
        }

        return results;
    } catch (error) {
        console.error('DuckDuckGo search error:', error);
        return [];
    }
}

// Wikipedia API Search Function (fallback)
async function searchWikipedia(query) {
    try {
        // Use Wikipedia API for factual queries
        const response = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3`);
        const data = await response.json();

        const results = [];

        if (data.query && data.query.search) {
            data.query.search.forEach(item => {
                // Remove HTML tags from snippet
                const snippet = item.snippet.replace(/<[^>]*>/g, '');
                results.push({
                    title: item.title,
                    snippet: snippet,
                    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`
                });
            });
        }

        return results;
    } catch (error) {
        console.error('Wikipedia search error:', error);
        return [];
    }
}

// Combined Web Search Function with fallback
async function webSearch(query) {
    try {
        let allResults = [];
        let searchSources = [];

        // Primary: Try DuckDuckGo HTML search
        console.log('Searching DuckDuckGo for:', query);
        const ddgResults = await searchDuckDuckGo(query);

        if (ddgResults.length > 0) {
            allResults = allResults.concat(ddgResults);
            searchSources.push('DuckDuckGo');
        }

        // Fallback: If DDG returns no results or very few, also try Wikipedia
        if (ddgResults.length < 2) {
            console.log('DuckDuckGo returned limited results, trying Wikipedia fallback...');
            const wikiResults = await searchWikipedia(query);

            if (wikiResults.length > 0) {
                allResults = allResults.concat(wikiResults);
                searchSources.push('Wikipedia');
            }
        }

        // If still no results, return error message
        if (allResults.length === 0) {
            return `No results found for "${query}". Try rephrasing your search query or being more specific.`;
        }

        // Format results as text
        let formattedResults = `Web Search Results for: "${query}"\n`;
        formattedResults += `Sources: ${searchSources.join(', ')}\n\n`;

        allResults.forEach((result, index) => {
            formattedResults += `${index + 1}. ${result.title}\n`;
            formattedResults += `   ${result.snippet}\n`;
            if (result.url) {
                formattedResults += `   URL: ${result.url}\n`;
            }
            formattedResults += '\n';
        });

        return formattedResults;
    } catch (error) {
        console.error('Web search error:', error);
        return `Error performing web search: ${error.message}`;
    }
}

// Tool definitions that the AI can use
const AVAILABLE_TOOLS = [
    {
        name: 'web_search',
        description: 'Search the web using DuckDuckGo to find current information, facts, or answers to questions',
        parameters: {
            query: {
                type: 'string',
                description: 'The search query to look up'
            }
        },
        execute: webSearch
    }
];

// Execute a tool call
async function executeTool(toolName, parameters) {
    const tool = AVAILABLE_TOOLS.find(t => t.name === toolName);
    if (!tool) {
        return `Error: Tool "${toolName}" not found`;
    }

    try {
        return await tool.execute(parameters.query || parameters);
    } catch (error) {
        return `Error executing tool: ${error.message}`;
    }
}

// Parse tool calls from AI response
function parseToolCalls(text) {
    const toolCalls = [];

    // Pattern 1: <tool>web_search("query here")</tool> - with double quotes
    const pattern1 = /<tool>(\w+)\("([^"]+)"\)<\/tool>/gi;
    let match;

    while ((match = pattern1.exec(text)) !== null) {
        toolCalls.push({
            name: match[1].toLowerCase(),
            query: match[2]
        });
    }

    // Pattern 2: <tool>web_search('query here')</tool> - with single quotes
    const pattern2 = /<tool>(\w+)\('([^']+)'\)<\/tool>/gi;
    while ((match = pattern2.exec(text)) !== null) {
        // Check if this exact call wasn't already added by pattern1
        const exists = toolCalls.some(tc => tc.name === match[1].toLowerCase() && tc.query === match[2]);
        if (!exists) {
            toolCalls.push({
                name: match[1].toLowerCase(),
                query: match[2]
            });
        }
    }

    // Pattern 3: <tool>web_search(query here)</tool> - without quotes
    const pattern3 = /<tool>(\w+)\(([^)]+)\)<\/tool>/gi;
    while ((match = pattern3.exec(text)) !== null) {
        const query = match[2].replace(/^["']|["']$/g, '').trim(); // Remove quotes if present
        const exists = toolCalls.some(tc => tc.name === match[1].toLowerCase() && tc.query === query);
        if (!exists) {
            toolCalls.push({
                name: match[1].toLowerCase(),
                query: query
            });
        }
    }

    // Pattern 4: JSON-style tool calls in code blocks
    const jsonPattern = /```tool\s*\n([\s\S]*?)\n```/g;
    while ((match = jsonPattern.exec(text)) !== null) {
        try {
            const toolCall = JSON.parse(match[1]);
            if (toolCall.name) {
                toolCall.name = toolCall.name.toLowerCase();
            }
            toolCalls.push(toolCall);
        } catch (e) {
            console.error('Failed to parse tool call JSON:', e);
        }
    }

    return toolCalls;
}

// Get tools prompt for system message
function getToolsPrompt() {
    if (!activeTools['web-search']) {
        return '';
    }

    return `\n\nYou have access to the following tools:

**web_search** - Search the web using DuckDuckGo and Wikipedia for current information, facts, news, or answers to questions.

To use this tool, include the following syntax in your response:
<tool>web_search("your search query here")</tool>

Examples:
- <tool>web_search("latest news about AI")</tool>
- <tool>web_search("what is quantum computing")</tool>
- <tool>web_search("current weather in Tokyo")</tool>

IMPORTANT: When you use a tool, the search will be performed immediately and results will be provided to you. You will then receive another turn to synthesize and present the information to the user in a helpful, natural way. Do not tell the user to wait - just use the tool and you'll get the results automatically.`;
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

    // Calculate user message token count
    const userTokenCount = estimateTokenCount(message);

    // Prepare message content for vision models
    let messageContent = message;
    let hasImage = false;

    if (isVisionModelSelected() && currentImage) {
        hasImage = true;
        // For display purposes, we'll show the image in the UI
    }

    // Add user message with token count
    const userMessageDiv = createMessageElement('user');
    const userContentDiv = userMessageDiv.querySelector('.message-content');

    // If there's an image, display it in the message
    if (hasImage) {
        const imgElement = document.createElement('img');
        imgElement.src = currentImage;
        imgElement.style.maxWidth = '300px';
        imgElement.style.marginBottom = '10px';
        imgElement.style.display = 'block';
        imgElement.style.border = '1px solid var(--border-color)';
        userContentDiv.appendChild(imgElement);
    }

    userContentDiv.innerHTML += parseMarkdown(message);

    // Add token count to user message header
    const userHeaderDiv = userMessageDiv.querySelector('.message-header');
    const userStatsSpan = document.createElement('div');
    userStatsSpan.className = 'message-stats';
    userStatsSpan.innerHTML = `<span>${userTokenCount} tokens</span>`;
    userHeaderDiv.appendChild(userStatsSpan);

    // Prepare content for chat history
    if (hasImage) {
        // For vision models, send image as base64
        chatHistory.push({
            role: 'user',
            content: message,
            images: [currentImage.split(',')[1]] // Remove data:image/...;base64, prefix
        });
    } else {
        chatHistory.push({ role: 'user', content: message });
    }

    chatInput.value = '';

    // Clear the image after sending
    if (hasImage) {
        removeImage();
    }

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

    // Prepare request with all settings
    const ollamaUrl = document.getElementById('ollama-url').value;
    const model = document.getElementById('model-select').value;
    const temperature = parseFloat(document.getElementById('temperature').value);
    const maxTokens = parseInt(document.getElementById('max-tokens').value);
    const topP = parseFloat(document.getElementById('top-p').value);
    const topK = parseInt(document.getElementById('top-k').value);
    const repeatPenalty = parseFloat(document.getElementById('repeat-penalty').value);
    const systemPrompt = document.getElementById('system-prompt').value;

    const messages = [];
    let systemMessage = systemPrompt || '';

    // Add tools prompt if web search is enabled
    systemMessage += getToolsPrompt();

    if (systemMessage) {
        messages.push({ role: 'system', content: systemMessage });
    }
    messages.push(...chatHistory);

    // Create assistant message container
    const messageDiv = createMessageElement('assistant');
    const contentDiv = messageDiv.querySelector('.message-content');

    let fullResponse = '';
    let startTime = Date.now();
    let totalTokens = 0;
    let promptTokens = 0;
    let evalTokens = 0;

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
                    temperature: temperature,
                    num_predict: maxTokens,
                    top_p: topP,
                    top_k: topK,
                    repeat_penalty: repeatPenalty
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
                        // Capture final token stats
                        if (json.prompt_eval_count) promptTokens = json.prompt_eval_count;
                        if (json.eval_count) evalTokens = json.eval_count;
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

                        // Track token counts
                        if (json.prompt_eval_count) promptTokens = json.prompt_eval_count;
                        if (json.eval_count) evalTokens = json.eval_count;

                        if (json.done) {
                            console.log('Stream complete');
                        }
                    } catch (e) {
                        console.error('Error parsing JSON line:', e, 'Line:', line);
                    }
                }
            }
        }

        // Calculate stats
        totalTokens = promptTokens + evalTokens;
        const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
        const tokensPerSecond = evalTokens > 0 ? (evalTokens / elapsedTime).toFixed(2) : 0;

        // Check for tool calls
        const toolCalls = parseToolCalls(fullResponse);

        if (toolCalls.length > 0 && activeTools['web-search']) {
            // Save the assistant's message with tool calls to history
            chatHistory.push({ role: 'assistant', content: fullResponse });

            // Update the current message div to show the assistant's request
            contentDiv.innerHTML = parseMarkdown(fullResponse);

            // Update message header with stats for the tool request
            const headerDiv = messageDiv.querySelector('.message-header');
            const statsSpan = document.createElement('div');
            statsSpan.className = 'message-stats';
            statsSpan.innerHTML = `
                <span>${totalTokens} tokens</span>
                <span>${tokensPerSecond} tk/s</span>
            `;
            headerDiv.appendChild(statsSpan);

            // Execute tool calls and display results
            for (const toolCall of toolCalls) {
                // Show tool execution
                const toolDiv = document.createElement('div');
                toolDiv.className = 'tool-execution';
                toolDiv.innerHTML = `
                    <div class="tool-execution-header">🔍 Executing: ${toolCall.name}</div>
                    <div class="tool-execution-content">
                        <div class="tool-execution-loading">
                            <div class="tool-spinner"></div>
                            <span>Searching: "${toolCall.query}"</span>
                        </div>
                    </div>
                `;
                contentDiv.appendChild(toolDiv);
                scrollToBottom();

                // Execute the tool
                const toolResult = await executeTool(toolCall.name, { query: toolCall.query });

                // Update with results
                toolDiv.innerHTML = `
                    <div class="tool-execution-header">🔍 Search Results: ${toolCall.name}</div>
                    <div class="tool-execution-content">${escapeHtml(toolResult).replace(/\n/g, '<br>')}</div>
                `;
                scrollToBottom();

                // Add tool result to history
                chatHistory.push({ role: 'system', content: `Tool result for ${toolCall.name}("${toolCall.query}"):\n${toolResult}` });
            }

            // Now continue the conversation - let the AI synthesize the results
            // Create a new assistant message for the synthesis
            const synthesisMessageDiv = createMessageElement('assistant');
            const synthesisContentDiv = synthesisMessageDiv.querySelector('.message-content');
            synthesisContentDiv.innerHTML = '<span class="streaming-cursor"></span>';

            // Show thinking animation
            thinkingAnimation.classList.add('active');
            document.getElementById('typing-indicator').classList.add('active');

            // Make a follow-up API call to let the AI synthesize the results
            try {
                const synthesisResponse = await fetch(`${ollamaUrl}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: chatHistory,
                        stream: true
                    })
                });

                if (!synthesisResponse.ok) {
                    throw new Error(`HTTP error! status: ${synthesisResponse.status}`);
                }

                const synthesisReader = synthesisResponse.body.getReader();
                const synthesisDecoder = new TextDecoder();
                let synthesisBuffer = '';
                let synthesisFullResponse = '';
                let synthesisPromptTokens = 0;
                let synthesisEvalTokens = 0;
                const synthesisStartTime = Date.now();

                while (true) {
                    const { done, value } = await synthesisReader.read();

                    if (done) {
                        if (synthesisBuffer.trim()) {
                            try {
                                const json = JSON.parse(synthesisBuffer);
                                if (json.message && json.message.content) {
                                    synthesisFullResponse += json.message.content;
                                }
                                if (json.prompt_eval_count) synthesisPromptTokens = json.prompt_eval_count;
                                if (json.eval_count) synthesisEvalTokens = json.eval_count;
                            } catch (e) {
                                console.error('Error parsing final synthesis buffer:', e);
                            }
                        }
                        break;
                    }

                    synthesisBuffer += synthesisDecoder.decode(value, { stream: true });
                    const lines = synthesisBuffer.split('\n');
                    synthesisBuffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const json = JSON.parse(line);
                                if (json.message && json.message.content) {
                                    synthesisFullResponse += json.message.content;

                                    try {
                                        synthesisContentDiv.innerHTML = parseMarkdown(synthesisFullResponse) + '<span class="streaming-cursor"></span>';
                                    } catch (parseError) {
                                        synthesisContentDiv.innerHTML = escapeHtml(synthesisFullResponse) + '<span class="streaming-cursor"></span>';
                                    }

                                    scrollToBottom();
                                }

                                if (json.prompt_eval_count) synthesisPromptTokens = json.prompt_eval_count;
                                if (json.eval_count) synthesisEvalTokens = json.eval_count;
                            } catch (e) {
                                console.error('Error parsing synthesis JSON line:', e);
                            }
                        }
                    }
                }

                // Final update for synthesis
                if (synthesisFullResponse) {
                    synthesisContentDiv.innerHTML = parseMarkdown(synthesisFullResponse);
                    chatHistory.push({ role: 'assistant', content: synthesisFullResponse });

                    // Update synthesis message header with stats
                    const synthesisHeaderDiv = synthesisMessageDiv.querySelector('.message-header');
                    const synthesisTotalTokens = synthesisPromptTokens + synthesisEvalTokens;
                    const synthesisElapsedTime = (Date.now() - synthesisStartTime) / 1000;
                    const synthesisTokensPerSecond = synthesisEvalTokens > 0 ? (synthesisEvalTokens / synthesisElapsedTime).toFixed(2) : 0;
                    const synthesisStatsSpan = document.createElement('div');
                    synthesisStatsSpan.className = 'message-stats';
                    synthesisStatsSpan.innerHTML = `
                        <span>${synthesisTotalTokens} tokens</span>
                        <span>${synthesisTokensPerSecond} tk/s</span>
                    `;
                    synthesisHeaderDiv.appendChild(synthesisStatsSpan);
                }

            } catch (synthesisError) {
                console.error('Synthesis error:', synthesisError);
                synthesisContentDiv.innerHTML = `<p style="color: #ff4444;">Error synthesizing results: ${synthesisError.message}</p>`;
            }

            // Done with tool execution and synthesis
            thinkingAnimation.classList.remove('active');
            document.getElementById('typing-indicator').classList.remove('active');
            scrollToBottom();

            return; // Exit after tool execution and synthesis
        }

        // Final update - remove cursor and ensure proper parsing
        if (fullResponse) {
            contentDiv.innerHTML = parseMarkdown(fullResponse);
            chatHistory.push({ role: 'assistant', content: fullResponse });

            // Update message header with stats
            const headerDiv = messageDiv.querySelector('.message-header');
            const statsSpan = document.createElement('div');
            statsSpan.className = 'message-stats';
            statsSpan.innerHTML = `
                <span>${totalTokens} tokens</span>
                <span>${tokensPerSecond} tk/s</span>
            `;
            headerDiv.appendChild(statsSpan);

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

    const roleLabel = document.createElement('span');
    roleLabel.textContent = role === 'user' ? 'You' : role === 'assistant' ? 'AI' : 'System';
    headerDiv.appendChild(roleLabel);

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
