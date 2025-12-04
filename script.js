const STORAGE_KEY = 'prompts';

// DOM Elements
const promptForm = document.getElementById('promptForm');
const promptTitle = document.getElementById('promptTitle');
const promptContent = document.getElementById('promptContent');
const promptsContainer = document.getElementById('promptsContainer');

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
    displayPrompts();
});

// Form submission handler
promptForm.addEventListener('submit', (e) => {
    e.preventDefault();
    savePrompt();
});

// Save prompt to localStorage
function savePrompt() {
    const title = promptTitle.value.trim();
    const content = promptContent.value.trim();

    if (!title || !content) {
        return;
    }

    const prompts = getPrompts();
    const newPrompt = {
        id: Date.now(),
        title: title,
        content: content
    };

    prompts.push(newPrompt);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));

    // Clear form
    promptForm.reset();

    // Update display
    displayPrompts();
}

// Get all prompts from localStorage
function getPrompts() {
    const prompts = localStorage.getItem(STORAGE_KEY);
    return prompts ? JSON.parse(prompts) : [];
}

// Display all prompts as cards
function displayPrompts() {
    const prompts = getPrompts();
    promptsContainer.innerHTML = '';

    if (prompts.length === 0) {
        promptsContainer.innerHTML = '<p class="empty-state">No prompts saved yet. Create your first prompt!</p>';
        return;
    }

    prompts.forEach((prompt) => {
        const card = createPromptCard(prompt);
        promptsContainer.appendChild(card);
    });
}

// Create a prompt card element
function createPromptCard(prompt) {
    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.innerHTML = `
        <div class="prompt-title">${escapeHtml(prompt.title)}</div>
        <div class="prompt-content">${escapeHtml(prompt.content)}</div>
        <div class="prompt-footer">
            <button class="btn-delete" data-id="${prompt.id}">Delete</button>
        </div>
    `;

    // Add delete button listener
    const deleteBtn = card.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => {
        deletePrompt(prompt.id);
    });

    return card;
}

// Delete a prompt from localStorage
function deletePrompt(id) {
    let prompts = getPrompts();
    prompts = prompts.filter((prompt) => prompt.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    displayPrompts();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}
