# Ollama Chat Interface

A beautiful, feature-rich web interface for chatting with Ollama AI models locally.

## Features

- 🤖 Clean, modern chat interface
- 🎨 Dark/Light theme support
- 🔧 Advanced model parameters (temperature, top-p, top-k, etc.)
- 🔍 Web search integration with DuckDuckGo
- 📝 Markdown and code syntax support
- 💾 Settings persistence with localStorage
- ⚡ Real-time streaming responses
- 📊 Token usage and speed statistics

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

## Web Search Feature

The interface includes DuckDuckGo web search integration:

1. Click the "+" button in the chat input area
2. Enable "Web Search"
3. Now the AI can search the web when needed

The AI will automatically use the `<tool>web_search("query")</tool>` syntax when it needs current information.

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
