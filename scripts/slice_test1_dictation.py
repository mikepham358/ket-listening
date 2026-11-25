#!/usr/bin/env python3
"""
scripts/slice_test1_dictation.py
Cắt nhỏ audio cho 25 câu của Test 1 thành:
1. File audio của từng câu hỏi (q_1.mp3 -> q_25.mp3)
2. File audio của từng câu thoại đơn lẻ (q_1_s_1.mp3 -> q_25_s_n.mp3)
3. Cập nhật data/test_1.json với trường dictation_sentences
"""

import os
import json
import subprocess
import re

AUDIO_SRC = "/Users/mike/Library/CloudStorage/GoogleDrive-mikepham358@gmail.com/My Drive/Books/Kids/KET/Succeed/Audio.mp3"
FFMPEG = "/Users/mike/markitdown-venv/bin/ffmpeg"
OUT_DIR = "/Users/mike/Library/CloudStorage/GoogleDrive-mikepham358@gmail.com/My Drive/Books/Kids/KET/ket-listening/audio/test_1/dictation"
TEST_JSON = "/Users/mike/Library/CloudStorage/GoogleDrive-mikepham358@gmail.com/My Drive/Books/Kids/KET/ket-listening/data/test_1.json"

os.makedirs(OUT_DIR, exist_ok=True)

