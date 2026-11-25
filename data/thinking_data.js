// data/thinking_data.js — Dữ liệu & Động cơ Tư Duy Tiếng Anh KET Cambridge
// Ứng dụng Tư Duy Tiếng Anh:
// - Mức 1: Câu hỏi tư duy trắc nghiệm để hiểu transcript và nhận diện các bẫy phổ biến
// - Mức 2: Bài tập Paraphrasing (đồng nghĩa, trái nghĩa), cụm từ vựng mới & giải thích tại sao lựa chọn đúng/sai

window.ThinkingEngine = {
  // Dữ liệu biên soạn chi tiết cho các câu hỏi điển hình
  curatedData: {
    // Test 1 - Question 1: Plane leaving time
    "1_1": {
      tier1_thinking: {
        trap_question: {
          prompt: "Trong đoạn audio, người nói đã sử dụng loại BẪY ĐỀ THI phổ biến nào?",
          options: [
            { id: "A", text: "🔄 Bẫy Đổi Ý Phút Chót: Ban đầu hẹn giờ khác nhưng sau đó đổi ý", is_correct: false },
            { id: "B", text: "⏳ Bẫy Thì Thời Gian & Mốc Giờ Nhiễu: Nhắc đến giờ đi xe (11:30) và giờ đến sớm (11:00) để gây nhiễu cho giờ bay (13:00)", is_correct: true },
            { id: "C", text: "🔢 Bẫy Chính Tả: Đánh vần tên riêng có chữ kép", is_correct: false },
            { id: "D", text: "🪞 Bẫy Lặp Từ: Dùng từ y hệt trong câu hỏi nhưng sai ngữ cảnh", is_correct: false }
          ],
          explanation: "Người nói đưa ra liên tiếp 3 mốc giờ: 11:00 (giờ người đàn ông định đến để chờ), 11:30 (giờ người phụ nữ đề xuất xuất phát bằng ô tô), và 13:00 (giờ máy bay cất cánh thực tế). Đây là bẫy phân tán thời gian kinh điển của Cambridge."
        },
        comprehension_question: {
          prompt: "Theo transcript, tại sao người phụ nữ nói người đàn ông KHÔNG NÊN đến sân bay lúc 11:00?",
          options: [
            { id: "A", text: "Vì máy bay sẽ cất cánh sớm hơn dự kiến vào buổi sáng", is_correct: false },
            { id: "B", text: "Vì nếu đến lúc 11:00, anh ấy sẽ phải ngồi đợi ở sân bay tận 2 tiếng ('wait for two hours')", is_correct: true },
            { id: "C", text: "Vì đường ra sân bay đang bị tắc mất 2 tiếng", is_correct: false }
          ],
          explanation: "Người phụ nữ khuyên: 'I don't think you need to be that early. That means you will wait for two hours!'. Chuyến bay 13:00 chỉ cần có mặt trước 1 tiếng."
        }
      },
      tier2_paraphrase: {
        vocab_bank: [
          { phrase: "get to the plane by 13.00", meaning: "lên máy bay lúc 13h (cất cánh)", relation: "synonym", target: "plane leaving at 13.00" },
          { phrase: "leave / depart", meaning: "xuất phát, rời đi", relation: "antonym", target: "arrive / reach (đến nơi)" },
          { phrase: "drive someone to the airport", meaning: "chở ai ra sân bay bằng ô tô", relation: "collocation", target: "take a car to the airport" },
          { phrase: "half an hour", meaning: "nửa tiếng (30 phút)", relation: "collocation", target: "30 minutes" }
        ],
        synonym_quiz: {
          prompt: "Trong đề thi, cụm từ 'plane leaving' được diễn đạt tương đương (Synonym) bằng cụm từ nào trong bài nghe?",
          options: [
            { id: "A", text: "drive you to the airport", is_correct: false },
            { id: "B", text: "get to the plane by 13.00", is_correct: true },
            { id: "C", text: "wait for two hours", is_correct: false }
          ],
          explanation: "'plane leaving' (máy bay rời đi / cất cánh) được paraphrase trong câu thoại cuối: 'get to the plane by 13.00'."
        },
        antonym_quiz: {
          prompt: "Từ nào dưới đây mang nghĩa TRÁI NGHĨA (Antonym) với từ 'leave' (rời đi / xuất phát)?",
          options: [
            { id: "A", text: "arrive / reach (đến nơi)", is_correct: true },
            { id: "B", text: "depart (khởi hành)", is_correct: false },
            { id: "C", text: "wait (chờ đợi)", is_correct: false }
          ],
          explanation: "'leave' (rời đi, cất cánh) đối lập hoàn toàn với 'arrive / reach' (đến nơi, hạ cánh)."
        },
        options_breakdown: {
          "A": {
            status: "❌ Bẫy Có Mặt Sớm",
            why: "11:00 là mốc người đàn ông định đến sớm để ngồi chờ 2 tiếng, không phải giờ máy bay cất cánh.",
            evidence: "M: 'Well, I should be there by 11.00 pm' -> F: 'That means you will wait for two hours!'"
          },
          "B": {
            status: "❌ Bẫy Giờ Đi Xe",
            why: "11:30 là giờ người phụ nữ đề xuất cả hai bắt đầu lên ô tô đi ra sân bay.",
            evidence: "M: 'Ok. Let's leave at 11.30. It's only half an hour to get to the airport...'"
          },
          "C": {
            status: "✅ ĐÁP ÁN ĐÚNG",
            why: "13:00 (1:00 pm) chính là giờ máy bay cất cánh thực tế sau khi đã tính 30 phút đi xe và 1 tiếng chuẩn bị.",
            evidence: "M: '...so I'll have an hour to get to the plane by 13.00.'"
          }
        }
      }
    },

    // Test 1 - Question 2: Meal cost
    "1_2": {
      tier1_thinking: {
        trap_question: {
          prompt: "Trong đoạn audio, người nói đã sử dụng loại BẪY ĐỀ THI phổ biến nào?",
          options: [
            { id: "A", text: "🎯 Bẫy Liệt Kê Tất Cả Các Con Số: Nhắc cả 3 số tiền (£35, £50, £70) nhưng 2 số là của món đơn lẻ và bữa ăn tuần trước", is_correct: true },
            { id: "B", text: "🔄 Bẫy Đổi Ý Phút Chót: Lúc đầu trả 50 bảng sau đổi ý boa thêm tiền", is_correct: false },
            { id: "C", text: "⏳ Bẫy Thì Thời Gian: Chỉ hỏi việc ngày mai", is_correct: false },
            { id: "D", text: "🪞 Bẫy Lặp Từ", is_correct: false }
          ],
          explanation: "Cả 3 phương án A (£35), B (£50), C (£70) đều xuất hiện trong băng. Học sinh dễ chọn nhầm nếu chỉ nghe thấy số mà không hiểu ngữ cảnh."
        },
        comprehension_question: {
          prompt: "Con số £70 mà người phụ nữ nhắc đến trong transcript thực chất là gì?",
          options: [
            { id: "A", text: "Tổng chi phí bữa ăn của người đàn ông và người phụ nữ hôm nay", is_correct: false },
            { id: "B", text: "Số tiền chị gái cô ấy đã trả tại nhà hàng này vào tuần trước ('paid over £70 last week')", is_correct: true },
            { id: "C", text: "Giá tiền của đĩa thịt gà và salad", is_correct: false }
          ],
          explanation: "Người phụ nữ so sánh: 'My sister paid over £70 here last week!' để an ủi rằng bữa ăn 50 bảng hôm nay vẫn chưa phải đắt nhất."
        }
      },
      tier2_paraphrase: {
        vocab_bank: [
          { phrase: "meal", meaning: "bữa ăn (bao gồm đồ ăn và thức uống)", relation: "synonym", target: "food / dining" },
          { phrase: "expensive", meaning: "đắt đỏ, tốn kém", relation: "synonym", target: "costly / pricey" },
          { phrase: "expensive", meaning: "đắt đỏ", relation: "antonym", target: "cheap / inexpensive / reasonable (rẻ, hợp lý)" },
          { phrase: "alone", meaning: "chỉ riêng một thứ gì đó", relation: "collocation", target: "only / by itself" }
        ],
        synonym_quiz: {
          prompt: "Từ nào dưới đây mang nghĩa ĐỒNG NGHĨA (Synonym) với từ 'expensive' trong câu '£50 is expensive'?",
          options: [
            { id: "A", text: "costly / pricey (đắt đỏ, tốn tiền)", is_correct: true },
            { id: "B", text: "cheap (rẻ)", is_correct: false },
            { id: "C", text: "delicious (thơm ngon)", is_correct: false }
          ],
          explanation: "'expensive' = 'costly' = 'pricey' (đắt tiền)."
        },
        antonym_quiz: {
          prompt: "Từ nào dưới đây mang nghĩa TRÁI NGHĨA (Antonym) với 'expensive'?",
          options: [
            { id: "A", text: "cheap / low-cost (rẻ tiền, giá thấp)", is_correct: true },
            { id: "B", text: "small meal (bữa ăn nhỏ)", is_correct: false },
            { id: "C", text: "heavy (nặng nề)", is_correct: false }
          ],
          explanation: "'expensive' (đắt) đối lập hoàn toàn với 'cheap' (rẻ)."
        },
        options_breakdown: {
          "A": {
            status: "❌ Bẫy Món Đơn Lẻ",
            why: "£35 chỉ là giá riêng của món thịt gà ('The chicken alone was £35'), chưa tính món salad và đồ uống.",
            evidence: "M: 'The chicken alone was £35.'"
          },
          "B": {
            status: "✅ ĐÁP ÁN ĐÚNG",
            why: "£50 chính là tổng chi phí bữa ăn hôm nay mà người đàn ông phàn nàn ngay đầu đoạn hội thoại.",
            evidence: "M: 'Well, £50 is expensive for such a small meal!'"
          },
          "C": {
            status: "❌ Bẫy Bữa Ăn Quá Khứ",
            why: "£70 là số tiền chị gái của người phụ nữ đã trả vào tuần trước, không phải bữa ăn hiện tại.",
            evidence: "F: 'My sister paid over £70 here last week!'"
          }
        }
      }
    },

    // Test 1 - Question 3: Type of house
    "1_3": {
      tier1_thinking: {
        trap_question: {
          prompt: "Người nói trong đoạn audio đã sử dụng loại bẫy nào để đánh lạc hướng bạn?",
          options: [
            { id: "A", text: "🎯 Bẫy Liệt Kê Tất Cả: Nhắc đến căn hộ (apartments) và nhà to có vườn (too big) nhưng đều bị từ chối", is_correct: true },
            { id: "B", text: "⏳ Bẫy Thì Thời Gian: Nhầm giữa tương lai và quá khứ", is_correct: false },
            { id: "C", text: "🔢 Bẫy Số Liệu Tính Toán", is_correct: false },
            { id: "D", text: "🔄 Bẫy Đổi Ý Phút Chót", is_correct: false }
          ],
          explanation: "Người phụ nữ nhắc đến cả căn hộ và nhà to có vườn nhưng gạt bỏ vì 'too big or apartments', rồi chốt lại nhà 1 phòng ngủ giá rẻ."
        },
        comprehension_question: {
          prompt: "Lý do gì khiến người phụ nữ từ chối các ngôi nhà cô ấy xem tối qua?",
          options: [
            { id: "A", text: "Vì các ngôi nhà đó hoặc quá to (too big) hoặc là căn hộ (apartments), không phải nhà 1 phòng ngủ giá rẻ", is_correct: true },
            { id: "B", text: "Vì chúng không có sân vườn cho trẻ em chơi", is_correct: false },
            { id: "C", text: "Vì chúng ở quá xa trung tâm thành phố", is_correct: false }
          ],
          explanation: "F: 'All the houses are either too big or apartments... if it's a one-bedroom house that isn't expensive, I think it'll be fine'."
        }
      },
      tier2_paraphrase: {
        vocab_bank: [
          { phrase: "looking for", meaning: "tìm kiếm, mong muốn có", relation: "synonym", target: "searching for / want" },
          { phrase: "flat", meaning: "căn hộ chung cư", relation: "synonym", target: "apartment" },
          { phrase: "isn't expensive", meaning: "không đắt đỏ", relation: "synonym", target: "cheap / affordable" },
          { phrase: "one-bedroom", meaning: "một phòng ngủ (nhà nhỏ)", relation: "antonym", target: "large / big house (nhà rộng nhiều phòng)" }
        ],
        synonym_quiz: {
          prompt: "Từ nào trong tiếng Anh Anh (UK English) đồng nghĩa hoàn toàn với từ 'apartment' (căn hộ)?",
          options: [
            { id: "A", text: "flat", is_correct: true },
            { id: "B", text: "cottage", is_correct: false },
            { id: "C", text: "villa", is_correct: false }
          ],
          explanation: "'apartment' (US) và 'flat' (UK) là cặp từ đồng nghĩa phổ biến nhất trong đề thi Cambridge KET."
        },
        antonym_quiz: {
          prompt: "Cụm từ 'one-bedroom house' (nhà 1 phòng ngủ) mang ý nghĩa đối lập (Antonym) với phương án nào?",
          options: [
            { id: "A", text: "A big house (nhà to nhiều phòng)", is_correct: true },
            { id: "B", text: "A cheap house (nhà giá rẻ)", is_correct: false },
            { id: "C", text: "A city house (nhà thành phố)", is_correct: false }
          ],
          explanation: "'one-bedroom' (nhà nhỏ 1 phòng) đối lập với 'big house with a garden'."
        },
        options_breakdown: {
          "A": {
            status: "❌ Bẫy Nhà Quá To",
            why: "Người phụ nữ từ chối vì nhà trong quảng cáo 'too big'.",
            evidence: "F: 'All the houses are either too big...'"
          },
          "B": {
            status: "❌ Bẫy Căn Hộ",
            why: "Người phụ nữ không muốn căn hộ chung cư ('or apartments').",
            evidence: "F: 'All the houses are either too big or apartments.'"
          },
          "C": {
            status: "✅ ĐÁP ÁN ĐÚNG",
            why: "Cô ấy chốt lại mong muốn nhà 1 phòng ngủ không đắt đỏ ('one-bedroom house that isn't expensive').",
            evidence: "F: 'Well, if it's a one-bedroom house that isn't expensive, I think it'll be fine.'"
          }
        }
      }
    },

    // Test 1 - Question 4: What does the man need to buy?
    "1_4": {
      tier1_thinking: {
        trap_question: {
          prompt: "Trong đoạn audio, người nói đã sử dụng loại BẪY ĐỀ THI nào?",
          options: [
            { id: "A", text: "🔄 Bẫy Đổi Ý Phút Chót: Nhân viên hỏi đồ mùa hè, khách dùng từ tín hiệu 'No, actually...' để từ chối và chọn đồ ấm hơn", is_correct: true },
            { id: "B", text: "⏳ Bẫy Thì Thời Gian", is_correct: false },
            { id: "C", text: "🔢 Bẫy Số Tiền", is_correct: false },
            { id: "D", text: "🎯 Bẫy Liệt Kê", is_correct: false }
          ],
          explanation: "Từ tín hiệu 'No, actually' là dấu hiệu nhận biết bẫy đổi ý phút chót. Khách từ chối 'summer clothes' và đi lên tầng tìm 'jumper'."
        },
        comprehension_question: {
          prompt: "Tại sao người đàn ông quyết định đi lên tầng trên ('go upstairs')?",
          options: [
            { id: "A", text: "Vì tầng trên là quầy bán áo len ấm (jumper department) đúng nhu cầu tìm đồ ấm hơn của anh ấy", is_correct: true },
            { id: "B", text: "Vì tầng trên bán quần dài (trousers)", is_correct: false },
            { id: "C", text: "Vì tầng trên đang có nhân viên phát quà miễn phí", is_correct: false }
          ],
          explanation: "F: '...and upstairs is the jumper department' -> M: 'OK. I'll go upstairs then'."
        }
      },
      tier2_paraphrase: {
        vocab_bank: [
          { phrase: "jumper", meaning: "áo len chui đầu", relation: "synonym", target: "sweater" },
          { phrase: "something a bit warmer", meaning: "thứ gì đó ấm hơn", relation: "antonym", target: "summer clothes (quần áo mùa hè mát mẻ)" },
          { phrase: "go upstairs", meaning: "đi lên lầu / lên tầng trên", relation: "antonym", target: "go downstairs (đi xuống lầu)" },
          { phrase: "department", meaning: "gian hàng, quầy chuyên doanh", relation: "collocation", target: "clothing department" }
        ],
        synonym_quiz: {
          prompt: "Từ 'jumper' trong đề thi Cambridge A2 Key đồng nghĩa hoàn toàn (Synonym) với từ nào?",
          options: [
            { id: "A", text: "sweater (áo len)", is_correct: true },
            { id: "B", text: "trousers (quần dài)", is_correct: false },
            { id: "C", text: "jacket (áo khoác ngoài)", is_correct: false }
          ],
          explanation: "'jumper' (tiếng Anh Anh) và 'sweater' (tiếng Anh Mỹ) là từ đồng nghĩa chỉ chiếc áo len chui đầu giữ ấm."
        },
        antonym_quiz: {
          prompt: "Cụm từ 'warmer clothes' (quần áo ấm hơn) mang nghĩa TRÁI NGHĨA (Antonym) với cụm từ nào?",
          options: [
            { id: "A", text: "summer clothes (quần áo mùa hè)", is_correct: true },
            { id: "B", text: "winter clothes (quần áo mùa đông)", is_correct: false },
            { id: "C", text: "raincoat (áo mưa)", is_correct: false }
          ],
          explanation: "'warmer clothes' (đồ ấm mùa đông) đối lập với 'summer clothes' (đồ mát mẻ mùa hè)."
        },
        options_breakdown: {
          "A": {
            status: "❌ Bẫy Đổi Ý",
            why: "Nhân viên hỏi có phải tìm 'summer clothes' không, khách đã từ chối ngay: 'No, actually...'.",
            evidence: "M: 'Um. No, actually I'm looking for something a bit warmer.'"
          },
          "B": {
            status: "❌ Bẫy Vị Trí Tầng Dưới",
            why: "Quầy quần (trouser department) ở tầng dưới ('here'), nhưng khách muốn tìm đồ len ấm nên đi lên tầng trên.",
            evidence: "F: 'Well, the trouser department is here, and upstairs is the jumper department.'"
          },
          "C": {
            status: "✅ ĐÁP ÁN ĐÚNG",
            why: "Khách cần mua đồ ấm hơn và quyết định lên tầng trên mua áo len ('jumper').",
            evidence: "M: 'OK. I'll go upstairs then. Thank you for your help.'"
          }
        }
      }
    },

    // Test 1 - Question 5: Sunday Weather
    "1_5": {
      tier1_thinking: {
        trap_question: {
          prompt: "Người dự báo thời tiết trong audio đã dùng loại bẫy nào để đánh lạc hướng bạn?",
          options: [
            { id: "A", text: "⏳ Bẫy Thì Thời Gian & Ngày Trong Tuần: Cố tình nhắc đến thời tiết Thứ Bảy nắng đẹp (Saturday) trước khi thông báo Chủ Nhật có mưa (Sunday)", is_correct: true },
            { id: "B", text: "🔢 Bẫy Số Liệu", is_correct: false },
            { id: "C", text: "🔄 Bẫy Đổi Ý", is_correct: false },
            { id: "D", text: "🎯 Bẫy Liệt Kê", is_correct: false }
          ],
          explanation: "Câu hỏi hỏi về Chủ Nhật ('Sunday'), nhưng bài nghe mở đầu bằng Thứ Bảy ('Saturday will be sunny and warm') khiến học sinh nghe câu đầu chọn ngay là mắc bẫy."
        },
        comprehension_question: {
          prompt: "Thời tiết hôm Chủ Nhật (Sunday) được dự báo như thế nào trong bài nghe?",
          options: [
            { id: "A", text: "Nhiều mây và có mưa rào vào buổi chiều ('cloudy with showers in the afternoon')", is_correct: true },
            { id: "B", text: "Nắng rực rỡ và ấm áp suốt cả ngày", is_correct: false },
            { id: "C", text: "Có tuyết rơi và gió bão nguy hiểm", is_correct: false }
          ],
          explanation: "Người nói thông báo rõ: 'However, Sunday will be rather cloudy with showers in the afternoon'."
        }
      },
      tier2_paraphrase: {
        vocab_bank: [
          { phrase: "showers", meaning: "cơn mưa rào ngắn", relation: "synonym", target: "rain / rainfall" },
          { phrase: "cloudy with showers", meaning: "nhiều mây có mưa rào", relation: "antonym", target: "sunny and clear (nắng ráo quang đãng)" },
          { phrase: "warm", meaning: "ấm áp", relation: "antonym", target: "cold / chilly (lạnh giá)" },
          { phrase: "weather forecast", meaning: "bản tin dự báo thời tiết", relation: "collocation", target: "weather report" }
        ],
        synonym_quiz: {
          prompt: "Từ 'showers' trong bản tin thời tiết đồng nghĩa (Synonym) với hiện tượng thời tiết nào?",
          options: [
            { id: "A", text: "rain (mưa)", is_correct: true },
            { id: "B", text: "sunshine (ánh nắng)", is_correct: false },
            { id: "C", text: "wind (gió)", is_correct: false }
          ],
          explanation: "'showers' là những cơn mưa rào ngắn, đồng nghĩa với 'rain'."
        },
        antonym_quiz: {
          prompt: "Từ nào mang nghĩa TRÁI NGHĨA (Antonym) với thời tiết 'cloudy' (nhiều mây âm u)?",
          options: [
            { id: "A", text: "sunny / clear (trời nắng quang đãng)", is_correct: true },
            { id: "B", text: "rainy (có mưa)", is_correct: false },
            { id: "C", text: "wet (ẩm ướt)", is_correct: false }
          ],
          explanation: "'cloudy' (u ám nhiều mây) đối lập với 'sunny / clear' (trời quang đãng đầy nắng)."
        },
        options_breakdown: {
          "A": {
            status: "❌ Bẫy Thời Tiết Thứ Bảy",
            why: "Nắng ấm là thời tiết của Thứ Bảy (Saturday), câu hỏi đang hỏi ngày Chủ Nhật (Sunday).",
            evidence: "Speaker: 'Saturday will be sunny and warm...'"
          },
          "B": {
            status: "✅ ĐÁP ÁN ĐÚNG",
            why: "Chủ Nhật trời nhiều mây và có mưa rào ('cloudy with showers').",
            evidence: "Speaker: 'However, Sunday will be rather cloudy with showers in the afternoon.'"
          },
          "C": {
            status: "❌ Bẫy Gió Bão",
            why: "Gió to chỉ xuất hiện vào tối muộn hoặc không phải đặc trưng của ngày.",
            evidence: "Speaker: '...showers in the afternoon.'"
          }
        }
      }
    }
  },

  // Hàm tạo dữ liệu tư duy thông minh cho bất kỳ câu hỏi nào (kể cả khi chưa có dữ liệu biên soạn thủ công)
  getThinkingData(q) {
    const key = `${q.test_id || 1}_${q.q_number || 1}`;
    if (this.curatedData[key]) {
      return this.curatedData[key];
    }

    // Dynamic Generator cho mọi câu hỏi khác dựa trên metadata của câu hỏi
    const trapNames = {
      "mind_change": "Bẫy Đổi Ý Phút Chót (Mind Change - ban đầu nói một đằng sau đổi ý bằng 'Actually/Wait')",
      "tense_time": "Bẫy Thì Thời Gian (Tense & Time - nhắc đến việc tuần trước/quá khứ thay vì việc hiện tại/tương lai)",
      "all_options_mentioned": "Bẫy Liệt Kê Tất Cả (All Options Mentioned - cả 3 phương án đều xuất hiện nhưng 2 cái bị loại)",
      "paraphrase_synonym": "Bẫy Từ Đồng Nghĩa & Lặp Từ (Paraphrase Trap - từ giống hệt trong câu hỏi là bẫy, từ đúng dùng từ đồng nghĩa)",
      "spelling_number": "Bẫy Số Liệu / Chính Tả (Spelling & Number - phân vân giữa giá gốc vs giá giảm, số kép...)"
    };

    const detectedTrap = q.trap_type || "all_options_mentioned";
    const trapDesc = trapNames[detectedTrap] || "Bẫy Đánh Lạc Hướng (Distractor Trap)";

    // Danh sách các bẫy khác để tạo trắc nghiệm
    const allTrapKeys = ["mind_change", "tense_time", "all_options_mentioned", "paraphrase_synonym"];
    const otherTraps = allTrapKeys.filter(k => k !== detectedTrap);

    const trapOptions = [
      { id: "A", text: `🎯 ${trapDesc}`, is_correct: true },
      { id: "B", text: `🔄 ${trapNames[otherTraps[0]] || 'Bẫy Đổi Ý Phút Chót'}`, is_correct: false },
      { id: "C", text: `⏳ ${trapNames[otherTraps[1]] || 'Bẫy Thì Thời Gian'}`, is_correct: false },
      { id: "D", text: `🪞 ${trapNames[otherTraps[2]] || 'Bẫy Từ Đồng Nghĩa & Lặp Từ'}`, is_correct: false }
    ];

    // Trộn ngẫu nhiên nhưng giữ id A, B, C, D
    const shuffled = trapOptions.sort(() => 0.5 - Math.random());
    const finalTrapOpts = shuffled.map((item, idx) => ({
      id: String.fromCharCode(65 + idx),
      text: item.text,
      is_correct: item.is_correct
    }));

    // Câu hỏi tư duy sâu
    const compPrompt = `Dựa vào bối cảnh bài nghe '${q.prompt}', điều gì quan trọng nhất cần lưu ý để chọn được đáp án đúng?`;
    const compOptions = [
      { id: "A", text: `Cần lắng nghe từ khóa chốt và loại bỏ các phương án đánh lạc hướng được người nói nhắc đến nhưng bị bác bỏ.`, is_correct: true },
      { id: "B", text: `Chỉ cần chọn ngay từ đầu tiên nghe thấy trong audio mà không cần nghe hết câu.`, is_correct: false },
      { id: "C", text: `Chọn phương án có chứa từ giống hệt 100% trong câu hỏi vì đề thi Cambridge luôn dùng từ y hệt.`, is_correct: false }
    ];

    // Option Deconstruction
    const correctLetter = q.correct_answer || "A";
    const rawOptions = q.options || { "A": "Phương án A", "B": "Phương án B", "C": "Phương án C" };
    const optionKeys = Object.keys(rawOptions);

    const breakdown = {};
    optionKeys.forEach(k => {
      if (k === correctLetter) {
        breakdown[k] = {
          status: "✅ ĐÁP ÁN ĐÚNG",
          why: q.tier3_hint || `Phương án [${k}] khớp chính xác với thông tin được người nói xác nhận trong audioscript.`,
          evidence: q.transcript ? q.transcript.split('\n').pop() : "Audioscript xác nhận thông tin này."
        };
      } else {
        breakdown[k] = {
          status: "❌ Bẫy Đánh Lạc Hướng",
          why: q.tier2_hint || `Phương án [${k}] là thông tin gây nhiễu, xuất hiện để đánh lừa người nghe nhưng bị người nói từ chối hoặc sai ngữ cảnh.`,
          evidence: "Xuất hiện trong bài nhưng bị loại trừ bởi điều kiện phủ định."
        };
      }
    });

    return {
      tier1_thinking: {
        trap_question: {
          prompt: "Trong đoạn audio này, người nói đã sử dụng loại BẪY ĐỀ THI phổ biến nào?",
          options: finalTrapOpts,
          explanation: q.trap_explanation || `Đoạn nghe sử dụng kỹ thuật đánh lạc hướng đặc trưng của Cambridge để kiểm tra khả năng nghe hiểu thực chất của học sinh.`
        },
        comprehension_question: {
          prompt: compPrompt,
          options: compOptions,
          explanation: q.tier1_hint || "Luôn nghe trọn vẹn câu thoại và chú ý các từ liên kết như But, However, Actually."
        }
      },
      tier2_paraphrase: {
        vocab_bank: [
          { phrase: "correct answer", meaning: "đáp án chính xác", relation: "synonym", target: "right choice / confirmed" },
          { phrase: "distractor", meaning: "phương án gây nhiễu, bẫy", relation: "antonym", target: "correct choice (đáp án đúng)" },
          { phrase: "listen carefully", meaning: "lắng nghe cẩn thận", relation: "collocation", target: "pay attention to details" }
        ],
        synonym_quiz: {
          prompt: `Trong đề thi Cambridge, từ nào dưới đây là từ ĐỒNG NGHĨA (Synonym) của 'correct' (chính xác)?`,
          options: [
            { id: "A", text: "right / accurate", is_correct: true },
            { id: "B", text: "wrong / false", is_correct: false },
            { id: "C", text: "difficult", is_correct: false }
          ],
          explanation: "'correct' = 'right' = 'accurate' (chính xác, đúng đắn)."
        },
        antonym_quiz: {
          prompt: `Từ nào dưới đây mang nghĩa TRÁI NGHĨA (Antonym) với 'cheap' (giá rẻ)?`,
          options: [
            { id: "A", text: "expensive / costly (đắt đỏ)", is_correct: true },
            { id: "B", text: "small (nhỏ bé)", is_correct: false },
            { id: "C", text: "quick (nhanh chóng)", is_correct: false }
          ],
          explanation: "'cheap' (rẻ) trái nghĩa với 'expensive' (đắt đỏ)."
        },
        options_breakdown: breakdown
      }
    };
  }
};
