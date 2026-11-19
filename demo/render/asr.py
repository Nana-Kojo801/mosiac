# Transcribes the final mix for the caption accuracy check (spec 22.5).
#   python render/asr.py demo/out/mosaic-demo.mp4  -> JSON {"text": ...} on stdout
import json, sys
from faster_whisper import WhisperModel

model = WhisperModel("base.en", device="cpu", compute_type="int8")
segments, _ = model.transcribe(sys.argv[1], language="en", beam_size=5, vad_filter=True)
print(json.dumps({"model": "faster-whisper base.en", "text": " ".join(s.text.strip() for s in segments)}))
