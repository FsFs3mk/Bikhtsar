const recordButton = document.getElementById("recordButton");
const audioPlayer = document.getElementById("audioPlayer");
const transcription = document.getElementById("transcription");
const summary = document.getElementById("summary");
const uploadInput = document.getElementById("uploadInput");
const uploadButton = document.getElementById("uploadButton");
const frequencySpectrum = document.getElementById("frequencySpectrum");
let audioContext;

uploadButton.addEventListener("click", () => {
  uploadInput.click();
});

uploadInput.addEventListener("change", async () => {
  if (uploadInput.files.length > 0) {
    const formData = new FormData();
    formData.append("audio", uploadInput.files[0]);
    formData.append("language", "ar");

    const response = await fetch("/summarize", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    transcription.value = data.transcription;
    summary.value = data.summary;
    audioPlayer.style.display = "block";
    frequencySpectrum.style.display = "block";
    displayFrequencySpectrum();
  }
});

let isRecording = false;

recordButton.addEventListener("click", () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

let recorder;

async function startRecording() {
  isRecording = true;
  recordButton.textContent = "إيقاف التسجيل";

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  recorder = new Recorder(source);
  recorder.record();
}

async function stopRecording() {
  isRecording = false;
  recordButton.textContent = "بدء التسجيل";

  recorder.stop();
  recorder.exportWAV(async (blob) => {
    const audioURL = URL.createObjectURL(blob);
    audioPlayer.src = audioURL;
    audioPlayer.style.display = "block";
    frequencySpectrum.style.display = "block";

    const formData = new FormData();
    formData.append("audio", blob);
    formData.append("language", "ar");

    const response = await fetch("/summarize", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    transcription.value = data.transcription;
    summary.value = data.summary;
  });
}


function displayFrequencySpectrum() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  const source = audioContext.createMediaElementSource(audioPlayer);
  const analyzer = audioContext.createAnalyser();
  source.connect(analyzer);
  analyzer.connect(audioContext.destination);

  const bufferLength = analyzer.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const canvasContext = frequencySpectrum.getContext("2d");
  const width = frequencySpectrum.width;
  const height = frequencySpectrum.height;

  function draw() {
    requestAnimationFrame(draw);

    analyzer.getByteFrequencyData(dataArray);

    canvasContext.fillStyle = "rgba(0, 0, 0, 0.5)";
    canvasContext.fillRect(0, 0, width, height);

    const barWidth = (width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i] / 2;

      canvasContext.fillStyle = "rgb(" + (barHeight + 100) + ",50,50)";
      canvasContext.fillRect(x, height - barHeight / 2, barWidth, barHeight);

      x += barWidth + 1;
    }
  }

  audioPlayer.addEventListener('play', () => {
    audioContext.resume().then(() => {
      draw();
    });
  });
}
