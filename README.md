# Ollama Chat Interface

A beautiful, feature-rich web interface for chatting with Ollama AI models locally.

## Features

- 🤖 Clean, modern chat interface
- 🎨 Dark/Light theme support
- 🔧 Advanced model parameters (temperature, top-p, top-k, etc.)
- 🔍 Web search integration with DuckDuckGo + Wikipedia
- 📎 File analysis tool (TXT, JSON, CSV, MD, code files)
- 👁️ Vision model support with image upload
- 🧠 Thinking model support (DeepSeek R1, QwQ, Qwen)
- 📝 Markdown and code syntax support with copy buttons
- 💾 Settings persistence with localStorage
- ⚡ Real-time streaming responses
- 📊 Token usage and speed statistics
- 🎯 Collapsible thinking sections and search results

## Prerequisites

1. **Ollama installed** - Download from [ollama.ai](https://ollama.ai)
2. **At least one model downloaded** - e.g., `ollama pull llama3.2:3b`
3. **A web browser** - Chrome, Firefox, Safari, or Edge

## Setup Instructions

### Step 1: Install Ollama

If you haven't already, install Ollama from [https://ollama.ai](https://ollama.ai)

### Step 2: Download a Model

Pull at least one model (this example uses llama3.2:3b):

```bash
ollama pull llama3.2:3b
```

### Step 3: Start Ollama with CORS Enabled

**This is the most important step!** The interface needs CORS (Cross-Origin Resource Sharing) enabled to communicate with Ollama.

#### macOS / Linux

```bash
OLLAMA_ORIGINS="*" ollama serve
```

Or set it permanently in your shell profile (e.g., `~/.zshrc` or `~/.bashrc`):

```bash
export OLLAMA_ORIGINS="*"
```

Then restart your terminal and run:

```bash
ollama serve
```

#### Windows (PowerShell)

```powershell
$env:OLLAMA_ORIGINS="*"
ollama serve
```

To set it permanently, add it to your PowerShell profile or set it as a system environment variable.

#### Windows (Command Prompt)

```cmd
set OLLAMA_ORIGINS=*
ollama serve
```

#### Using Docker

If you're running Ollama in Docker:

```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 -e OLLAMA_ORIGINS="*" --name ollama ollama/ollama
```

### Step 4: Open the Interface

Simply open `index.html` in your web browser:

- **Double-click** the file, or
- **Drag and drop** it into your browser, or
- Use a local web server:

```bash
# Using Python 3
python -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (if you have npx)
npx serve

# Using PHP
php -S localhost:8000
```

Then navigate to `http://localhost:8000`

### Step 5: Verify Connection

1. Look at the status indicator in the sidebar (bottom left)
2. It should show "Connected" with a green dot
3. Click "Refresh Models" to load your available models
4. If you see "CORS Error", make sure you started Ollama with the `OLLAMA_ORIGINS` environment variable set

## Troubleshooting

### CORS Error / Connection Failed

**Problem:** The status shows "CORS Error" or "Disconnected"

**Solution:** Make sure Ollama is running with CORS enabled:

```bash
# Stop Ollama if it's running
pkill ollama  # or: killall ollama

# Start with CORS enabled
OLLAMA_ORIGINS="*" ollama serve
```

### Models Not Loading

**Problem:** The model dropdown is empty or shows only the default

**Solution:**
1. Make sure Ollama is running
2. Pull at least one model: `ollama pull llama3.2:3b`
3. Click the "Refresh Models" button in the sidebar

### Chat Not Working

**Problem:** Messages don't send or get stuck

**Solution:**
1. Check that Ollama is running: `ollama list`
2. Verify the Ollama URL in settings (default: `http://localhost:11434`)
3. Make sure CORS is enabled (see above)
4. Check browser console (F12) for detailed error messages

### Port Already in Use

**Problem:** Ollama won't start because port 11434 is in use

**Solution:**
```bash
# Find what's using the port
lsof -i :11434  # macOS/Linux
netstat -ano | findstr :11434  # Windows

# Stop Ollama
pkill ollama  # macOS/Linux

# Start again
OLLAMA_ORIGINS="*" ollama serve
```

## Configuration

### Changing Ollama URL

If you're running Ollama on a different port or remote server:

1. Open the sidebar
2. Find "Ollama URL" field
3. Update to your Ollama address (e.g., `http://192.168.1.100:11434`)
4. Click "Refresh Models"

### Model Parameters

The sidebar provides controls for:

- **Temperature** (0-2): Controls creativity/randomness
- **Max Tokens** (1-131072): Maximum response length
- **Top P** (0-1): Nucleus sampling threshold
- **Top K** (1-100): Limits token selection
- **Repeat Penalty** (0-2): Reduces repetitive text
- **System Prompt**: Sets AI behavior/personality

All settings are automatically saved to localStorage.

## Available Tools

The interface includes two powerful tools that enhance the AI's capabilities:

**Tool Management:**
- Click the "+" button at the bottom of the chat to access the tools menu
- The number badge on the "+" button shows how many tools are currently enabled
- Tool settings are saved automatically

### 1. Web Search 🔍

Intelligent web search with dual-source integration:

**How to enable:**
1. Click the "+" button in the chat input area
2. Enable "Web Search"
3. The AI can now search the web when needed

**Features:**
- **Primary Source:** DuckDuckGo HTML search for comprehensive web results
- **Fallback Source:** Wikipedia API for factual queries when DuckDuckGo returns limited results
- **Smart Synthesis:** AI automatically processes search results and presents information naturally
- **Collapsible Results:** Search results are shown in a collapsible section for clean UI

**How it works:**
1. User asks a question requiring current information
2. AI uses `<tool>web_search("query")</tool>` syntax
3. System searches DuckDuckGo (and Wikipedia if needed)
4. Search results are displayed in a collapsible section
5. AI receives results and synthesizes them into a natural response

### 2. File Analysis 📎

Analyze and process various file types:

**How to enable:**
1. Click the "+" button in the chat input area
2. Enable "File Analysis"
3. A file upload button (📎) will appear

**Supported file types:**
- **Text files:** .txt, .md
- **Data files:** .json, .csv
- **Code files:** .js, .py, .java, .c, .cpp, .html, .css, .xml, .yaml, .yml

**How to use:**
1. Click the file upload button (📎)
2. Select a file (max 10MB)
3. The file preview will appear
4. Ask the AI to analyze the file
5. AI uses `<tool>file_analysis("instruction")</tool>` syntax
6. System analyzes the file and provides structured results
7. AI synthesizes the analysis into a helpful response

**Analysis features:**
- **JSON files:** Parses and displays structure
- **CSV files:** Shows row count and data preview
- **Text files:** Provides line count, word count, and full content
- **Code files:** Displays content for code review and explanation

## Vision Model Support 👁️

The interface automatically detects vision models and enables image upload:

**Supported vision models:**
- llava, bakllava
- qwen2-vl, qwen-vl
- minicpm-v
- cogvlm
- yi-vl, internvl
- moondream

**How to use:**
1. Select a vision model from the dropdown
2. The image button (📷) will appear automatically
3. Click to upload an image or drag & drop
4. Image preview will appear
5. Ask questions about the image
6. The AI can see and analyze the image

## Thinking Model Support 🧠

The interface automatically detects thinking models and displays their reasoning process:

**Supported thinking models:**
- DeepSeek R1, DeepSeek Reasoner
- QwQ (Qwen with Questions)
- Qwen models

**Features:**
- **Collapsible Thinking:** Reasoning process is shown in a collapsible yellow box (collapsed by default)
- **Clean Output:** Regular response is shown separately from the thinking process
- **Real-time Streaming:** Watch the AI think in real-time (when expanded)

## Security Note

The `OLLAMA_ORIGINS="*"` setting allows connections from any origin. If you want to restrict access:

```bash
# Only allow from specific origin
OLLAMA_ORIGINS="http://localhost:8000" ollama serve

# Allow multiple origins
OLLAMA_ORIGINS="http://localhost:8000,http://127.0.0.1:8000" ollama serve
```

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Internet Explorer (not supported)

## License

This project is open source and available for personal and commercial use.

## Contributing

Feel free to submit issues and pull requests!

## Support

If you encounter any issues:

1. Check this README's troubleshooting section
2. Verify Ollama is running: `ollama list`
3. Check browser console (F12) for errors
4. Make sure CORS is enabled
5. Try restarting Ollama with the correct environment variables

---

**Enjoy chatting with your local AI! 🚀**
