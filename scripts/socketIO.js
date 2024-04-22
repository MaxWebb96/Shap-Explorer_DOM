const socket = io('http://localhost:5000/');

socket.on('progress', function(data) {
    const progressBar = document.getElementById('progressBar');
    progressBar.value = data.progress;
    console.log(`Progress: ${data.progress}%`); // Log progress to console
});

socket.on('connect', function() {
    console.log('Connected to server via WebSocket');
    startProcess();  // Call this to emit start_process after connection
});

// To start the process and join the specific room
function startProcess() {
    console.log('Emitting start_process event');
    socket.emit('start_process', { text: 'Your text here', guidance_scale: 16.0 });
}

socket.on('connect', function() {
    console.log('Connected to WebSocket server');
});

socket.on('disconnect', function() {
    console.log('Disconnected from WebSocket server');
});

socket.on('connect_error', (error) => {
    console.log('Connection Error:', error);
});
