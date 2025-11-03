// Chat history - NOT persisted (fresh on reload)
let chatHistory = [];
let currentTheme = 'dark';
let isGenerating = false;
let isSidebarCollapsed = false;
let activeTools = {
    'web-search': false,
    'file-analysis': false
};
let settings = {
    'auto-clear-file': true // Auto-clear file after analysis by default
};
let debugMode = false; // Debug mode state
let debugPanelCollapsed = false; // Debug panel collapsed state
let currentImage = null; // Store current image data
let currentFile = null; // Store current file data
let currentFileName = ''; // Store current file name
let currentFileType = ''; // Store current file type/extension

// Enhanced state management for file uploads and tools
let appState = {
    file: {
        isUploaded: false,
        isProcessing: false,
        isAnalyzed: false,
        lastAnalysisType: null,
        uploadTimestamp: null,
        metadata: {
            name: '',
            type: '',
            size: 0,
            extension: ''
        }
    },
    tools: {
        available: [],
        active: []
    }
};

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
    SETTINGS: 'ollama_settings',
    SIDEBAR_COLLAPSED: 'ollama_sidebar_collapsed',
    DEBUG_MODE: 'ollama_debug_mode',
    FILE_METADATA: 'ollama_file_metadata'
};

// Application constants
const CONSTANTS = {
    // Token estimation
    TOKEN_CHARS_RATIO: 4,
    TOKEN_WORDS_RATIO: 1.3,

    // File size limits
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    LARGE_FILE_WARNING_SIZE: 5 * 1024 * 1024, // 5MB
    LOADING_INDICATOR_THRESHOLD: 1024 * 1024, // 1MB

    // Search and display
    MAX_SEARCH_RESULTS: 5,
    MAX_PREVIEW_CHARS: 500,
    MAX_PREVIEW_LINES: 10,
    MAX_DEBUG_LOG_ENTRIES: 50,

    // UI timings
    ERROR_NOTIFICATION_DURATION: 5000, // 5 seconds
    FADE_OUT_DURATION: 300, // 300ms
    COPY_BUTTON_TIMEOUT: 2000, // 2 seconds

    // Display sizes
    IMAGE_MAX_WIDTH: '300px',

    // HTTP
    CONTENT_TYPE_JSON: 'application/json'
};

// Tool configuration
const TOOL_CONFIG = {
    // Tool names
    NAMES: {
        WEB_SEARCH: 'web_search',
        FILE_ANALYSIS: 'file_analysis'
    },

    // Tool descriptions
    DESCRIPTIONS: {
        WEB_SEARCH: 'Search the web using DuckDuckGo to find current information, facts, or answers to questions',
        FILE_ANALYSIS: 'Analyze the content of an uploaded file (TXT, PDF, JSON, CSV, MD, JS, TS, PY, JAVA, C, CPP, RS, GO, and more code files)'
    },

    // Supported file extensions
    SUPPORTED_CODE_EXTENSIONS: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'rb', 'php', 'swift', 'kt', 'scala', 'vue'],
    SUPPORTED_DATA_EXTENSIONS: ['json', 'csv', 'xml', 'yaml', 'yml'],
    SUPPORTED_DOC_EXTENSIONS: ['pdf', 'txt', 'md']
};

// Analysis template configuration
const ANALYSIS_TEMPLATES = {
    summarize: {
        name: 'Summarize',
        icon: '📝',
        instruction: 'Provide a concise summary of this file, highlighting the main points and key information.',
        applicableTypes: ['all']
    },
    analyze: {
        name: 'Analyze',
        icon: '🔍',
        instruction: 'Perform a detailed analysis of this file, examining its structure, content, and purpose.',
        applicableTypes: ['all']
    },
    extractData: {
        name: 'Extract Data',
        icon: '📊',
        instruction: 'Extract and organize the key data points, statistics, or structured information from this file.',
        applicableTypes: ['json', 'csv', 'xml', 'yaml', 'yml', 'pdf', 'txt', 'md']
    },
    findErrors: {
        name: 'Find Errors',
        icon: '🐛',
        instruction: 'Identify any errors, bugs, issues, or potential problems in this file.',
        applicableTypes: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'rb', 'php', 'swift', 'kt', 'scala', 'vue', 'json', 'csv']
    },
    validateSchema: {
        name: 'Validate Schema',
        icon: '✅',
        instruction: 'Validate the structure and schema of this file, checking for completeness and correctness.',
        applicableTypes: ['json', 'xml', 'yaml', 'yml']
    },
    explainCode: {
        name: 'Explain Code',
        icon: '💡',
        instruction: 'Explain what this code does, including its purpose, main functions, and how it works.',
        applicableTypes: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'rb', 'php', 'swift', 'kt', 'scala', 'vue']
    },
    statistics: {
        name: 'Statistics',
        icon: '📈',
        instruction: 'Calculate and provide statistical analysis of the data in this file, including patterns, trends, and insights.',
        applicableTypes: ['csv', 'json']
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadFileMetadata(); // Load file metadata from localStorage
    refreshModels();
    checkConnection();
    updateImageButtonVisibility();
    updateFileButtonVisibility();
    setupDragAndDrop();

    // Initialize PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
});

/**
 * Estimate token count for a given text
 * Uses a rough approximation based on words and characters
 * @param {string} text - The text to estimate tokens for
 * @returns {number} Estimated token count
 */
function estimateTokenCount(text) {
    if (!text) return 0;
    // More accurate estimation: count words and characters
    const words = text.trim().split(/\s+/).length;
    const chars = text.length;
    // Average of word-based and char-based estimation
    return Math.ceil((words * CONSTANTS.TOKEN_WORDS_RATIO + chars / CONSTANTS.TOKEN_CHARS_RATIO) / 2);
}

/**
 * Check if the currently selected model supports vision/image input
 * @returns {boolean} True if the model supports vision
 */
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

/**
 * Check if the currently selected model is a thinking/reasoning model
 * @returns {boolean} True if the model is a thinking model
 */
function isThinkingModelSelected() {
    const selectedModel = document.getElementById('model-select').value.toLowerCase();

    // Pattern matching for thinking model names
    const thinkingPatterns = [
        'deepseek-r1',
        'deepseek-reasoner',
        'qwq',
        'qwen',  // Added qwen models
        'r1:',
        '-r1',
        'reasoning',
        'think'
    ];

    return thinkingPatterns.some(pattern => selectedModel.includes(pattern));
}

/**
 * Create a collapsible section UI element
 * @param {string} title - The section title
 * @param {string} content - HTML content to display
 * @param {boolean} collapsed - Whether the section starts collapsed
 * @returns {HTMLElement} The collapsible section element
 */
function createCollapsibleSection(title, content, collapsed = false) {
    const section = document.createElement('div');
    section.className = `collapsible-section ${collapsed ? 'collapsed' : ''}`;

    const header = document.createElement('div');
    header.className = 'collapsible-header';
    header.onclick = () => toggleCollapsible(section);

    const titleDiv = document.createElement('div');
    titleDiv.className = 'collapsible-title';
    titleDiv.textContent = title;

    const toggle = document.createElement('span');
    toggle.className = 'collapsible-toggle';
    toggle.textContent = '▼';

    header.appendChild(titleDiv);
    header.appendChild(toggle);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'collapsible-content';
    contentDiv.innerHTML = content;

    section.appendChild(header);
    section.appendChild(contentDiv);

    return section;
}

/**
 * Format web search results with icons, clickable links, and timestamp
 * @param {string} searchData - JSON string containing search results
 * @returns {string} Formatted HTML for displaying search results
 */
function formatSearchResults(searchData) {
    try {
        const data = JSON.parse(searchData);

        // Handle error case
        if (data.error) {
            return `<div class="search-error">${escapeHtml(data.message)}</div>`;
        }

        const timestamp = new Date(data.timestamp);
        const timeStr = timestamp.toLocaleString();

        let html = `<div class="search-results-container">`;
        html += `<div class="search-metadata">`;
        html += `<div class="search-timestamp">⏰ ${timeStr}</div>`;
        html += `<div class="search-sources">Sources: ${data.sources.map(s => {
            if (s === 'DuckDuckGo') return '🦆 DuckDuckGo';
            if (s === 'Wikipedia') return '📚 Wikipedia';
            return s;
        }).join(', ')}</div>`;
        html += `</div>`;

        data.results.forEach((result, index) => {
            const sourceIcon = result.source === 'Wikipedia' ? '📚' : '🦆';
            html += `<div class="search-result-item">`;
            html += `<div class="search-result-header">`;
            html += `<span class="search-result-number">${index + 1}.</span>`;
            html += `<span class="search-result-source" title="${result.source}">${sourceIcon}</span>`;
            html += `<span class="search-result-title">${escapeHtml(result.title)}</span>`;
            html += `</div>`;
            html += `<div class="search-result-snippet">${escapeHtml(result.snippet)}</div>`;
            if (result.url) {
                html += `<div class="search-result-url">`;
                html += `🔗 <a href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(result.url)}</a>`;
                html += `</div>`;
            }
            html += `</div>`;
        });

        html += `</div>`;
        return html;
    } catch (error) {
        console.error('Error formatting search results:', error);
        return escapeHtml(searchData).replace(/\n/g, '<br>');
    }
}

