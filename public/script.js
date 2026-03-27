document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const videoInput = document.getElementById('videoInput');
    const fileNameDisplay = document.getElementById('fileName');
    const fileInfo = document.getElementById('fileInfo');
    const dropTitle = document.querySelector('.drop-title');
    const dropSubtitle = document.querySelector('.drop-subtitle');
    const uploadIcon = document.querySelector('.upload-icon');
    
    const uploadForm = document.getElementById('uploadForm');
    
    const videoPreviewContainer = document.getElementById('videoPreviewContainer');
    const videoPreview = document.getElementById('videoPreview');
    const trimStartSlider = document.getElementById('trimStartSlider');
    const trimEndSlider = document.getElementById('trimEndSlider');
    const startMarkerLabel = document.getElementById('startMarkerLabel');
    const endMarkerLabel = document.getElementById('endMarkerLabel');

    function formatTime(seconds) {
        if (isNaN(seconds)) return "00:00:00";
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    videoPreview.addEventListener('loadedmetadata', () => {
        const duration = videoPreview.duration;
        trimStartSlider.max = duration;
        trimEndSlider.max = duration;
        trimEndSlider.value = duration;
        trimStartSlider.value = 0;
        
        startMarkerLabel.textContent = formatTime(0);
        endMarkerLabel.textContent = formatTime(duration);
    });

    trimStartSlider.addEventListener('input', (e) => {
        videoPreview.pause();
        const val = parseFloat(e.target.value);
        const endVal = parseFloat(trimEndSlider.value);
        if (val >= endVal) {
            trimStartSlider.value = endVal - 0.1;
        }
        startMarkerLabel.textContent = formatTime(trimStartSlider.value);
        videoPreview.currentTime = parseFloat(trimStartSlider.value);
    });

    trimEndSlider.addEventListener('input', (e) => {
        videoPreview.pause();
        const val = parseFloat(e.target.value);
        const startVal = parseFloat(trimStartSlider.value);
        if (val <= startVal) {
            trimEndSlider.value = startVal + 0.1;
        }
        endMarkerLabel.textContent = formatTime(trimEndSlider.value);
        videoPreview.currentTime = parseFloat(trimEndSlider.value);
    });

    // Real-time Preview: Speed
    const speedSelect = document.getElementById('speedSelect');
    speedSelect.addEventListener('change', () => {
        videoPreview.playbackRate = parseFloat(speedSelect.value);
    });

    // Real-time Preview: Crop
    const cropW = document.getElementById('cropW');
    const cropH = document.getElementById('cropH');
    function updateCropPreview() {
        const w = parseFloat(cropW.value);
        const h = parseFloat(cropH.value);
        if (w > 0 && h > 0) {
            // Simulates center crop
            videoPreview.style.aspectRatio = `${w} / ${h}`;
            videoPreview.style.objectFit = 'cover';
        } else {
            videoPreview.style.aspectRatio = 'auto';
            videoPreview.style.objectFit = 'contain';
        }
    }
    cropW.addEventListener('input', updateCropPreview);
    cropH.addEventListener('input', updateCropPreview);

    // Enforce playback bounds based on markers
    videoPreview.addEventListener('timeupdate', () => {
        const endVal = parseFloat(trimEndSlider.value);
        const startVal = parseFloat(trimStartSlider.value);
        // If the video plays past the end marker, loop back to the start marker and pause
        if (videoPreview.currentTime >= endVal && endVal < videoPreview.duration) {
            videoPreview.pause();
            videoPreview.currentTime = startVal;
        }
    });
    
    const progressSection = document.getElementById('progressSection');
    const progressBarFill = document.getElementById('progressBarFill');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressStatus = document.getElementById('progressStatus');
    const progressDetail = document.getElementById('progressDetail');
    
    const resultSection = document.getElementById('resultSection');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');

    let currentRequestId = null;
    let pollInterval = null;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            videoInput.files = files;
            updateFileInfo();
        }
    });

    videoInput.addEventListener('change', updateFileInfo);

    function updateFileInfo() {
        if (videoInput.files.length > 0) {
            const file = videoInput.files[0];
            fileNameDisplay.textContent = file.name;
            fileInfo.classList.remove('hidden');
            dropTitle.classList.add('hidden');
            dropSubtitle.classList.add('hidden');
            uploadIcon.classList.add('hidden');
            
            const objectUrl = URL.createObjectURL(file);
            videoPreview.src = objectUrl;
            videoPreviewContainer.classList.remove('hidden');
            
            // Set initial playback rate to match UI
            videoPreview.playbackRate = parseFloat(speedSelect.value);
        } else {
            fileInfo.classList.add('hidden');
            dropTitle.classList.remove('hidden');
            dropSubtitle.classList.remove('hidden');
            uploadIcon.classList.remove('hidden');
            
            videoPreviewContainer.classList.add('hidden');
            videoPreview.src = "";
        }
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (videoInput.files.length === 0) return;

        const formData = new FormData();
        formData.append('video', videoInput.files[0]);
        formData.append('speed', document.getElementById('speedSelect').value);
        
        const tStart = parseFloat(trimStartSlider.value);
        const tEnd = parseFloat(trimEndSlider.value);
        if(tStart > 0) formData.append('trimStart', tStart);
        if(videoPreview.duration && tEnd < videoPreview.duration) formData.append('trimEnd', tEnd);
        
        if(document.getElementById('cropW').value) formData.append('cropW', document.getElementById('cropW').value);
        if(document.getElementById('cropH').value) formData.append('cropH', document.getElementById('cropH').value);
        currentRequestId = Date.now().toString();
        formData.append('requestId', currentRequestId);

        uploadForm.classList.add('hidden');
        progressSection.classList.remove('hidden');
        progressStatus.textContent = 'Uploading Video...';
        progressDetail.textContent = 'This might take a few minutes for large files.';
        progressBarFill.style.width = '0%';
        progressPercentage.textContent = '0%';

        try {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    progressBarFill.style.width = percentComplete + '%';
                    progressPercentage.textContent = percentComplete + '%';
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    progressStatus.textContent = 'Processing Video...';
                    progressDetail.textContent = 'FFmpeg is generating your timelapse.';
                    progressBarFill.style.width = '0%';
                    progressPercentage.textContent = '0%';
                    startPolling();
                } else {
                    handleError('Upload failed. Server responded with an error.');
                }
            });

            xhr.addEventListener('error', () => {
                handleError('Network error occurred during upload.');
            });

            xhr.open('POST', '/api/upload');
            xhr.send(formData);

        } catch (error) {
            handleError(error.message);
        }
    });

    function startPolling() {
        if (pollInterval) clearInterval(pollInterval);
        
        pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/progress/${currentRequestId}`);
                if (!res.ok) return;
                
                const data = await res.json();
                
                if (data.status === 'processing') {
                    const percent = Math.min(Math.round(data.progress || 0), 99);
                    progressBarFill.style.width = percent + '%';
                    progressPercentage.textContent = percent + '%';
                } else if (data.status === 'done') {
                    finishProcessing(data.downloadUrl);
                } else if (data.status === 'error') {
                    handleError(data.error);
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 1000);
    }

    function finishProcessing(downloadUrl) {
        clearInterval(pollInterval);
        progressSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        downloadBtn.href = downloadUrl;
    }

    function handleError(msg) {
        clearInterval(pollInterval);
        progressStatus.textContent = 'Error Occurred';
        progressStatus.style.color = '#ef4444';
        progressPercentage.textContent = 'Failed';
        progressDetail.textContent = msg;
        progressBarFill.style.background = '#ef4444';
        progressBarFill.style.width = '100%';
    }

    resetBtn.addEventListener('click', () => {
        uploadForm.reset();
        currentRequestId = null;
        updateFileInfo();
        
        resultSection.classList.add('hidden');
        uploadForm.classList.remove('hidden');
        
        progressStatus.style.color = '';
        progressBarFill.style.background = '';
    });
});
