# Transcribes the final mix for the caption accuracy check (spec 22.5).
#   python render/asr.py demo/out/mosaic-demo.mp4  -> JSON {"text": ...} on stdout
import json, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

# Decode with ffmpeg (16 kHz mono float) rather than PyAV, so the check doesn't depend on PyAV versions.
pcm = subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-i", sys.argv[1], "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.float32)
model = WhisperModel("base.en", device="cpu", compute_type="int8")
segments, _ = model.transcribe(audio, language="en", beam_size=5, vad_filter=True)
print(json.dumps({"model": "faster-whisper base.en", "text": " ".join(s.text.strip() for s in segments)}))