/**
 * Create a thinking box (yellow collapsible section for thinking models)
 * @param {string} content - HTML content to display
 * @param {boolean} collapsed - Whether the box starts collapsed
 * @returns {HTMLElement} The thinking box element
 */
function createThinkingBox(content, collapsed = false) {
    const box = document.createElement('div');
    box.className = `thinking-box ${collapsed ? 'collapsed' : ''}`;

    const header = document.createElement('div');
    header.className = 'thinking-header';
    header.onclick = () => toggleCollapsible(box);

    const titleDiv = document.createElement('div');
    titleDiv.className = 'thinking-title';
    titleDiv.innerHTML = '🧠 Thinking Process';

    const toggle = document.createElement('span');
    toggle.className = 'thinking-toggle';
    toggle.textContent = '▼';

    header.appendChild(titleDiv);
    header.appendChild(toggle);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'thinking-content';
    contentDiv.innerHTML = content;

    box.appendChild(header);
    box.appendChild(contentDiv);

    return box;
}

/**
 * Toggle the collapsed state of a collapsible element
 * @param {HTMLElement} element - The collapsible element to toggle
 */
function toggleCollapsible(element) {
    element.classList.toggle('collapsed');
}

/**
 * Parse thinking tags from AI response text
 * @param {string} text - The text to parse
 * @returns {Object} Object with thinking sections and cleaned response
 */
function parseThinking(text) {
    const thinkPattern = /<think>([\s\S]*?)<\/think>/gi;
    let match;
    const thinkingSections = [];
    let cleanedText = text;

    while ((match = thinkPattern.exec(text)) !== null) {
        thinkingSections.push(match[1].trim());
    }

    // Remove thinking tags from the main text
    cleanedText = text.replace(thinkPattern, '').trim();

    return {
        thinking: thinkingSections,
        response: cleanedText
    };
}

/**
 * Update image button visibility based on whether the selected model supports vision
 */
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

/**
 * Handle image file upload from input
 * @param {Event} event - The file input change event
 */
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

/**
 * Remove the currently uploaded image and clear the preview
 */
function removeImage() {
    currentImage = null;
    const preview = document.getElementById('image-preview');
    preview.style.display = 'none';
    document.getElementById('image-input').value = '';
}

/**
 * Get applicable analysis templates for a file type
 * @param {string} fileType - The file extension
 * @returns {Array} Array of applicable template objects
 */
function getApplicableTemplates(fileType) {
    const templates = [];
    for (const [key, template] of Object.entries(ANALYSIS_TEMPLATES)) {
        if (template.applicableTypes.includes('all') || template.applicableTypes.includes(fileType.toLowerCase())) {
            templates.push({ key, ...template });
        }
    }
    return templates;
}

/**
 * Create quick action buttons for file analysis
 * @param {string} fileType - The file extension
 * @returns {HTMLElement} Container with quick action buttons
 */
function createQuickActionButtons(fileType) {
    const container = document.createElement('div');
    container.className = 'file-quick-actions';
    container.id = 'file-quick-actions';

    const templates = getApplicableTemplates(fileType);

    // Limit to top 3 most relevant templates
    const topTemplates = templates.slice(0, 3);

    topTemplates.forEach(template => {
        const button = document.createElement('button');
        button.className = 'quick-action-btn';
        button.innerHTML = `${template.icon} ${template.name}`;
        button.title = template.instruction;
        button.onclick = () => executeQuickAnalysis(template.key);
        container.appendChild(button);
    });

    return container;
}

/**
 * Execute a quick analysis using a template
 * @param {string} templateKey - The template key to use
 */
async function executeQuickAnalysis(templateKey) {
    const template = ANALYSIS_TEMPLATES[templateKey];
    if (!template) return;

    // Validate that a file has been uploaded
    if (!currentFile || !currentFileName) {
        alert('Please upload a file before using quick analysis.');
        return;
    }

    // Update state
    appState.file.isAnalyzed = true;
    appState.file.lastAnalysisType = templateKey;

    // Check if file analysis tool is enabled
    const fileAnalysisEnabled = activeTools && activeTools['file-analysis'];

    if (fileAnalysisEnabled) {
        // Use the file_analysis tool by instructing the AI to use it
        const chatInput = document.getElementById('chat-input');
        chatInput.value = `Please analyze the uploaded file "${currentFileName}" and: ${template.instruction}`;
    } else {
        // If tool is not enabled, directly include file content in the message
        const chatInput = document.getElementById('chat-input');
        const filePreview = currentFile.length > 10000
            ? currentFile.substring(0, 10000) + '\n\n[... file truncated ...]'
            : currentFile;

        chatInput.value = `File: ${currentFileName}\n\nContent:\n\`\`\`\n${filePreview}\n\`\`\`\n\n${template.instruction}`;
    }

    // Send the message
    await sendMessage();
}

/**
 * Update application state for file upload
 * @param {Object} fileData - File metadata
 */
function updateFileState(fileData) {
    appState.file = {
        isUploaded: true,
        isProcessing: false,
        isAnalyzed: false,
        lastAnalysisType: null,
        uploadTimestamp: Date.now(),
        metadata: {
            name: fileData.name,
            type: fileData.type,
            size: fileData.size,
            extension: fileData.extension
        }
    };

    // Save metadata to localStorage (not content)
    saveFileMetadata();
}

/**
 * Save file metadata to localStorage
 */
function saveFileMetadata() {
    try {
        const metadata = {
            ...appState.file.metadata,
            uploadTimestamp: appState.file.uploadTimestamp,
            lastAnalysisType: appState.file.lastAnalysisType
        };
        localStorage.setItem(STORAGE_KEYS.FILE_METADATA, JSON.stringify(metadata));
    } catch (error) {
        console.error('Error saving file metadata:', error);
    }
}

/**
 * Load file metadata from localStorage
 */
function loadFileMetadata() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.FILE_METADATA);
        if (saved) {
            const metadata = JSON.parse(saved);
            addDebugLog('Loaded file metadata from localStorage', 'info', JSON.stringify(metadata, null, 2));
        }
    } catch (error) {
        console.error('Error loading file metadata:', error);
    }
}

/**
 * Reset file state
 */
function resetFileState() {
    appState.file = {
        isUploaded: false,
        isProcessing: false,
        isAnalyzed: false,
        lastAnalysisType: null,
        uploadTimestamp: null,
        metadata: {
            name: '',
            type: '',
            size: 0,
            extension: ''
        }
    };

    // Clear localStorage metadata
    try {
        localStorage.removeItem(STORAGE_KEYS.FILE_METADATA);
    } catch (error) {
        console.error('Error clearing file metadata:', error);
    }
}

/**
 * Get an emoji icon for a file based on its extension
 * @param {string} extension - The file extension
 * @returns {string} An emoji icon representing the file type
 */
function getFileIcon(extension) {
    const ext = extension.toLowerCase();

    // Code files
    const codeIcons = {
        'js': '📜', 'jsx': '⚛️', 'ts': '📘', 'tsx': '⚛️',
        'py': '🐍', 'java': '☕', 'c': '©️', 'cpp': '⚙️',
        'rs': '🦀', 'go': '🔷', 'rb': '💎', 'php': '🐘',
        'swift': '🐦', 'kt': '🟣', 'scala': '🔴',
        'html': '🌐', 'css': '🎨', 'vue': '💚'
    };

    // Data files
    const dataIcons = {
        'json': '📊', 'csv': '📈', 'xml': '📰',
        'yaml': '⚙️', 'yml': '⚙️'
    };

    // Document files
    const docIcons = {
        'pdf': '📕', 'txt': '📄', 'md': '📝'
    };

    return codeIcons[ext] || dataIcons[ext] || docIcons[ext] || '📄';
}

/**
 * Show error message notification in UI
 * @param {string} message - The error message to display
 * @param {number} duration - Duration in milliseconds before auto-dismiss (0 = no auto-dismiss)
 */
function showErrorMessage(message, duration = CONSTANTS.ERROR_NOTIFICATION_DURATION) {
    // Create error notification element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `
        <span class="error-icon">⚠️</span>
        <span class="error-text">${message}</span>
        <button class="error-close" onclick="this.parentElement.remove()">×</button>
    `;

    // Add to container
    const container = document.querySelector('.chat-input-container');
    container.insertBefore(errorDiv, container.firstChild);

    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.classList.add('fade-out');
                setTimeout(() => errorDiv.remove(), CONSTANTS.FADE_OUT_DURATION);
            }
        }, duration);
    }
}

/**
 * Show loading indicator during file processing
 * @param {string} message - The loading message to display
 */
function showLoadingIndicator(message = 'Processing file...') {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'file-loading-indicator';
    loadingDiv.className = 'file-loading-indicator';
    loadingDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <span class="loading-text">${message}</span>
    `;

    const filePreview = document.getElementById('file-preview');
    filePreview.appendChild(loadingDiv);
}

