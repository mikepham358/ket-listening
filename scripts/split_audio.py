#!/usr/bin/env python3
"""
scripts/split_audio.py
Cắt nhỏ file Audio.mp3 thành 8 Tests x 5 Parts = 40 audio tracks độc lập
sử dụng ffmpeg stream copy (-c copy) siêu nhanh và không suy hao chất lượng.
"""

import os
import re
import json
import subprocess

AUDIO_INPUT = "/Users/mike/Library/CloudStorage/GoogleDrive-mikepham358@gmail.com/My Drive/Books/Kids/KET/Succeed/Audio.mp3"
VTT_INPUT = "/tmp/KET Listening FULL  - SUCCEED in A2 Key with KET PET Mr Mol - www.sachluyenthitienganh.com [V0uJtEPyuao].en-orig.vtt"
OUTPUT_DIR = "/Users/mike/Library/CloudStorage/GoogleDrive-mikepham358@gmail.com/My Drive/Books/Kids/KET/ket-listening/audio"
FFMPEG_BIN = "/Users/mike/markitdown-venv/bin/ffmpeg"

def parse_time(ts):
    parts = ts.strip().split(':')
    if len(parts) == 3:
        h, m, s = parts
        return float(h)*3600 + float(m)*60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return float(m)*60 + float(s)
    return 0.0

def load_vtt_events():
    time_pattern = re.compile(r'(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})')
    events = []
    current_start = 0.0
    with open(VTT_INPUT, 'r', encoding='utf-8') as f:
        for line in f:
            m = time_pattern.search(line)
            if m:
                current_start = parse_time(m.group(1))
            elif line.strip():
                txt = re.sub(r'<[^>]+>', '', line.strip()).replace('&gt;', '').strip()
                events.append((current_start, txt))
    return events

def detect_part_intervals(events):
    # Find all 40 parts
    parts_start = []
    curr_test = 1
    curr_part = 0

    for t, txt in events:
        txt_l = txt.lower()
        for p_num, p_word in [(1, 'part one'), (2, 'part two'), (3, 'part three'), (4, 'part four'), (5, 'part five'),
                              (1, 'part 1'), (2, 'part 2'), (3, 'part 3'), (4, 'part 4'), (5, 'part 5')]:
            if p_word in txt_l and ('now look' in txt_l or 'instructions for' in txt_l or 'part ' in txt_l):
                if p_num == 1 and curr_part == 5:
                    curr_test += 1
                    curr_part = 1
                    parts_start.append({'test': curr_test, 'part': 1, 'start': t, 'text': txt})
                    break
                elif p_num == curr_part + 1:
                    curr_part = p_num
                    parts_start.append({'test': curr_test, 'part': p_num, 'start': t, 'text': txt})
                    break
    
    # Also find "That is the end of part X" or "That is the end of the test"
    # To determine clean end times
    intervals = []
    for i, p in enumerate(parts_start):
        t_start = max(0.0, p['start'] - 1.0) # 1 sec buffer before announcement
        if i + 1 < len(parts_start):
            next_start = parts_start[i+1]['start']
            # Find end of part between p['start'] and next_start
            end_candidates = [t for t, txt in events if p['start'] < t < next_start and ('end of part' in txt.lower() or 'end of the test' in txt.lower())]
            if end_candidates:
                t_end = end_candidates[-1] + 6.0 # 6s buffer after 'end of part'
            else:
                t_end = next_start - 1.0
        else:
            # Last part (Test 8 Part 5)
            end_test = [t for t, txt in events if t > p['start'] and 'end of the test' in txt.lower()]
            t_end = end_test[0] + 5.0 if end_test else p['start'] + 240.0
            
        intervals.append({
            'test': p['test'],
            'part': p['part'],
            'start': round(t_start, 2),
            'end': round(t_end, 2),
            'duration': round(t_end - t_start, 2)
        })
    return intervals

def split_all():
    events = load_vtt_events()
    intervals = detect_part_intervals(events)
    print(f"Tổng số phần thi được phát hiện: {len(intervals)}")
    
    manifest = {}
    for item in intervals:
        t = item['test']
        p = item['part']
        test_dir = os.path.join(OUTPUT_DIR, f"test_{t}")
        os.makedirs(test_dir, exist_ok=True)
        out_filename = f"part_{p}.mp3"
        out_path = os.path.join(test_dir, out_filename)
        rel_path = f"audio/test_{t}/{out_filename}"
        
        # ffmpeg stream copy
        cmd = [
            FFMPEG_BIN, "-y",
            "-ss", str(item['start']),
            "-to", str(item['end']),
            "-i", AUDIO_INPUT,
            "-c", "copy",
            out_path
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        file_size_mb = os.path.getsize(out_path) / (1024 * 1024)
        print(f"  [Test {t} - Part {p}] {item['start']}s -> {item['end']}s ({item['duration']}s) => {out_filename} ({file_size_mb:.2f} MB)")
        
        if f"test_{t}" not in manifest:
            manifest[f"test_{t}"] = {}
        manifest[f"test_{t}"][f"part_{p}"] = {
            "path": rel_path,
            "start_sec": item['start'],
            "end_sec": item['end'],
            "duration_sec": item['duration'],
            "size_mb": round(file_size_mb, 2)
        }
        
    manifest_file = os.path.join(OUTPUT_DIR, "audio_manifest.json")
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"\n🎉 Hoàn thành cắt 40 audio tracks! Manifest lưu tại: {manifest_file}")

if __name__ == '__main__':
    split_all()
