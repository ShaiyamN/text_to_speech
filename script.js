document.addEventListener("DOMContentLoaded", () => {
    let currentAudio = null;
    let isPaused = false;
    const pausePlayButton = document.getElementById('pause-play-button');
  
    const button = document.getElementById("convert-button");
    if (button) {
      button.addEventListener("click", () => {
        const fileInput = document.getElementById("file-input");
        const file = fileInput.files[0];
  
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.6.347/build/pdf.worker.js';
  
        const fileReader = new FileReader();
  
        fileReader.onload = function () {
          const pdfData = new Uint8Array(fileReader.result);
          pdfjsLib.getDocument(pdfData).promise.then(async function (pdf) {
            let promises = [];
            for (let i = 0; i < pdf.numPages; i++) {
              promises.push(pdf.getPage(i + 1).then(page => page.getTextContent()));
            }
  
            const textContents = await Promise.all(promises);
            let text = textContents.map(txt => txt.items.map(item => item.str).join("")).join("");
  
            const cleanedText = cleanText(text);
            const textChunks = splitTextIntoChunks(cleanedText, 1000);
  
            playChunksSequentially(textChunks);
          });
        };
  
        fileReader.readAsArrayBuffer(file);
      });
    }
  
    pausePlayButton.addEventListener('click', toggleAudio);
  
    // Event listener for the space bar to pause/play the audio
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        event.preventDefault();  // Prevent the default space bar scroll behavior
        toggleAudio();
      }
    });
  
    function toggleAudio() {
      if (currentAudio) {
        if (isPaused) {
          currentAudio.play();
          pausePlayButton.textContent = 'Pause';
          isPaused = false;
        } else {
          currentAudio.pause();
          pausePlayButton.textContent = 'Play';
          isPaused = true;
        }
      }
    }
  
    function cleanText(text) {
      return text.replace(/\s+/g, ' ').trim();
    }
  
    function splitTextIntoChunks(text, chunkSize) {
      const words = text.split(' ');
      let chunks = [];
      let currentChunk = "";
  
      words.forEach(word => {
        if (currentChunk.length + word.length + 1 > chunkSize) {
          chunks.push(currentChunk.trim());
          currentChunk = "";
        }
        currentChunk += word + " ";
      });
  
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
  
      return chunks;
    }
  
    async function playChunksSequentially(chunks) {
      for (let i = 0; i < chunks.length; i++) {
        const audioContent = await sendToTTS(chunks[i]);
        if (audioContent) {
          await playAudio(audioContent);
        } else {
          console.error("Skipping chunk due to an error:", chunks[i]);
        }
      }
    }
  
    async function sendToTTS(text) {
      const apiKey = 'your_API_key';
      const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
      const languageCode = 'en-US';
      const voice = {
        languageCode: languageCode,
        name: 'en-US-Wavenet-A',
        ssmlGender: 'NEUTRAL',
      };
  
      const data = {
        input: { text: text },
        voice: voice,
        audioConfig: { audioEncoding: 'MP3' },
      };
  
      try {
        const response = await fetch(ttsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
  
        const result = await response.json();
        if (result.audioContent) {
          return result.audioContent;
        } else {
          console.error("No audio content in TTS API response for chunk:", text);
          return null;
        }
      } catch (error) {
        console.error('Error with TTS API request for chunk:', error, 'Text:', text);
        return null;
      }
    }
  
    async function playAudio(audioContent) {
      return new Promise((resolve) => {
        currentAudio = new Audio(`data:audio/mp3;base64,${audioContent}`);
        currentAudio.play();
  
        currentAudio.onended = () => {
          resolve();
        };
      });
    }
  });
  