/**
 * Hide and remove the file loading indicator
 */
function hideLoadingIndicator() {
    const loadingDiv = document.getElementById('file-loading-indicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

/**
 * Extract text content from a PDF file
 * @param {File} file - The PDF file to extract text from
 * @returns {Promise<Object>} Object containing extracted text and page count
 */
async function extractPdfText(file) {
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js library not loaded. Cannot process PDF files.');
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        const numPages = pdf.numPages;

        // Extract text from each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
        }

        return {
            text: fullText.trim(),
            pageCount: numPages
        };
    } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error(`Failed to extract PDF text: ${error.message}`);
    }
}

/**
 * Get syntax highlighting language name from file extension
 * @param {string} extension - The file extension
 * @returns {string} The language name for syntax highlighting
 */
function getSyntaxLanguage(extension) {
    const ext = extension.toLowerCase();

    const langMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'py': 'python',
        'rb': 'ruby',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'rs': 'rust',
        'go': 'go',
        'php': 'php',
        'swift': 'swift',
        'kt': 'kotlin',
        'scala': 'scala',
        'html': 'html',
        'css': 'css',
        'vue': 'vue',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yaml',
        'yml': 'yaml',
        'md': 'markdown'
    };

    return langMap[ext] || 'text';
}

/**
 * Update file button visibility based on whether file analysis tool is enabled
 */
function updateFileButtonVisibility() {
    const fileButton = document.getElementById('file-button');
    if (activeTools['file-analysis']) {
        fileButton.style.display = 'flex';
    } else {
        fileButton.style.display = 'none';
        // Clear any uploaded file if disabling file analysis
        if (currentFile) {
            removeFile();
        }
    }
}

/**
 * Handle file upload from input element
 * @param {Event} event - The file input change event
 */
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        // Get file extension
        const extension = file.name.split('.').pop().toLowerCase();
        currentFileName = file.name;
        currentFileType = extension;

        // File size validation with warnings
        const fileSize = file.size;

        // Show warning for large files
        if (fileSize > CONSTANTS.LARGE_FILE_WARNING_SIZE && fileSize <= CONSTANTS.MAX_FILE_SIZE) {
            const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
            showErrorMessage(`⚠️ Large file detected (${sizeInMB}MB). Processing may take longer.`, 4000);
        }

        // Block files over maximum size
        if (fileSize > CONSTANTS.MAX_FILE_SIZE) {
            const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
            showErrorMessage(`❌ File too large (${sizeInMB}MB). Maximum size is ${CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB.`, 6000);
            event.target.value = ''; // Reset input
            return;
        }

        // Show preview immediately with icon
        const preview = document.getElementById('file-preview');
        const fileName = document.getElementById('file-name');
        const fileSizeDisplay = document.getElementById('file-size');
        const fileIcon = preview.querySelector('.file-icon');

        fileName.textContent = file.name;
        fileSizeDisplay.textContent = formatFileSize(fileSize);
        fileIcon.textContent = getFileIcon(extension);
        preview.style.display = 'flex';

        // Show loading indicator for large files or PDFs
        if (fileSize > CONSTANTS.LOADING_INDICATOR_THRESHOLD || extension === 'pdf') {
            showLoadingIndicator(extension === 'pdf' ? 'Extracting PDF text...' : 'Reading file...');
        }

        // Process file based on type
        if (extension === 'pdf') {
            try {
                addDebugLog(`Processing PDF file: ${file.name}`, 'file-operation', `Size: ${formatFileSize(fileSize)}`);
                const pdfData = await extractPdfText(file);
                currentFile = pdfData.text;

                hideLoadingIndicator();

                // Show success message
                showErrorMessage(`✅ PDF loaded successfully (${pdfData.pageCount} pages)`, 3000);
                addDebugLog(`PDF loaded successfully: ${pdfData.pageCount} pages`, 'file-operation', `File: ${file.name}\nSize: ${formatFileSize(fileSize)}\nContent length: ${currentFile.length} chars`);
            } catch (pdfError) {
                hideLoadingIndicator();
                console.error('PDF processing error:', pdfError);
                showErrorMessage(`❌ PDF Error: ${pdfError.message}`, 6000);
                removeFile();
                event.target.value = '';
                return;
            }
        } else {
            // Read as text for other file types
            const reader = new FileReader();

            reader.onerror = function(e) {
                hideLoadingIndicator();
                console.error('File reading error:', e);
                showErrorMessage('❌ Failed to read file. Please try again.', 5000);
                removeFile();
                event.target.value = '';
            };

            reader.onload = function(e) {
                try {
                    currentFile = e.target.result;
                    hideLoadingIndicator();

                    // Validate that file has content
                    if (!currentFile || currentFile.trim().length === 0) {
                        showErrorMessage('⚠️ Warning: File appears to be empty.', 4000);
                    }

                    addDebugLog(`File loaded successfully`, 'file-operation', `File: ${file.name}\nType: ${extension}\nSize: ${formatFileSize(fileSize)}\nContent length: ${currentFile.length} chars`);
                } catch (error) {
                    hideLoadingIndicator();
                    console.error('File processing error:', error);
                    showErrorMessage(`❌ Error processing file: ${error.message}`, 5000);
                    removeFile();
                    event.target.value = '';
                }
            };

            // Read as text for all supported file types
            reader.readAsText(file);
        }

        // Update file button visual indicators
        const fileButton = document.getElementById('file-button');
        const fileReadyBadge = document.getElementById('file-ready-badge');

        fileButton.classList.add('has-file');
        fileButton.title = `File ready: ${file.name}`;
        fileReadyBadge.classList.add('active');

        // Update application state
        updateFileState({
            name: file.name,
            type: file.type,
            size: fileSize,
            extension: extension
        });

        // Add quick action buttons to file preview
        const existingActions = document.getElementById('file-quick-actions');
        if (existingActions) {
            existingActions.remove();
        }

        const quickActions = createQuickActionButtons(extension);
        preview.appendChild(quickActions);

    } catch (error) {
        hideLoadingIndicator();
        console.error('File upload error:', error);
        showErrorMessage(`❌ Upload failed: ${error.message}`, 5000);
        removeFile();
        event.target.value = '';
    }
}

/**
 * Remove the currently uploaded file and clear the preview
 */
function removeFile() {
    const removedFileName = currentFileName;
    addDebugLog(`Removing file: ${removedFileName}`, 'file-operation');

    currentFile = null;
    currentFileName = '';
    currentFileType = '';
    const preview = document.getElementById('file-preview');
    preview.style.display = 'none';
    document.getElementById('file-input').value = '';

    // Remove any loading indicators
    hideLoadingIndicator();

    // Remove quick action buttons
    const quickActions = document.getElementById('file-quick-actions');
    if (quickActions) {
        quickActions.remove();
    }

    // Reset file button visual indicators
    const fileButton = document.getElementById('file-button');
    const fileReadyBadge = document.getElementById('file-ready-badge');

    fileButton.classList.remove('has-file');
    fileButton.title = 'Upload a file for analysis';
    fileReadyBadge.classList.remove('active');

    // Reset application state
    resetFileState();
}

