class ImageCompressor {
    constructor() {
        this.originalImages = [];
        this.compressedImages = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateQualityDisplay();
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const qualitySlider = document.getElementById('qualitySlider');
        const compressBtn = document.getElementById('compressBtn');
        const resetBtn = document.getElementById('resetBtn');
        const downloadAllBtn = document.getElementById('downloadAllBtn');

        // File upload
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // Quality slider
        qualitySlider.addEventListener('input', () => this.updateQualityDisplay());

        // Buttons
        compressBtn.addEventListener('click', () => this.compressImages());
        resetBtn.addEventListener('click', () => this.reset());
        downloadAllBtn.addEventListener('click', () => this.downloadAll());
    }

    handleFiles(files) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            alert('Please select valid image files.');
            return;
        }

        this.originalImages = [];
        const promises = imageFiles.map(file => this.loadImage(file));

        Promise.all(promises).then(images => {
            this.originalImages = images;
            this.showControls();
        });
    }

    loadImage(file) {
        return new Promise((resolve) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.onload = () => {
                    resolve({
                        file: file,
                        image: img,
                        data: e.target.result,
                        size: file.size,
                        name: file.name
                    });
                };
                img.src = e.target.result;
            };

            reader.readAsDataURL(file);
        });
    }

    showControls() {
        document.getElementById('controls').style.display = 'block';
        document.getElementById('uploadArea').style.display = 'none';
    }

    updateQualityDisplay() {
        const quality = document.getElementById('qualitySlider').value;
        document.getElementById('qualityValue').textContent = quality + '%';
    }

    async compressImages() {
        const format = document.querySelector('input[name="format"]:checked').value;
        const quality = parseInt(document.getElementById('qualitySlider').value) / 100;

        this.showLoading();
        this.compressedImages = [];

        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const total = this.originalImages.length;

        for (let i = 0; i < total; i++) {
            const imageData = this.originalImages[i];
            const start = performance.now();

            const compressed = await this.compressImage(imageData, format, quality);

            const end = performance.now();
            compressed.timeTaken = (end - start).toFixed(2);

            this.compressedImages.push(compressed);

            // Update progress bar
            const percent = Math.round(((i + 1) / total) * 100);
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `${percent}%`;
        }

        this.hideLoading();
        this.showResults();
    }

    compressImage(imageData, format, quality) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = imageData.image;

            // Get resizing values
            const scale = parseFloat(document.getElementById('resizeScale').value);
            const customWidth = parseInt(document.getElementById('resizeWidth').value);
            const customHeight = parseInt(document.getElementById('resizeHeight').value);

            // Determine new dimensions
            let newWidth = img.width;
            let newHeight = img.height;

            if (!isNaN(scale)) {
                newWidth = img.width * (scale / 100);
                newHeight = img.height * (scale / 100);
            } else {
                if (!isNaN(customWidth)) newWidth = customWidth;
                if (!isNaN(customHeight)) newHeight = customHeight;
            }

            canvas.width = newWidth;
            canvas.height = newHeight;

            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            const mimeType = format === 'jpeg' ? 'image/jpeg' :
                format === 'png' ? 'image/png' : 'image/webp';

            canvas.toBlob((blob) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    resolve({
                        originalData: imageData,
                        data: e.target.result,
                        blob: blob,
                        size: blob.size,
                        format: format,
                        name: this.generateFileName(imageData.name, format)
                    });
                };
                reader.readAsDataURL(blob);
            }, mimeType, quality);
        });
    }

    generateFileName(originalName, format) {
        const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
        const extension = format === 'jpeg' ? 'jpg' : format;
        return `${baseName}_compressed.${extension}`;
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('controls').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showResults() {
        const comparison = document.getElementById('comparison');
        const statsContainer = document.getElementById('stats');
        const imagesContainer = document.getElementById('imagesContainer');

        // Calculate overall stats
        const totalOriginalSize = this.originalImages.reduce((sum, img) => sum + img.size, 0);
        const totalCompressedSize = this.compressedImages.reduce((sum, img) => sum + img.size, 0);
        const totalSaved = totalOriginalSize - totalCompressedSize;
        const percentageSaved = ((totalSaved / totalOriginalSize) * 100).toFixed(1);

        // Update stats
        statsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">Original Size</div>
                <div class="stat-value">${this.formatFileSize(totalOriginalSize)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Compressed Size</div>
                <div class="stat-value">${this.formatFileSize(totalCompressedSize)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Space Saved</div>
                <div class="stat-value">${percentageSaved}%</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Images Processed</div>
                <div class="stat-value">${this.originalImages.length}</div>
            </div>
        `;

        // Create image comparisons
        imagesContainer.innerHTML = '';
        this.compressedImages.forEach((compressed, index) => {
            const original = compressed.originalData;
            const individualSaved = original.size - compressed.size;
            const individualPercentage = ((individualSaved / original.size) * 100).toFixed(1);

            const imageComparisonHTML = `
                <div class="images-container">
                    <div class="image-section">
                        <h3>Original</h3>
                        <div class="image-wrapper">
                            <img src="${original.data}" alt="Original image">
                        </div>
                        <div style="text-align: center; margin-top: 10px; color: #666;">
                            ${this.formatFileSize(original.size)}
                        </div>
                    </div>
                    <div class="image-section">
                        <h3>Compressed (${individualPercentage}% smaller)</h3>
                        <div class="image-wrapper">
                            <img src="${compressed.data}" alt="Compressed image">
                        </div>
                        <div style="text-align: center; margin-top: 10px; color: #666;">
                        ${this.formatFileSize(compressed.size)} <br>
                        ⏱️ ${compressed.timeTaken} ms
                        </div>

                        <button class="download-btn" onclick="compressor.downloadImage(${index})">
                            Download ${compressed.name}
                        </button>
                    </div>
                </div>
            `;
            imagesContainer.innerHTML += imageComparisonHTML;
        });

        comparison.style.display = 'block';
    }

    downloadImage(index) {
        const compressed = this.compressedImages[index];
        const link = document.createElement('a');
        link.href = compressed.data;
        link.download = compressed.name;
        link.click();
    }

    downloadAll() {
        this.compressedImages.forEach((compressed, index) => {
            setTimeout(() => this.downloadImage(index), index * 500);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    reset() {
        this.originalImages = [];
        this.compressedImages = [];
        document.getElementById('controls').style.display = 'none';
        document.getElementById('comparison').style.display = 'none';
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('fileInput').value = '';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressText').textContent = '0%';
    }
}

// Initialize the application
const compressor = new ImageCompressor();