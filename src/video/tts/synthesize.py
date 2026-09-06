#!/usr/bin/env python3
"""
High-quality neural TTS synthesizer using edge-tts.
Outputs:
1. MP3 audio file
2. JSON file with sentence and word-level timestamps compatible with @remotion/captions
"""

import sys
import os
import json
import asyncio
import argparse
import re
import edge_tts

def split_sentence_into_words(sentence_text, start_ms, duration_ms):
    # Strip any extra spaces
    raw_words = sentence_text.strip().split()
    if not raw_words:
        return []
    
    # Calculate word weights based on character length (minimum weight 1)
    weights = [max(len(w), 1) for w in raw_words]
    total_weight = sum(weights)
    
    word_tokens = []
    current_ms = start_ms
    
    for i, word in enumerate(raw_words):
        word_dur = (weights[i] / total_weight) * duration_ms
        word_start = current_ms
        word_end = current_ms + word_dur
        current_ms = word_end
        
        word_tokens.append({
            "text": word,
            "startMs": round(word_start),
            "endMs": round(word_end),
            "timestampMs": round(word_start)
        })
        
    return word_tokens

async def synthesize(text, voice, out_audio_path, out_json_path, rate="+0%", pitch="+0Hz"):
    os.makedirs(os.path.dirname(os.path.abspath(out_audio_path)), exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(out_json_path)), exist_ok=True)
    
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    
    sentences = []
    all_words = []
    
    with open(out_audio_path, "wb") as audio_file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_file.write(chunk["data"])
            elif chunk["type"] == "SentenceBoundary":
                start_ms = chunk["offset"] / 10000.0
                duration_ms = chunk["duration"] / 10000.0
                sentence_text = chunk["text"]
                
                sentences.append({
                    "text": sentence_text,
                    "startMs": round(start_ms),
                    "endMs": round(start_ms + duration_ms),
                    "durationMs": round(duration_ms)
                })
                
                words = split_sentence_into_words(sentence_text, start_ms, duration_ms)
                all_words.extend(words)

    total_duration_ms = sentences[-1]["endMs"] if sentences else 0
    
    result = {
        "text": text,
        "voice": voice,
        "durationMs": total_duration_ms,
        "durationSeconds": total_duration_ms / 1000.0,
        "sentences": sentences,
        "words": all_words
    }
    
    with open(out_json_path, "w", encoding="utf-8") as jf:
        json.dump(result, jf, ensure_ascii=False, indent=2)
        
    print(json.dumps({
        "status": "success",
        "durationSeconds": total_duration_ms / 1000.0,
        "wordsCount": len(all_words),
        "sentencesCount": len(sentences),
        "audioPath": out_audio_path,
        "jsonPath": out_json_path
    }))

def main():
    parser = argparse.ArgumentParser(description="Generate TTS with word-level captions")
    parser.add_argument("--text", required=True, help="Text to speak")
    parser.add_argument("--voice", default="es-ES-AlvaroNeural", help="Edge TTS voice name")
    parser.add_argument("--out-audio", required=True, help="Destination mp3 file")
    parser.add_argument("--out-json", required=True, help="Destination json file")
    parser.add_argument("--rate", default="+0%", help="Rate modification e.g. +5%%")
    parser.add_argument("--pitch", default="+0Hz", help="Pitch modification")
    
    args = parser.parse_args()
    asyncio.run(synthesize(args.text, args.voice, args.out_audio, args.out_json, rate=args.rate, pitch=args.pitch))

if __name__ == "__main__":
    main()