/**
 * Format file size in bytes to a human-readable string
 * @param {number} bytes - The file size in bytes
 * @returns {string} Formatted file size (e.g., "1.5 MB")
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

    // Load settings
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
        try {
            settings = JSON.parse(savedSettings);
            // Update UI for settings
            Object.keys(settings).forEach(settingName => {
                if (settings[settingName]) {
                    const checkbox = document.getElementById('setting-' + settingName);
                    if (checkbox) {
                        checkbox.classList.add('checked');
                    }
                }
            });
        } catch (e) {
            console.error('Error loading settings:', e);
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

    // Load debug mode state
    const savedDebugMode = localStorage.getItem(STORAGE_KEYS.DEBUG_MODE);
    if (savedDebugMode === 'true') {
        debugMode = true;
        const debugPanel = document.getElementById('debug-panel');
        const debugCheckbox = document.getElementById('debug-mode');
        if (debugPanel) debugPanel.style.display = 'flex';
        if (debugCheckbox) debugCheckbox.checked = true;
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
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, isSidebarCollapsed);
    localStorage.setItem(STORAGE_KEYS.DEBUG_MODE, debugMode);
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

// Debug Mode Functions
function toggleDebugMode() {
    debugMode = !debugMode;
    const debugPanel = document.getElementById('debug-panel');
    const debugCheckbox = document.getElementById('debug-mode');

    if (debugMode) {
        debugPanel.style.display = 'flex';
        addDebugLog('Debug mode enabled', 'system');
        debugCheckbox.checked = true;
    } else {
        debugPanel.style.display = 'none';
        debugCheckbox.checked = false;
    }

    saveSettings();
}

function toggleDebugPanel() {
    debugPanelCollapsed = !debugPanelCollapsed;
    const debugPanel = document.getElementById('debug-panel');

    if (debugPanelCollapsed) {
        debugPanel.classList.add('collapsed');
    } else {
        debugPanel.classList.remove('collapsed');
    }
}

function clearDebugLogs() {
    const debugLogs = document.getElementById('debug-logs');
    debugLogs.innerHTML = '<div class="debug-entry"><div class="debug-entry-content" style="color: var(--text-secondary); font-style: italic;">Debug logs cleared</div></div>';
}

function addDebugLog(message, type = 'info', data = null) {
    if (!debugMode) return;

    const debugLogs = document.getElementById('debug-logs');
    const timestamp = new Date().toLocaleTimeString();

    const entry = document.createElement('div');
    entry.className = `debug-entry ${type}`;

    let typeLabel = type.toUpperCase();
    if (type === 'tool-call') typeLabel = '🔧 TOOL CALL';
    else if (type === 'api-response') typeLabel = '📡 API RESPONSE';
    else if (type === 'file-operation') typeLabel = '📁 FILE OPERATION';
    else if (type === 'error') typeLabel = '❌ ERROR';
    else if (type === 'system') typeLabel = '⚙️ SYSTEM';

    entry.innerHTML = `
        <div class="debug-entry-timestamp">${timestamp}</div>
        <div class="debug-entry-type">${typeLabel}</div>
        <div class="debug-entry-content">${escapeHtml(message)}</div>
    `;

    if (data) {
        const dataDiv = document.createElement('div');
        dataDiv.className = 'debug-entry-content';
        dataDiv.style.marginTop = '6px';
        dataDiv.style.padding = '6px';
        dataDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        dataDiv.style.borderRadius = '3px';
        dataDiv.style.fontSize = '10px';
        dataDiv.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        entry.appendChild(dataDiv);
    }

    debugLogs.insertBefore(entry, debugLogs.firstChild);

    // Limit to maximum entries
    while (debugLogs.children.length > CONSTANTS.MAX_DEBUG_LOG_ENTRIES) {
        debugLogs.removeChild(debugLogs.lastChild);
    }
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

    // Update file button visibility if file-analysis tool is toggled
    if (toolName === 'file-analysis') {
        updateFileButtonVisibility();
    }

    // Update badge
    updateToolsBadge();
    saveSettings();
}

// Toggle Setting
function toggleSetting(settingName) {
    settings[settingName] = !settings[settingName];
    const checkbox = document.getElementById('setting-' + settingName);

    if (settings[settingName]) {
        checkbox.classList.add('checked');
    } else {
        checkbox.classList.remove('checked');
    }

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

        // Provide more detailed error messages with troubleshooting
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            statusText.textContent = 'CORS Error';
            console.error('CORS error - Ollama needs CORS enabled.');
            console.error('Error details:', error);

            // Show user-friendly error message with detailed troubleshooting
            if (document.getElementById('chat-messages').children.length === 0) {
                addMessage('system', `⚠️ **Connection Failed: CORS Error**\n\nOllama is blocking the connection due to CORS (Cross-Origin Resource Sharing) restrictions.\n\n**Quick Fix Guide:**\n\n**Option 1: Start Ollama with CORS Enabled**\n\`\`\`bash\n# macOS/Linux\nOLLAMA_ORIGINS="*" ollama serve\n\n# Windows PowerShell\n$env:OLLAMA_ORIGINS="*"\nollama serve\n\n# Windows CMD\nset OLLAMA_ORIGINS=*\nollama serve\n\`\`\`\n\n**Option 2: Set Environment Variable Permanently**\n\`\`\`bash\n# macOS/Linux (add to ~/.bashrc or ~/.zshrc)\nexport OLLAMA_ORIGINS="*"\n\n# Windows (System Properties > Environment Variables)\nVariable: OLLAMA_ORIGINS\nValue: *\n\`\`\`\n\n**Troubleshooting Steps:**\n1. Stop any running Ollama processes\n2. Start Ollama with the environment variable set\n3. Verify Ollama is running: \`ollama list\`\n4. Click **Refresh Models** button above\n5. If still failing, try restarting your browser\n\n**Common Issues:**\n- Firewall blocking port 11434\n- Ollama not running as a service\n- Multiple Ollama instances running\n- Browser cache (try hard refresh: Ctrl+Shift+R)\n\n**Need Help?** Visit: https://github.com/ollama/ollama/blob/main/docs/faq.md#how-do-i-configure-ollama-server`);
            }
        } else {
            statusText.textContent = 'Connection Failed';
            console.error('Connection error:', error);

            // Show generic connection error
            if (document.getElementById('chat-messages').children.length === 0) {
                addMessage('system', `⚠️ **Connection Failed**\n\nUnable to connect to Ollama server.\n\n**Error:** ${error.message}\n\n**Checklist:**\n- Is Ollama installed? Download: https://ollama.ai\n- Is Ollama running? Check with: \`ollama list\`\n- Is the URL correct? Currently: \`${ollamaUrl}\`\n- Try clicking **Refresh Models** after starting Ollama`);
            }
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

        // Provide detailed error information with troubleshooting steps
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            // CORS error - show detailed troubleshooting
            addMessage('system', `⚠️ **CORS Configuration Error**\n\nCannot connect to Ollama due to CORS (Cross-Origin Resource Sharing) restrictions.\n\n**Quick Fix:**\n\n**Option 1: Environment Variable (Recommended)**\n\`\`\`bash\n# macOS/Linux\nOLLAMA_ORIGINS="*" ollama serve\n\n# Windows PowerShell\n$env:OLLAMA_ORIGINS="*"\nollama serve\n\n# Windows CMD\nset OLLAMA_ORIGINS=*\nollama serve\n\`\`\`\n\n**Option 2: Restart Ollama Service**\n\`\`\`bash\n# Stop Ollama\nkillall ollama  # or: pkill ollama\n\n# Start with CORS enabled\nOLLAMA_ORIGINS="*" ollama serve\n\`\`\`\n\n**Troubleshooting:**\n- Make sure Ollama is running: \`ollama list\`\n- Check the URL: \`${ollamaUrl}\`\n- Try restarting your browser\n- Verify firewall settings\n\n**After fixing**, click **Refresh Models** to reconnect.`);
        } else {
            addMessage('system', `⚠️ **Connection Error**\n\nCould not connect to Ollama at \`${ollamaUrl}\`\n\n**Checklist:**\n1. ✓ Ollama is installed and running\n2. ✓ Ollama started with CORS enabled\n3. ✓ The URL is correct (default: http://localhost:11434)\n4. ✓ No firewall blocking the connection\n\n**Error Details:** ${error.message}`);
        }
    }
}

// Clear Chat
function clearChat() {
    chatHistory = [];
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';

    // Reset file state when clearing chat
    if (currentFile) {
        removeFile();
    }

    // Reset application state
    resetFileState();
}

// ============================================================================
// TOOLS SYSTEM
// ============================================================================
// This section contains all tool-related functions including:
// - Web search (DuckDuckGo and Wikipedia)
// - File analysis
// - Tool execution and parsing
// - Tool prompt generation
// ============================================================================

/**
 * Search DuckDuckGo for web results (primary search provider)
 * @param {string} query - The search query
 * @returns {Promise<Array>} Array of search results with title, snippet, and URL
 */
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

        // Extract up to maximum search results
        for (let i = 0; i < Math.min(resultElements.length, CONSTANTS.MAX_SEARCH_RESULTS); i++) {
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

/**
 * Search Wikipedia API for factual information (fallback search provider)
 * @param {string} query - The search query
 * @returns {Promise<Array>} Array of Wikipedia search results with title, snippet, and URL
 */
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

/**
 * Combined web search function with fallback mechanism
 * Tries DuckDuckGo first, falls back to Wikipedia if needed
 * @param {string} query - The search query
 * @returns {Promise<string>} JSON string containing search results with metadata
 */
async function webSearch(query) {
    try {
        let allResults = [];
        let searchSources = [];
        const searchTimestamp = new Date().toISOString();

        // Primary: Try DuckDuckGo HTML search
        console.log('Searching DuckDuckGo for:', query);
        const ddgResults = await searchDuckDuckGo(query);

        if (ddgResults.length > 0) {
            // Tag results with source
            ddgResults.forEach(result => result.source = 'DuckDuckGo');
            allResults = allResults.concat(ddgResults);
            searchSources.push('DuckDuckGo');
        }

        // Fallback: If DDG returns no results or very few, also try Wikipedia
        if (ddgResults.length < 2) {
            console.log('DuckDuckGo returned limited results, trying Wikipedia fallback...');
            const wikiResults = await searchWikipedia(query);

            if (wikiResults.length > 0) {
                // Tag results with source
                wikiResults.forEach(result => result.source = 'Wikipedia');
                allResults = allResults.concat(wikiResults);
                searchSources.push('Wikipedia');
            }
        }

        // If still no results, return error message
        if (allResults.length === 0) {
            return JSON.stringify({
                query: query,
                timestamp: searchTimestamp,
                error: true,
                message: `No results found for "${query}". Try rephrasing your search query or being more specific.`
            });
        }

        // Return structured data with timestamp
        return JSON.stringify({
            query: query,
            timestamp: searchTimestamp,
            sources: searchSources,
            results: allResults
        });
    } catch (error) {
        console.error('Web search error:', error);
        return JSON.stringify({
            query: query,
            timestamp: new Date().toISOString(),
            error: true,
            message: `Error performing web search: ${error.message}`
        });
    }
}

/**
 * Analyze an uploaded file and return formatted analysis results
 * Supports various file types including code files, PDFs, JSON, CSV, and text files
 * @param {Object} params - Parameters object
 * @param {string} params.instruction - Optional instruction for how to analyze the file
 * @returns {Promise<string>} Formatted analysis results as a string
 */
async function analyzeFile(params) {
    try {
        // Validate that a file has been uploaded
        if (!currentFile) {
            return 'Error: No file has been uploaded. Please upload a file using the file upload button (📎) before requesting file analysis.';
        }

        if (!currentFileName) {
            return 'Error: File name is missing. Please re-upload the file.';
        }

        // Get the optional instruction parameter
        const instruction = params && params.instruction ? params.instruction : '';

        const fileExtension = currentFileType || currentFileName.split('.').pop().toLowerCase();
        const syntaxLang = getSyntaxLanguage(fileExtension);

        let analysis = `File Analysis Results\n`;
        analysis += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        analysis += `📄 Filename: ${currentFileName}\n`;
        analysis += `📋 File Type: ${fileExtension.toUpperCase()}\n`;
        analysis += `🎨 Syntax: ${syntaxLang}\n`;
        analysis += `📏 Size: ${formatFileSize(currentFile.length)}\n`;

        if (instruction) {
            analysis += `📝 Instruction: ${instruction}\n`;
        }

        analysis += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        // Parse based on file type
        if (fileExtension === 'json') {
            try {
                const parsed = JSON.parse(currentFile);
                analysis += `✅ Content Type: JSON (Valid)\n`;
                analysis += `🔍 Structure Analysis:\n`;
                analysis += `  - Top-level type: ${Array.isArray(parsed) ? 'Array' : 'Object'}\n`;

                if (Array.isArray(parsed)) {
                    analysis += `  - Array length: ${parsed.length}\n`;
                    if (parsed.length > 0) {
                        analysis += `  - First element type: ${typeof parsed[0]}\n`;
                        if (typeof parsed[0] === 'object' && parsed[0] !== null) {
                            analysis += `  - Keys in first element: ${Object.keys(parsed[0]).join(', ')}\n`;
                        }
                    }
                } else {
                    const keys = Object.keys(parsed);
                    analysis += `  - Object keys: ${keys.length}\n`;
                    analysis += `  - Keys: ${keys.join(', ')}\n`;

                    // Analyze nested structure
                    let nestedObjects = 0;
                    let nestedArrays = 0;
                    for (const key of keys) {
                        if (Array.isArray(parsed[key])) nestedArrays++;
                        else if (typeof parsed[key] === 'object' && parsed[key] !== null) nestedObjects++;
                    }
                    if (nestedObjects > 0) analysis += `  - Nested objects: ${nestedObjects}\n`;
                    if (nestedArrays > 0) analysis += `  - Nested arrays: ${nestedArrays}\n`;
                }

                // Schema validation
                analysis += `\n✅ Schema Validation:\n`;
                analysis += `  - Valid JSON syntax: Yes\n`;
                analysis += `  - Well-formed: Yes\n`;

                // Type consistency check for arrays
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const types = new Set(parsed.map(item => typeof item));
                    analysis += `  - Array type consistency: ${types.size === 1 ? 'Consistent' : 'Mixed types'}\n`;
                }

                analysis += `\n📊 Formatted JSON:\n`;
                analysis += `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\`\n`;
            } catch (e) {
                analysis += `❌ Error: Invalid JSON format\n`;
                analysis += `  - ${e.message}\n\n`;
                analysis += `🔍 Error Details:\n`;
                analysis += `  - Line/Column: ${e.message.match(/position (\d+)/) ? e.message : 'Unknown'}\n`;
                analysis += `\n📄 Raw content (first 500 chars):\n${currentFile.substring(0, 500)}\n`;
            }
        } else if (fileExtension === 'csv') {
            const lines = currentFile.split('\n').filter(line => line.trim());
            analysis += `✅ Content Type: CSV (Comma-Separated Values)\n`;
            analysis += `📊 Data Analysis:\n`;
            analysis += `  - Total rows: ${lines.length}\n`;

            if (lines.length > 0) {
                const headers = lines[0].split(',').map(h => h.trim());
                const columns = headers.length;
                analysis += `  - Columns: ${columns}\n`;
                analysis += `  - Data rows: ${lines.length - 1}\n`;
                analysis += `  - Column headers: ${headers.join(', ')}\n`;

                // Statistical analysis
                if (lines.length > 1) {
                    analysis += `\n📈 Statistical Analysis:\n`;

                    // Analyze each column
                    const columnData = headers.map(() => []);
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.trim());
                        values.forEach((val, idx) => {
                            if (idx < columnData.length) {
                                columnData[idx].push(val);
                            }
                        });
                    }

                    // Check for numeric columns and calculate stats
                    headers.forEach((header, idx) => {
                        const values = columnData[idx];
                        const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));

                        if (numericValues.length > 0 && numericValues.length === values.length) {
                            const sum = numericValues.reduce((a, b) => a + b, 0);
                            const avg = sum / numericValues.length;
                            const min = Math.min(...numericValues);
                            const max = Math.max(...numericValues);

                            analysis += `  - "${header}": Numeric (Min: ${min}, Max: ${max}, Avg: ${avg.toFixed(2)})\n`;
                        } else {
                            const uniqueValues = new Set(values);
                            analysis += `  - "${header}": Text (${uniqueValues.size} unique values)\n`;
                        }
                    });
                }

                analysis += `\n📋 Preview (first 10 rows):\n`;
                analysis += `\`\`\`csv\n${lines.slice(0, 10).join('\n')}\n\`\`\`\n`;
            } else {
                analysis += `\n⚠️ Warning: File appears to be empty\n`;
            }
        } else if (fileExtension === 'pdf') {
            const lines = currentFile.split('\n');
            const words = currentFile.split(/\s+/).filter(w => w.length > 0);
            analysis += `✅ Content Type: PDF (Extracted Text)\n`;
            analysis += `📊 Content Analysis:\n`;
            analysis += `  - Total lines: ${lines.length}\n`;
            analysis += `  - Total words: ${words.length}\n`;
            analysis += `  - Total characters: ${currentFile.length}\n\n`;

            if (currentFile.length > 0) {
                analysis += `📄 Extracted Text:\n${currentFile}\n`;
            } else {
                analysis += `⚠️ Warning: No text could be extracted from PDF\n`;
            }
        } else if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'rb', 'php', 'swift', 'kt', 'scala', 'vue'].includes(fileExtension)) {
            // Code files with syntax highlighting hints
            const lines = currentFile.split('\n');
            const words = currentFile.split(/\s+/).filter(w => w.length > 0);
            const nonEmptyLines = lines.filter(l => l.trim());
            const commentLines = lines.filter(l => {
                const trimmed = l.trim();
                return trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*');
            });

            analysis += `✅ Content Type: ${syntaxLang.toUpperCase()} Code\n`;
            analysis += `📊 Code Analysis:\n`;
            analysis += `  - Total lines: ${lines.length}\n`;
            analysis += `  - Code lines: ${nonEmptyLines.length}\n`;
            analysis += `  - Comment lines: ${commentLines.length}\n`;
            analysis += `  - Total words: ${words.length}\n`;
            analysis += `  - Total characters: ${currentFile.length}\n`;
            analysis += `  - Syntax highlighting: ${syntaxLang}\n`;

            // Code quality checks
            const issues = [];

            // Check for common issues based on language
            if (['js', 'jsx', 'ts', 'tsx'].includes(fileExtension)) {
                if (currentFile.includes('console.log')) {
                    issues.push('Console.log statements detected (consider removing for production)');
                }
                if (currentFile.includes('debugger')) {
                    issues.push('Debugger statements detected');
                }
                if (currentFile.match(/var\s+\w+/)) {
                    issues.push('Use of "var" detected (consider using "let" or "const")');
                }
                if (currentFile.includes('== ') && !currentFile.includes('===')) {
                    issues.push('Loose equality (==) detected (consider using strict equality ===)');
                }
            } else if (fileExtension === 'py') {
                if (currentFile.includes('print(')) {
                    issues.push('Print statements detected (consider using logging)');
                }
                if (currentFile.match(/except:/)) {
                    issues.push('Bare except clauses detected (specify exception types)');
                }
            }

            // Check for TODO/FIXME comments
            const todoMatches = currentFile.match(/TODO|FIXME|HACK|XXX/gi);
            if (todoMatches) {
                issues.push(`${todoMatches.length} TODO/FIXME comments found`);
            }

            // Check for very long lines
            const longLines = lines.filter(l => l.length > 120);
            if (longLines.length > 0) {
                issues.push(`${longLines.length} lines exceed 120 characters`);
            }

            if (issues.length > 0) {
                analysis += `\n🐛 Potential Issues:\n`;
                issues.forEach(issue => {
                    analysis += `  - ${issue}\n`;
                });
            }

            // Function/class detection
            const functions = currentFile.match(/function\s+\w+|const\s+\w+\s*=\s*\(|def\s+\w+|class\s+\w+/g);
            if (functions && functions.length > 0) {
                analysis += `\n🔍 Code Structure:\n`;
                analysis += `  - Functions/Classes detected: ${functions.length}\n`;
            }

            analysis += `\n💻 Source Code:\n`;
            if (currentFile.length > 0) {
                analysis += `\`\`\`${syntaxLang}\n${currentFile}\n\`\`\`\n`;
            } else {
                analysis += `⚠️ Warning: File appears to be empty\n`;
            }
        } else {
            // Plain text files
            const lines = currentFile.split('\n');
            const words = currentFile.split(/\s+/).filter(w => w.length > 0);
            analysis += `✅ Content Type: Text Document\n`;
            analysis += `📊 Content Analysis:\n`;
            analysis += `  - Total lines: ${lines.length}\n`;
            analysis += `  - Total words: ${words.length}\n`;
            analysis += `  - Total characters: ${currentFile.length}\n\n`;

            if (currentFile.length > 0) {
                analysis += `📄 Content:\n${currentFile}\n`;
            } else {
                analysis += `⚠️ Warning: File appears to be empty\n`;
            }
        }

        return analysis;
    } catch (error) {
        console.error('File analysis error:', error);
        return `❌ Error analyzing file: ${error.message}\n\nPlease ensure the file is properly uploaded and try again.`;
    }
}

