const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffmpegPath = ffmpegInstaller.path;
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const ffprobePath = ffprobeInstaller.path;
const ffmpeg = require('fluent-ffmpeg');
// Set the path to the ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Ensure uploads and output directories exist
const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'public', 'output');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Handle File uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `input-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// We need to accept large files, so we don't put a harsh file size limit.
const upload = multer({ storage: storage });

const progressMap = new Map();

app.post('/api/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video uploaded' });
  }

  const speed = parseFloat(req.body.speed) || 10;
  const trimStart = req.body.trimStart || null;
  const trimEnd = req.body.trimEnd || null;
  const cropW = req.body.cropW || null;
  const cropH = req.body.cropH || null;

  const inputPath = req.file.path;
  const requestId = req.body.requestId || Date.now().toString();
  const outputFilename = `timelapse-${requestId}.mp4`;
  const outputPath = path.join(outputDir, outputFilename);

  progressMap.set(requestId, { progress: 0, status: 'processing' });

  // Use ffprobe to get the source video duration first
  ffmpeg.ffprobe(inputPath, (err, metadata) => {
    let originalDuration = 0;
    if (!err && metadata && metadata.format && metadata.format.duration) {
      originalDuration = parseFloat(metadata.format.duration);
    }

    const parseTime = (t) => {
        if(!t) return null;
        if(!t.includes(':')) return parseFloat(t);
        const parts = t.split(':');
        if(parts.length === 3) return parseInt(parts[0])*3600 + parseInt(parts[1])*60 + parseFloat(parts[2]);
        if(parts.length === 2) return parseInt(parts[0])*60 + parseFloat(parts[1]);
        return 0;
    };
    
    const startSecs = parseTime(trimStart) || 0;
    const endSecs = parseTime(trimEnd) || originalDuration || 1;
    const actualInputDuration = (endSecs > startSecs && trimEnd) ? (endSecs - startSecs) : (Math.max(1, originalDuration - startSecs));
    
    const targetOutputDuration = actualInputDuration / speed;

    let videoFilters = [];
    if (cropW && cropH) {
      videoFilters.push(`crop=${cropW}:${cropH}`);
    }
    videoFilters.push(`setpts=${1 / speed}*PTS`);

    let cmd = ffmpeg(inputPath);
    if (trimStart) cmd = cmd.setStartTime(trimStart);
    if (trimEnd) cmd = cmd.setDuration(actualInputDuration);

    cmd.outputOptions([
      '-an', // Mute audio
      '-c:v libx264', // H.264 video codec for YouTube compatibility
      '-preset fast', // Good balance of speed and compression
      '-threads 2', // Limit CPU usage to 2 threads to prevent system unresponsiveness
    ])
    .videoFilters(videoFilters)
    .on('progress', (progress) => {
      if (progress.percent !== undefined) {
        progressMap.set(requestId, { progress: progress.percent, status: 'processing' });
      } else if (progress.timemark && targetOutputDuration > 0) {
        const timeparts = progress.timemark.split(':');
        if (timeparts.length === 3) {
          const currentSecs = parseInt(timeparts[0]) * 3600 + parseInt(timeparts[1]) * 60 + parseFloat(timeparts[2]);
          let calcPercent = (currentSecs / targetOutputDuration) * 100;
          if (calcPercent > 100) calcPercent = 100;
          progressMap.set(requestId, { progress: calcPercent, status: 'processing' });
        }
      }
    })
    .on('end', () => {
      progressMap.set(requestId, {
        progress: 100,
        status: 'done',
        downloadUrl: `/api/download/${outputFilename}`
      });
      console.log(`Finished processing ${outputFilename}`);
      fs.unlink(inputPath, err => {
        if(err) console.error("Could not delete input file", err);
      });
    })
    .on('error', (err) => {
      console.error('Error processing video:', err);
      progressMap.set(requestId, { progress: 0, status: 'error', error: err.message });
      fs.unlink(inputPath, () => {});
    })
    .save(outputPath);
  });

  // Respond immediately, client will poll for progress
  res.json({
    message: 'Video upload successful, processing started',
    requestId: requestId
  });
});

app.get('/api/progress/:requestId', (req, res) => {
  const reqId = req.params.requestId;
  if (progressMap.has(reqId)) {
    res.json(progressMap.get(reqId));
  } else {
    res.status(404).json({ error: 'Request ID not found' });
  }
});

app.get('/api/download/:filename', (req, res) => {
  const filePath = path.join(outputDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, req.params.filename, (err) => {
      if (err) console.error("Download error:", err);
    });
  } else {
    res.status(404).send('File not found');
  }
});

app.listen(port, () => {
  console.log(`Timelapse Maker app listening at http://localhost:${port}`);
});
