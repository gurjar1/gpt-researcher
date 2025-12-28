# Vernix 🧬

**Vernix** is an advanced, AI-powered research assistant designed to help you navigate the vast ocean of information with ease and precision. Built on top of GPT-Researcher, Vernix adds enhanced UI/UX, local LLM support, and powerful file analysis capabilities.

**Repository:** [https://github.com/gurjar1/vernix](https://github.com/gurjar1/vernix)

## 📸 Screenshots

![Vernix Home](https://github.com/gurjar1/vernix/blob/main/docs/screenshot_home.png?raw=true)
*Modern, dark-themed home interface*

![Settings](https://github.com/gurjar1/vernix/blob/main/docs/screenshot_settings.png?raw=true)
*Comprehensive preferences including Local LLM support*

## 🚀 Key Features

*   **🔍 Deep Research:** Autonomous agent that scrapes, filters, and aggregates information from the web to produce comprehensive research reports.
*   **🤖 Local LLM Support:** Seamless integration with **Ollama** to run models like Llama 3, Mistral, and Gemma locally for privacy and zero cost.
*   **📂 File Analysis:** Upload PDF, TXT, and Markdown files to analyze documents, summarize content, and ask questions about your data.
*   **🎨 Modern UI:** A sleek, responsive interface with:
    *   Dark/Light mode support (Coming soon)
    *   Quick-copy and export features
    *   Interactive chat interface
*   **📄 Export Options:** Export your research and chat history to PDF for easy sharing.

## 🛠️ Installation

### Prerequisites

*   **Python 3.11+**
*   **Node.js & npm**
*   **Ollama** (for local models)
*   **Docker** (optional, for SearXNG)

### Backend Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/vernix.git
    cd vernix
    ```
2.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Set up environment variables:
    ```bash
    cp .env.example .env
    # Update .env with your API keys (OpenAI, Tavily, etc.) if not using local models
    ```
4.  Run the backend:
    ```bash
    python -m uvicorn backend.server.app:app --reload
    ```

### Frontend Setup

1.  Navigate to the Next.js app:
    ```bash
    cd frontend/nextjs
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```

## 🧠 Using Local Models (Ollama)

1.  Install [Ollama](https://ollama.com/).
2.  Pull a model: `ollama pull llama3`
3.  In Vernix Settings, select **Ollama** as the provider and enter your model name.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