// Tool definitions that the AI can use
const AVAILABLE_TOOLS = [
    {
        name: TOOL_CONFIG.NAMES.WEB_SEARCH,
        description: TOOL_CONFIG.DESCRIPTIONS.WEB_SEARCH,
        parameters: {
            query: {
                type: 'string',
                description: 'The search query to look up'
            }
        },
        execute: webSearch
    },
    {
        name: TOOL_CONFIG.NAMES.FILE_ANALYSIS,
        description: TOOL_CONFIG.DESCRIPTIONS.FILE_ANALYSIS,
        parameters: {
            instruction: {
                type: 'string',
                description: 'Optional instruction for how to analyze the file'
            }
        },
        execute: analyzeFile
    }
];

/**
 * Execute a tool call by name with given parameters
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} parameters - Parameters to pass to the tool
 * @returns {Promise<string>} Result of the tool execution
 */
async function executeTool(toolName, parameters) {
    const tool = AVAILABLE_TOOLS.find(t => t.name === toolName);
    if (!tool) {
        addDebugLog(`Tool "${toolName}" not found`, 'error');
        return `Error: Tool "${toolName}" not found`;
    }

    try {
        // Log tool call in debug mode
        addDebugLog(
            `Executing tool: ${toolName}`,
            'tool-call',
            `Tool: ${toolName}\nParameters: ${JSON.stringify(parameters, null, 2)}`
        );

        let result;
        // Parameters now include both 'query' and 'instruction' for flexibility
        // Tools can access whichever parameter name they need
        if (toolName === TOOL_CONFIG.NAMES.FILE_ANALYSIS) {
            // For file_analysis, pass the full parameters object with instruction
            result = await tool.execute({ instruction: parameters.instruction || '' });
        } else if (toolName === TOOL_CONFIG.NAMES.WEB_SEARCH) {
            // For web_search, pass just the query string
            result = await tool.execute(parameters.query || parameters);
        } else {
            // For other tools, pass parameters as-is
            result = await tool.execute(parameters);
        }

        // Log result in debug mode
        addDebugLog(`Tool ${toolName} completed`, 'tool-call', `Result length: ${result.length} chars`);

        return result;
    } catch (error) {
        addDebugLog(`Tool execution error: ${error.message}`, 'error', error.stack);
        return `Error executing tool: ${error.message}`;
    }
}

