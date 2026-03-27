# Project Rules & Safeguards

When working on any software or hardware-intensive applications (like video/audio processing, ML, or heavy computation), always prioritize appropriate CPU and GPU guard rails. 

This includes:
- **Resource Limits:** Explicit memory caps and CPU core allocations to avoid system hangs.
- **Throttling & Batching:** Chunking operations into manageable, sequential tasks.
- **Timeouts & Cleanups:** Implementing hard timeouts, graceful shutdowns, and killing child processes.
- **Monitoring:** Tracking progress accurately and providing robust fail-safes.
