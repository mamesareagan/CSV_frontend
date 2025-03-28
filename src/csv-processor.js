/** CSV Processor Frontend Logic for converting CSV to formatted text */

const API_ENDPOINT = 'https://csv-backend-psi.vercel.app/api/process-csv/';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements (unchanged)
    const fileInput = document.getElementById('fileInput');
    const dropZoneContent = document.getElementById('dropZoneContent');
    const fileSelectedContent = document.getElementById('fileSelectedContent');
    const selectedFileName = document.getElementById('selectedFileName');
    const selectedFileSize = document.getElementById('selectedFileSize');
    const fileError = document.getElementById('fileError');
    const customDelimiter = document.getElementById('customDelimiter');
    const customDelimiterInput = document.getElementById('customDelimiterInput');
    const encodingSelect = document.getElementById('encodingSelect');
    const previewButton = document.getElementById('previewButton');
    const downloadButton = document.getElementById('downloadButton');
    const removeFileButton = document.getElementById('removeFileButton');
    const processingStatus = document.getElementById('processingStatus');
    const progressBar = document.getElementById('progressBar');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const successMessage = document.getElementById('successMessage');
    const previewSection = document.getElementById('previewSection');
    const previewContent = document.getElementById('previewContent');

    // Check for missing DOM elements
    if (!fileInput) console.error('File input not found');
    const dropZone = fileInput?.closest('label') || null;
    if (!dropZone) console.error('Drop zone not found');

    // Initialize button states
    updateButtonsState();

    // Drag and drop events
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-400');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-blue-400');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-400');
            if (e.dataTransfer.files.length) handleFileSelection(e.dataTransfer.files[0]);
        });
    }

    // File input change event
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            console.log('File input changed');
            if (fileInput.files.length) handleFileSelection(fileInput.files[0]);
            else resetFileInput();
        });
    }

    // Remove file event
    if (removeFileButton) {
        removeFileButton.addEventListener('click', (e) => {
            e.preventDefault();
            resetFileInput();
        });
    }

    // Custom delimiter toggle
    if (customDelimiter && customDelimiterInput) {
        customDelimiter.addEventListener('change', () => {
            customDelimiterInput.disabled = !customDelimiter.checked;
            if (customDelimiter.checked) customDelimiterInput.focus();
            else customDelimiterInput.value = '';
        });
    }

    // Preview and Download events
    if (previewButton) previewButton.addEventListener('click', () => processFile(true));
    if (downloadButton) downloadButton.addEventListener('click', () => processFile(false));

    // Reset file input and UI
    function resetFileInput() {
        if (fileInput) fileInput.value = '';
        dropZoneContent?.classList.remove('hidden');
        fileSelectedContent?.classList.add('hidden');
        resetMessages();
        updateButtonsState();
    }

    // Handle file selection
    function handleFileSelection(file) {
        console.log('Selected file:', file.name);
        resetMessages();

        // Validate file type (backend only accepts .csv)
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showError('Only .csv files are allowed.');
            resetFileInput();
            return;
        }

        // Update UI
        dropZoneContent?.classList.add('hidden');
        fileSelectedContent?.classList.remove('hidden');
        selectedFileName.textContent = sanitizeHTML(file.name);
        selectedFileSize.textContent = formatFileSize(file.size);
        updateButtonsState();
    }

    // Sanitize text for display (prevent XSS)
    function sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // Format file size for display
    function formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size > 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    // Validate file before processing
    function validateFile() {
        if (!fileInput?.files.length) {
            showError('Please select a file.');
            return false;
        }
        const file = fileInput.files[0];
        if (file.size > 10 * 1024 * 1024) {
            showError('File too large. Maximum size is 10MB.');
            return false;
        }
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showError('Only .csv files are allowed.');
            return false;
        }
        if (customDelimiter.checked && !customDelimiterInput.value.trim()) {
            showError('Please enter a custom delimiter.');
            customDelimiterInput.focus();
            return false;
        }
        return true;
    }

    // Process file (preview or download)
    async function processFile(previewOnly = false) {
        if (!validateFile()) return;

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        // Get delimiter
        const delimiterOption = document.querySelector('input[name="delimiter"]:checked')?.value || '\t';
        const delimiter = delimiterOption === 'custom' ? customDelimiterInput.value : delimiterOption;
        if (delimiter) formData.append('delimiter', delimiter);

        // Get encoding
        const encoding = encodingSelect.value || '';
        if (encoding) formData.append('encoding', encoding);

        // Show processing UI
        showProcessingStatus();
        console.log('Processing file:', file.name, 'Delimiter:', delimiter, 'Encoding:', encoding);

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                body: formData,
                // No CSRF headers; not needed for separate frontend
            });

            // Simulate progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += 20;
                progressBar.style.width = `${Math.min(progress, 90)}%`;
                if (progress >= 90) clearInterval(interval);
            }, 200);

            if (!response.ok) {
                const errorData = await response.text().then(text => {
                    try {
                        return JSON.parse(text);
                    } catch {
                        return { error: text || `HTTP ${response.status}` };
                    }
                });
                throw new Error(errorData.error || 'Processing failed');
            }

            const blob = await response.blob();
            console.log('Received blob size:', blob.size);
            progressBar.style.width = '100%';
            hideProcessingStatus();

            if (previewOnly) {
                const text = await blob.text();
                console.log('Preview content (first 200 chars):', text.substring(0, 200));
                showPreview(text);
                showSuccessMessage();
            } else {
                const fileName = file.name.replace(/\.csv$/i, '.txt');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log('Download triggered for:', fileName);
                showSuccessMessage();
            }
        } catch (error) {
            console.error('Processing error:', error.message);
            hideProcessingStatus();
            showError(`Failed to process file: ${error.message}`);
        }
    }

    // UI Helper Functions (unchanged)
    function showProcessingStatus() {
        processingStatus.classList.remove('hidden');
        previewButton.disabled = true;
        downloadButton.disabled = true;
        progressBar.style.width = '0%';
        resetMessages();
    }

    function hideProcessingStatus() {
        processingStatus.classList.add('hidden');
        updateButtonsState();
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        fileError.textContent = message;
        fileError.classList.remove('hidden');
    }

    function showSuccessMessage() {
        successMessage.classList.remove('hidden');
    }

    function resetMessages() {
        errorMessage.classList.add('hidden');
        successMessage.classList.add('hidden');
        fileError.classList.add('hidden');
        previewSection.classList.add('hidden');
    }

    function showPreview(content) {
        previewContent.textContent = content;
        previewSection.classList.remove('hidden');
        previewSection.scrollIntoView({ behavior: 'smooth' });
    }

    function updateButtonsState() {
        const hasFile = fileInput?.files.length > 0;
        previewButton.disabled = !hasFile;
        downloadButton.disabled = !hasFile;
    }

    console.log('CSV Processor script loaded');

    // Add event listener for beforeunload to reset file input
    window.addEventListener('beforeunload', resetFileInputOnUnload);

    function resetFileInputOnUnload() {
    resetFileInput();
    }

    // Reset file input and UI
    function resetFileInput() {
        if (fileInput) {
            fileInput.value = '';
        }
        dropZoneContent?.classList.remove('hidden');
        fileSelectedContent?.classList.add('hidden');
        selectedFileName.textContent = '';
        selectedFileSize.textContent = '';
        resetMessages();
        updateButtonsState();
    }

});