# Mốc thời gian tuyệt đối (giây) trên file Audio.mp3 gốc cho 25 câu của Test 1
# Mỗi câu có khoảng thời gian tổng thể (q_start, q_end) và danh sách các câu thoại lẻ
QUESTIONS_DATA = {
    1: {
        "q_start": 84.8, "q_end": 118.2,
        "sentences": [
            {"speaker": "F", "start": 91.4, "end": 94.24, "text": "What time shall I drive you to the airport?"},
            {"speaker": "M", "start": 94.24, "end": 97.75, "text": "Well, I should be there by 11.00 pm."},
            {"speaker": "F", "start": 97.75, "end": 103.04, "text": "I don't think you need to be that early. That means you will wait for two hours!"},
            {"speaker": "M", "start": 103.04, "end": 118.15, "text": "Ok. Let's leave at 11.30. It's only half an hour to get to the airport, so I'll have an hour to get to the plane by 13.00."}
        ]
    },
    2: {
        "q_start": 148.4, "q_end": 182.2,
        "sentences": [
            {"speaker": "M", "start": 154.8, "end": 158.64, "text": "Well, £50 is expensive for such a small meal!"},
            {"speaker": "F", "start": 158.64, "end": 164.64, "text": "I told you that this is an expensive restaurant!"},
            {"speaker": "M", "start": 164.64, "end": 169.04, "text": "I know! But we only got a salad and some chicken. The chicken alone was £35."},
            {"speaker": "F", "start": 169.04, "end": 182.2, "text": "Well, it could be worse. My sister paid over £70 here last week!"}
        ]
    },
    3: {
        "q_start": 213.2, "q_end": 246.0,
        "sentences": [
            {"speaker": "F", "start": 219.0, "end": 226.5, "text": "I'm looking for a new house. I want something near the city center, but not an apartment."},
            {"speaker": "M", "start": 226.5, "end": 234.0, "text": "There are some nice semi-detached houses near the park."},
            {"speaker": "F", "start": 234.0, "end": 246.0, "text": "No, I really prefer a detached house with a large garden so the children can play outside."}
        ]
    },
    4: {
        "q_start": 273.0, "q_end": 305.0,
        "sentences": [
            {"speaker": "F", "start": 279.0, "end": 283.5, "text": "Are you going shopping this afternoon?"},
            {"speaker": "M", "start": 283.5, "end": 289.0, "text": "Yes, I need to get a new pair of football boots. Mine are completely worn out."},
            {"speaker": "F", "start": 289.0, "end": 294.0, "text": "Don't you also need a new sports bag?"},
            {"speaker": "M", "start": 294.0, "end": 305.0, "text": "No, my sister bought me a great sports bag for my birthday, so just the boots."}
        ]
    },
    5: {
        "q_start": 334.5, "q_end": 369.0,
        "sentences": [
            {"speaker": "M", "start": 340.5, "end": 345.0, "text": "Did you have good weather for your camping trip at the weekend?"},
            {"speaker": "F", "start": 345.0, "end": 350.5, "text": "Well, it was supposed to rain, but luckily the clouds cleared on Saturday morning."},
            {"speaker": "M", "start": 350.5, "end": 355.0, "text": "So it was sunny all weekend?"},
            {"speaker": "F", "start": 355.0, "end": 369.0, "text": "No, it became very windy on Sunday, although it stayed dry."}
        ]
    },
    6: {
        "q_start": 449.0, "q_end": 466.0,
        "sentences": [
            {"speaker": "Speaker", "start": 449.7, "end": 466.0, "text": "As our last visit to the arts museum was so popular, I'm glad to say we're going to the music museum this time."}
        ]
    },
    7: {
        "q_start": 466.0, "q_end": 483.5,
        "sentences": [
            {"speaker": "Speaker", "start": 466.0, "end": 483.5, "text": "The coach leaves at 8.30 am, so we must have everyone on it by 8.20 at the latest."}
        ]
    },
    8: {
        "q_start": 483.5, "q_end": 494.5,
        "sentences": [
            {"speaker": "Speaker", "start": 483.5, "end": 494.5, "text": "We are going to meet at 8.00 outside the library. This is the building opposite the gym."}
        ]
    },
    9: {
        "q_start": 494.5, "q_end": 503.5,
        "sentences": [
            {"speaker": "Speaker", "start": 494.5, "end": 503.5, "text": "You can have your own snacks with you and you can buy water and drinks at the museum."}
        ]
    },
    10: {
        "q_start": 503.5, "q_end": 516.0,
        "sentences": [
            {"speaker": "Speaker", "start": 503.5, "end": 516.0, "text": "Tickets cost £9.50, but as we are a large group, we get a £3 discount, so that's £6.50."}
        ]
    },
    11: {
        "q_start": 612.0, "q_end": 632.0,
        "sentences": [
            {"speaker": "Lee", "start": 615.0, "end": 632.0, "text": "My friends and I are going to the rock concert tonight at the stadium."}
        ]
    },
    12: {
        "q_start": 632.0, "q_end": 652.0,
        "sentences": [
            {"speaker": "Lee", "start": 635.0, "end": 652.0, "text": "I didn't buy them. I actually won them in a local radio competition!"}
        ]
    },
    13: {
        "q_start": 652.0, "q_end": 672.0,
        "sentences": [
            {"speaker": "Lee", "start": 654.0, "end": 672.0, "text": "I heard the radio host announce it on Wednesday morning while having breakfast."}
        ]
    },
    14: {
        "q_start": 672.0, "q_end": 692.0,
        "sentences": [
            {"speaker": "Lee", "start": 675.0, "end": 692.0, "text": "The show starts at 8.00, so we agreed to meet at 7.15 outside."}
        ]
    },
    15: {
        "q_start": 692.0, "q_end": 715.0,
        "sentences": [
            {"speaker": "Lee", "start": 695.0, "end": 715.0, "text": "We'll meet right next to the statue in the main square before walking across."}
        ]
    },
    16: {
        "q_start": 825.0, "q_end": 855.0,
        "sentences": [
            {"speaker": "F", "start": 830.0, "end": 837.0, "text": "I finally sold my old car yesterday."},
            {"speaker": "M", "start": 837.0, "end": 843.0, "text": "Why? Was it too slow or using too much petrol?"},
            {"speaker": "F", "start": 843.0, "end": 855.0, "text": "No, it ran fine, but it was just too small now that we have two big dogs."}
        ]
    },
    17: {
        "q_start": 885.0, "q_end": 915.0,
        "sentences": [
            {"speaker": "M", "start": 890.0, "end": 915.0, "text": "The kitchen sink is leaking badly, so I'm calling a plumber right away."}
        ]
    },
    18: {
        "q_start": 950.0, "q_end": 980.0,
        "sentences": [
            {"speaker": "Speaker", "start": 955.0, "end": 980.0, "text": "They are choosing which film to watch together at the cinema this evening."}
        ]
    },
    19: {
        "q_start": 1015.0, "q_end": 1048.0,
        "sentences": [
            {"speaker": "F", "start": 1020.0, "end": 1048.0, "text": "I'm calling to say my train has been delayed, so I won't arrive until 6.30."}
        ]
    },
    20: {
        "q_start": 1080.0, "q_end": 1115.0,
        "sentences": [
            {"speaker": "F", "start": 1085.0, "end": 1093.0, "text": "Look at this lovely silver necklace John gave me for my birthday!"},
            {"speaker": "M", "start": 1093.0, "end": 1100.0, "text": "I thought he was going to buy you a watch or a book?"},
            {"speaker": "F", "start": 1100.0, "end": 1115.0, "text": "He knew I really wanted some jewelry, so the necklace was a wonderful surprise."}
        ]
    },
    21: {
        "q_start": 1180.0, "q_end": 1205.0,
        "sentences": [
            {"speaker": "Speaker", "start": 1184.0, "end": 1205.0, "text": "Marco is very artistic, so he will be in charge of designing and painting the stage background."}
        ]
    },
    22: {
        "q_start": 1205.0, "q_end": 1228.0,
        "sentences": [
            {"speaker": "Speaker", "start": 1208.0, "end": 1228.0, "text": "Mary loves fashion, so she volunteered to organize and fit all the actors' costumes."}
        ]
    },
    23: {
        "q_start": 1228.0, "q_end": 1250.0,
        "sentences": [
            {"speaker": "Speaker", "start": 1230.0, "end": 1250.0, "text": "Robert is good with computers, so he will control the lights and music during the performance."}
        ]
    },
    24: {
        "q_start": 1250.0, "q_end": 1272.0,
        "sentences": [
            {"speaker": "Speaker", "start": 1252.0, "end": 1272.0, "text": "Ivanna will help make the colorful posters and hand out advertising leaflets around school."}
        ]
    },
    25: {
        "q_start": 1272.0, "q_end": 1295.0,
        "sentences": [
            {"speaker": "Speaker", "start": 1274.0, "end": 1295.0, "text": "David is responsible for selling tickets at the school entrance before each show."}
        ]
    }
}

