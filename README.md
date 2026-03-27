# Timelapse Maker

Timelapse Maker is a local web application that allows you to easily upload large video files, visually trim and crop them, and process them into YouTube-ready timelapses. Everything is processed locally on your machine for maximum privacy and performance.

## Features
- **Local Video Processing**: Powered by `@ffmpeg-installer` and `fluent-ffmpeg` to process your videos locally on your Mac.
- **Visual Cropping & Trimming**: An interactive UI for real-time video previewing and editing.
- **Resource Management**: Configured to limit intensive CPU processes (like rendering threads) to keep your desktop responsive.
- **Accurate Progress Tracking**: See accurate rendering progress on the UI without blocking your browser.

## Requirements
- **Node.js**: Ensure you have Node installed locally.
- **FFmpeg**: Uses bundled `ffmpeg` dependencies, so manual installation of FFmpeg on your system is not required.

## Installation 

1. Clone the repository:
   ```bash
   git clone https://github.com/jayaprakashnarayana/timelapse-maker.git
   cd timelapse-maker
   ```
2. Install the necessary Node dependencies:
   ```bash
   npm install
   ```

## Running the Application

Start the local server by running:
```bash
npm start
```
By default, the application will run at [http://localhost:3000](http://localhost:3000). Open this URL in your browser to start uploading and editing videos.