/**
 * Parse tool calls from AI response text
 * Supports multiple formats including XML-style tags and JSON code blocks
 * @param {string} text - The AI response text to parse
 * @returns {Array} Array of tool call objects with name and parameters
 */
function parseToolCalls(text) {
    const toolCalls = [];

    // Helper function to create a flexible parameter object
    // Stores the value as both 'query' and 'instruction' for compatibility with different tools
    function createParameters(value) {
        return {
            query: value,
            instruction: value
        };
    }

    // Pattern 1: <tool>web_search("query here")</tool> - with double quotes
    const pattern1 = /<tool>(\w+)\("([^"]+)"\)<\/tool>/gi;
    let match;

    while ((match = pattern1.exec(text)) !== null) {
        const toolName = match[1].toLowerCase();
        const paramValue = match[2];
        toolCalls.push({
            name: toolName,
            ...createParameters(paramValue)
        });
    }

    // Pattern 2: <tool>web_search('query here')</tool> - with single quotes
    const pattern2 = /<tool>(\w+)\('([^']+)'\)<\/tool>/gi;
    while ((match = pattern2.exec(text)) !== null) {
        const toolName = match[1].toLowerCase();
        const paramValue = match[2];
        // Check if this exact call wasn't already added by pattern1
        const exists = toolCalls.some(tc => tc.name === toolName && tc.query === paramValue);
        if (!exists) {
            toolCalls.push({
                name: toolName,
                ...createParameters(paramValue)
            });
        }
    }

    // Pattern 3: <tool>web_search(query here)</tool> - without quotes
    const pattern3 = /<tool>(\w+)\(([^)]+)\)<\/tool>/gi;
    while ((match = pattern3.exec(text)) !== null) {
        const toolName = match[1].toLowerCase();
        const paramValue = match[2].replace(/^["']|["']$/g, '').trim(); // Remove quotes if present
        const exists = toolCalls.some(tc => tc.name === toolName && tc.query === paramValue);
        if (!exists) {
            toolCalls.push({
                name: toolName,
                ...createParameters(paramValue)
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
            // Ensure both query and instruction parameters exist for flexibility
            if (toolCall.query && !toolCall.instruction) {
                toolCall.instruction = toolCall.query;
            } else if (toolCall.instruction && !toolCall.query) {
                toolCall.query = toolCall.instruction;
            }
            toolCalls.push(toolCall);
        } catch (e) {
            console.error('Failed to parse tool call JSON:', e);
        }
    }

    return toolCalls;
}

/**
 * Generate tools prompt to be added to the system message
 * Includes descriptions and examples for enabled tools
 * @returns {string} Formatted tools prompt for the system message
 */
function getToolsPrompt() {
    const enabledTools = [];
    let toolsPrompt = '';

    if (activeTools['web-search']) {
        enabledTools.push(TOOL_CONFIG.NAMES.WEB_SEARCH);
    }
    // Only include file_analysis if the tool is enabled AND a file is uploaded
    if (activeTools['file-analysis'] && currentFile) {
        enabledTools.push(TOOL_CONFIG.NAMES.FILE_ANALYSIS);
    }

    if (enabledTools.length === 0) {
        return '';
    }

    toolsPrompt = `\n\nYou have access to the following tools:\n\n`;

    if (activeTools['web-search']) {
        toolsPrompt += `**web_search** - Search the web using DuckDuckGo and Wikipedia for current information, facts, news, or answers to questions.
Syntax: <tool>web_search("your search query here")</tool>

Examples:
- <tool>web_search("latest news about AI")</tool>
- <tool>web_search("what is quantum computing")</tool>
- <tool>web_search("current weather in Tokyo")</tool>

`;
    }

    // Only show file_analysis tool if a file is actually uploaded
    if (activeTools['file-analysis'] && currentFile) {
        toolsPrompt += `**file_analysis** - Analyze the content of the uploaded file "${currentFileName}" (${currentFileType.toUpperCase()}).
Supports: PDF, JSON, CSV, TXT, MD, JS, TS, PY, JAVA, C, CPP, RS, GO, and more.
Syntax: <tool>file_analysis("optional instruction")</tool>

Examples:
- <tool>file_analysis("summarize this file")</tool>
- <tool>file_analysis("extract key points")</tool>
- <tool>file_analysis("analyze the data structure")</tool>
- <tool>file_analysis("explain what this code does")</tool>

`;
    }

    toolsPrompt += `\nIMPORTANT: When you use a tool, it will be executed immediately and results will be provided to you. You will then receive another turn to synthesize and present the information to the user in a helpful, natural way. Do not tell the user to wait - just use the tool and you'll get the results automatically.`;

    return toolsPrompt;
}

// ============================================================================
// MESSAGE HANDLING HELPERS
// ============================================================================
// Helper functions for the sendMessage function to improve maintainability
// ============================================================================

/**
 * Create and display user message in the chat
 * @param {string} message - The user's message text
 * @param {string} imageData - Optional base64 image data
 * @returns {number} Estimated token count for the message
 */
function displayUserMessage(message, imageData = null) {
    const userTokenCount = estimateTokenCount(message);
    const userMessageDiv = createMessageElement('user');
    const userContentDiv = userMessageDiv.querySelector('.message-content');

    // If there's an image, display it in the message
    if (imageData) {
        const imgElement = document.createElement('img');
        imgElement.src = imageData;
        imgElement.style.maxWidth = CONSTANTS.IMAGE_MAX_WIDTH;
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

    return userTokenCount;
}

/**
 * Prepare API request payload
 * @param {string} model - Model name
 * @param {Array} messages - Chat history messages
 * @param {Object} options - Model options (temperature, tokens, etc.)
 * @returns {Object} API request payload
 */
function prepareAPIPayload(model, messages, options) {
    return {
        model: model,
        messages: messages,
        stream: true,
        options: {
            temperature: options.temperature,
            num_predict: options.maxTokens,
            top_p: options.topP,
            top_k: options.topK,
            repeat_penalty: options.repeatPenalty
        }
    };
}

/**
 * Update message statistics in the header
 * @param {HTMLElement} messageDiv - The message container element
 * @param {number} totalTokens - Total token count
 * @param {number} tokensPerSecond - Tokens per second rate
 */
function updateMessageStats(messageDiv, totalTokens, tokensPerSecond) {
    const headerDiv = messageDiv.querySelector('.message-header');
    const statsSpan = document.createElement('div');
    statsSpan.className = 'message-stats';
    statsSpan.innerHTML = `
        <span>${totalTokens} tokens</span>
        <span>${tokensPerSecond} tk/s</span>
    `;
    headerDiv.appendChild(statsSpan);
}

/**
 * Set UI state for message generation
 * @param {boolean} generating - Whether currently generating
 */
function setGeneratingState(generating) {
    const sendButton = document.getElementById('send-button');
    const chatInput = document.getElementById('chat-input');
    const thinkingAnimation = document.getElementById('thinking-animation');

    sendButton.disabled = generating;
    chatInput.disabled = generating;
    chatInput.style.opacity = generating ? '0.5' : '1';
    chatInput.style.cursor = generating ? 'not-allowed' : 'text';

    if (generating) {
        thinkingAnimation.classList.add('active');
        document.getElementById('typing-indicator').classList.add('active');
    } else {
        thinkingAnimation.classList.remove('active');
        document.getElementById('typing-indicator').classList.remove('active');
    }
}

/**
 * Process streaming response chunk for thinking models
 * @param {string} chunk - The response chunk
 * @param {Object} state - Current thinking parsing state
 * @returns {Object} Updated state
 */
function processThinkingChunk(chunk, state) {
    for (let char of chunk) {
        if (!state.insideThinkTag) {
            // Check if we're entering a think tag
            const checkStr = (state.fullResponse.slice(-7) + char);
            if (checkStr.endsWith('<think>')) {
                state.insideThinkTag = true;
                state.regularContent = state.regularContent.slice(0, -6);
                continue;
            }
            state.regularContent += char;
        } else {
            // Check if we're exiting a think tag
            const checkStr = (state.fullResponse.slice(-8) + char);
            if (checkStr.endsWith('</think>')) {
                state.insideThinkTag = false;
                state.thinkingContent = state.thinkingContent.slice(0, -7);
                continue;
            }
            state.thinkingContent += char;
        }
    }
    return state;
}

/**
 * Handle Enter key press in chat input
 * @param {KeyboardEvent} event - The keyboard event
 */
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

/**
 * Main function to send a message to the AI and handle the response
 * Manages the entire chat flow including user input, API calls, streaming, and tool execution
 */
async function sendMessage() {
    if (isGenerating) return;

    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();

    if (!message) return;

    // Check if there's an image attached for vision models
    const hasImage = isVisionModelSelected() && currentImage;

    // Display user message in chat
    displayUserMessage(message, hasImage ? currentImage : null);

    // Add to chat history
    if (hasImage) {
        chatHistory.push({
            role: 'user',
            content: message,
            images: [currentImage.split(',')[1]] // Remove data:image/...;base64, prefix
        });
        removeImage(); // Clear image after sending
    } else {
        chatHistory.push({ role: 'user', content: message });
    }

    // Clear input
    chatInput.value = '';

    // Set generating state
    isGenerating = true;
    setGeneratingState(true);

    // Get settings
    const ollamaUrl = document.getElementById('ollama-url').value;
    const model = document.getElementById('model-select').value;
    const modelOptions = {
        temperature: parseFloat(document.getElementById('temperature').value),
        maxTokens: parseInt(document.getElementById('max-tokens').value),
        topP: parseFloat(document.getElementById('top-p').value),
        topK: parseInt(document.getElementById('top-k').value),
        repeatPenalty: parseFloat(document.getElementById('repeat-penalty').value)
    };
    const systemPrompt = document.getElementById('system-prompt').value;

    // Prepare messages with system prompt and tools
    const messages = [];
    let systemMessage = systemPrompt || '';
    systemMessage += getToolsPrompt();

    if (systemMessage) {
        messages.push({ role: 'system', content: systemMessage });
    }
    messages.push(...chatHistory);

    // Create assistant message container
    const messageDiv = createMessageElement('assistant', model);
    const contentDiv = messageDiv.querySelector('.message-content');

    // Initialize response tracking
    let fullResponse = '';
    let startTime = Date.now();
    let promptTokens = 0;
    let evalTokens = 0;

    // Get thinking animation element
    const thinkingAnimation = document.getElementById('thinking-animation');

    // Thinking model state
    let isThinkingModel = isThinkingModelSelected();
    const thinkingState = {
        thinkingContent: '',
        regularContent: '',
        insideThinkTag: false,
        thinkingBox: null,
        hasShownThinking: false,
        fullResponse: fullResponse
    };

    try {
        // Prepare API request
        const apiPayload = prepareAPIPayload(model, messages, modelOptions);

        // Log API request in debug mode
        addDebugLog(
            `API Request to ${ollamaUrl}/api/chat`,
            'api-response',
            `Model: ${model}\nMessages: ${messages.length}\nStreaming: true`
        );

        const response = await fetch(`${ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiPayload)
        });

        if (!response.ok) {
            addDebugLog(`API Error: ${response.status} ${response.statusText}`, 'error');
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

                            // Dynamically detect thinking tags in response
                            if (!isThinkingModel && fullResponse.includes('<think>')) {
                                isThinkingModel = true;
                                console.log('Detected thinking tags in response, enabling thinking mode');

                                // Reprocess the accumulated fullResponse to extract any thinking content
                                regularContent = '';
                                thinkingContent = '';
                                insideThinkTag = false;

                                for (let char of fullResponse) {
                                    if (!insideThinkTag) {
                                        const checkStr = (regularContent + thinkingContent).slice(-6) + char;
                                        if (checkStr.endsWith('<think>')) {
                                            insideThinkTag = true;
                                            regularContent = regularContent.slice(0, -6);
                                            continue;
                                        }
                                        regularContent += char;
                                    } else {
                                        const checkStr = (regularContent + thinkingContent).slice(-7) + char;
                                        if (checkStr.endsWith('</think>')) {
                                            insideThinkTag = false;
                                            thinkingContent = thinkingContent.slice(0, -7);
                                            continue;
                                        }
                                        thinkingContent += char;
                                    }
                                }

                                // Skip the normal chunk processing below since we just reprocessed everything
                                continue;
                            }

                            // Handle thinking models
                            if (isThinkingModel) {
                                // Parse for thinking tags
                                const chunk = json.message.content;

                                for (let char of chunk) {
                                    if (!insideThinkTag) {
                                        // Check if we're entering a think tag
                                        const checkStr = (fullResponse.slice(-7) + char);
                                        if (checkStr.endsWith('<think>')) {
                                            insideThinkTag = true;
                                            // Remove <think> from regular content if it was added
                                            regularContent = regularContent.slice(0, -6);
                                            continue;
                                        }
                                        regularContent += char;
                                    } else {
                                        // Check if we're exiting a think tag
                                        const checkStr = (fullResponse.slice(-8) + char);
                                        if (checkStr.endsWith('</think>')) {
                                            insideThinkTag = false;
                                            // Remove </think> from thinking content
                                            thinkingContent = thinkingContent.slice(0, -7);

                                            // Create or update thinking box (collapsed by default)
                                            if (!hasShownThinking) {
                                                thinkingBox = createThinkingBox(escapeHtml(thinkingContent).replace(/\n/g, '<br>'), true);
                                                contentDiv.appendChild(thinkingBox);
                                                hasShownThinking = true;
                                            } else {
                                                const thinkContent = thinkingBox.querySelector('.thinking-content');
                                                thinkContent.innerHTML = escapeHtml(thinkingContent).replace(/\n/g, '<br>');
                                            }
                                            continue;
                                        }
                                        thinkingContent += char;
                                    }
                                }

                                // Update display
                                if (insideThinkTag) {
                                    // Show thinking content as it streams (collapsed by default)
                                    if (!hasShownThinking) {
                                        thinkingBox = createThinkingBox(escapeHtml(thinkingContent).replace(/\n/g, '<br>') + '<span class="streaming-cursor"></span>', true);
                                        contentDiv.appendChild(thinkingBox);
                                        hasShownThinking = true;
                                    } else {
                                        const thinkContent = thinkingBox.querySelector('.thinking-content');
                                        thinkContent.innerHTML = escapeHtml(thinkingContent).replace(/\n/g, '<br>') + '<span class="streaming-cursor"></span>';
                                    }
                                } else {
                                    // Show regular response
                                    try {
                                        const regularDiv = document.createElement('div');
                                        regularDiv.innerHTML = parseMarkdown(regularContent) + '<span class="streaming-cursor"></span>';

                                        // Clear contentDiv and re-add thinking box if it exists
                                        const existingThinkingBox = contentDiv.querySelector('.thinking-box');
                                        contentDiv.innerHTML = '';
                                        if (existingThinkingBox) {
                                            contentDiv.appendChild(existingThinkingBox);
                                        }
                                        contentDiv.innerHTML += regularDiv.innerHTML;
                                    } catch (parseError) {
                                        contentDiv.innerHTML = (hasShownThinking ? contentDiv.innerHTML : '') + escapeHtml(regularContent) + '<span class="streaming-cursor"></span>';
                                    }
                                }
                            } else {
                                // Regular model - no thinking parsing
                                try {
                                    contentDiv.innerHTML = parseMarkdown(fullResponse) + '<span class="streaming-cursor"></span>';
                                } catch (parseError) {
                                    contentDiv.innerHTML = escapeHtml(fullResponse) + '<span class="streaming-cursor"></span>';
                                }
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

        if (toolCalls.length > 0 && (activeTools['web-search'] || activeTools['file-analysis'])) {
            // Save the assistant's message with tool calls to history
            chatHistory.push({ role: 'assistant', content: fullResponse });

            // Update the current message div to show the assistant's request
            contentDiv.innerHTML = parseMarkdown(fullResponse);

            // Update message header with stats for the tool request
            updateMessageStats(messageDiv, totalTokens, tokensPerSecond);

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

                try {
                    // Execute the tool
                    const toolResult = await executeTool(toolCall.name, toolCall);

                    // Format results based on tool type
                    let formattedResult;
                    let collapsibleTitle;

                    if (toolCall.name === TOOL_CONFIG.NAMES.WEB_SEARCH) {
                        formattedResult = formatSearchResults(toolResult);
                        collapsibleTitle = `🔍 Web Search Results: "${toolCall.query}"`;
                    } else {
                        formattedResult = escapeHtml(toolResult).replace(/\n/g, '<br>');
                        collapsibleTitle = `🔍 ${toolCall.name} Results`;
                    }

                    // Create collapsible search results (collapsed by default)
                    const collapsibleResults = createCollapsibleSection(
                        collapsibleTitle,
                        formattedResult,
                        true // collapsed by default
                    );

                    // Replace the loading div with collapsible results
                    toolDiv.remove();
                    contentDiv.appendChild(collapsibleResults);
                    scrollToBottom();

                    // Add tool result to history
                    chatHistory.push({ role: 'system', content: `Tool result for ${toolCall.name}("${toolCall.query}"):\n${toolResult}` });

                    // If file_analysis was executed and auto-clear is enabled, clear the file
                    if (toolCall.name === TOOL_CONFIG.NAMES.FILE_ANALYSIS && settings['auto-clear-file']) {
                        removeFile();
                    }
                } catch (toolError) {
                    // Always remove the loading spinner on error
                    toolDiv.remove();

                    // Display error message
                    console.error(`Tool execution error for ${toolCall.name}:`, toolError);
                    addDebugLog(`Tool execution error: ${toolCall.name}`, 'error', `${toolError.message}\n${toolError.stack || ''}`);

                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'search-error';
                    errorDiv.innerHTML = `
                        <strong>❌ Tool Execution Failed: ${toolCall.name}</strong><br>
                        Query: "${toolCall.query}"<br>
                        Error: ${escapeHtml(toolError.message)}
                    `;
                    contentDiv.appendChild(errorDiv);
                    scrollToBottom();

                    // Add error to history so the AI is aware
                    chatHistory.push({ role: 'system', content: `Tool execution failed for ${toolCall.name}("${toolCall.query}"): ${toolError.message}` });
                }
            }

            // Now continue the conversation - let the AI synthesize the results
            // Create a new assistant message for the synthesis
            const synthesisMessageDiv = createMessageElement('assistant', model);
            const synthesisContentDiv = synthesisMessageDiv.querySelector('.message-content');
            synthesisContentDiv.innerHTML = '<span class="streaming-cursor"></span>';

            // Show thinking animation
            thinkingAnimation.classList.add('active');
            document.getElementById('typing-indicator').classList.add('active');

            // Prepare synthesis messages with system prompt and tools context
            const synthesisMessages = [];
            let synthesisSystemMessage = systemPrompt || '';
            synthesisSystemMessage += getToolsPrompt();

            if (synthesisSystemMessage) {
                synthesisMessages.push({ role: 'system', content: synthesisSystemMessage });
            }
            synthesisMessages.push(...chatHistory);

            // Make a follow-up API call to let the AI synthesize the results
            try {
                const synthesisPayload = prepareAPIPayload(model, synthesisMessages, modelOptions);

                const synthesisResponse = await fetch(`${ollamaUrl}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(synthesisPayload)
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
                    const synthesisTotalTokens = synthesisPromptTokens + synthesisEvalTokens;
                    const synthesisElapsedTime = (Date.now() - synthesisStartTime) / 1000;
                    const synthesisTokensPerSecond = synthesisEvalTokens > 0 ? (synthesisEvalTokens / synthesisElapsedTime).toFixed(2) : 0;
                    updateMessageStats(synthesisMessageDiv, synthesisTotalTokens, synthesisTokensPerSecond);
                } else {
                    // No synthesis response received
                    addDebugLog('No synthesis response received', 'error',
                        `Model: ${model}\nTool results were provided but synthesis failed\nPrompt tokens: ${synthesisPromptTokens}\nEval tokens: ${synthesisEvalTokens}`
                    );
                    synthesisContentDiv.innerHTML = `<p style="color: #ff4444;">No response received while synthesizing results. The tool executed successfully but the model did not generate a response.</p>`;
                }

            } catch (synthesisError) {
                console.error('Synthesis error:', synthesisError);
                addDebugLog('Synthesis error', 'error', `${synthesisError.message}\n${synthesisError.stack}`);
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
            // Handle thinking models differently
            if (isThinkingModel && hasShownThinking) {
                // Keep the thinking box collapsed and show the regular response
                const existingThinkingBox = contentDiv.querySelector('.thinking-box');
                contentDiv.innerHTML = '';

                if (existingThinkingBox) {
                    // Ensure thinking box is collapsed
                    if (!existingThinkingBox.classList.contains('collapsed')) {
                        existingThinkingBox.classList.add('collapsed');
                    }
                    contentDiv.appendChild(existingThinkingBox);
                }

                // Add regular content
                const responseDiv = document.createElement('div');
                responseDiv.innerHTML = parseMarkdown(regularContent);
                contentDiv.appendChild(responseDiv);

                // Save only the regular content to history (not thinking)
                chatHistory.push({ role: 'assistant', content: regularContent });
            } else {
                // Regular model or no thinking detected
                contentDiv.innerHTML = parseMarkdown(fullResponse);
                chatHistory.push({ role: 'assistant', content: fullResponse });
            }

            // Update message header with stats
            updateMessageStats(messageDiv, totalTokens, tokensPerSecond);

            scrollToBottom();
        } else {
            // Log detailed debugging information
            addDebugLog('No response received from model', 'error',
                `Model: ${model}\nMessages sent: ${messages.length}\nPrompt tokens: ${promptTokens}\nEval tokens: ${evalTokens}\nLast message: ${messages[messages.length - 1]?.content?.substring(0, 200)}`
            );
            throw new Error('No response received from model. Please check that the model is loaded and responding correctly.');
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
        setGeneratingState(false);
    }
}

// Create Message Element
function createMessageElement(role, modelName = null) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';

    const roleLabel = document.createElement('span');
    // Display model name for assistant messages, otherwise use default labels
    if (role === 'assistant' && modelName) {
        roleLabel.textContent = modelName;
    } else {
        roleLabel.textContent = role === 'user' ? 'You' : role === 'assistant' ? 'AI' : 'System';
    }
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

/**
 * Copy code from a code block to clipboard
 * @param {HTMLElement} button - The copy button element that was clicked
 */
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
        }, CONSTANTS.COPY_BUTTON_TIMEOUT);
    }).catch(err => {
        console.error('Failed to copy code:', err);
        button.textContent = 'Error';
        setTimeout(() => {
            button.textContent = 'Copy';
        }, CONSTANTS.COPY_BUTTON_TIMEOUT);
    });
}

// Scroll to Bottom
function scrollToBottom() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