print("Bắt đầu cắt nhỏ audio câu hỏi và câu thoại...")
for q_num, data in QUESTIONS_DATA.items():
    # 1. Cắt audio cho câu hỏi tổng thể
    q_file = f"q_{q_num}.mp3"
    q_path = os.path.join(OUT_DIR, q_file)
    cmd_q = [
        FFMPEG, "-y", "-ss", str(data["q_start"]), "-to", str(data["q_end"]),
        "-i", AUDIO_SRC, "-c:a", "libmp3lame", "-b:a", "64k", q_path
    ]
    subprocess.run(cmd_q, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 2. Cắt audio cho từng câu thoại lẻ
    for s_idx, sent in enumerate(data["sentences"], 1):
        s_file = f"q_{q_num}_s_{s_idx}.mp3"
        s_path = os.path.join(OUT_DIR, s_file)
        cmd_s = [
            FFMPEG, "-y", "-ss", str(sent["start"]), "-to", str(sent["end"]),
            "-i", AUDIO_SRC, "-c:a", "libmp3lame", "-b:a", "64k", s_path
        ]
        subprocess.run(cmd_s, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        sent["audio_file"] = f"audio/test_1/dictation/{s_file}"
        words = re.findall(r"\w+", sent["text"])
        sent["word_count"] = len(words)
        sent["id"] = f"s{s_idx}"

    data["audio_question"] = f"audio/test_1/dictation/{q_file}"
    print(f"-> Đã cắt xong Q{q_num}: {len(data['sentences'])} câu thoại")

# Cập nhật vào data/test_1.json
with open(TEST_JSON, "r", encoding="utf-8") as f:
    test_json_data = json.load(f)

for q in test_json_data["questions"]:
    qn = q["q_number"]
    if qn in QUESTIONS_DATA:
        q["audio_question"] = QUESTIONS_DATA[qn]["audio_question"]
        q["dictation_sentences"] = QUESTIONS_DATA[qn]["sentences"]

with open(TEST_JSON, "w", encoding="utf-8") as f:
    json.dump(test_json_data, f, ensure_ascii=False, indent=2)

print("Hoàn thành cập nhật data/test_1.json!")
