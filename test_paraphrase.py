import sys
import os

# Set up path to allow importing app
sys.path.append(os.path.abspath('.'))

from app.utils.ai_utils import paraphrase_text

class DummyUser:
    def __init__(self):
        self.is_pro = True

text_to_test = "Artificial Intelligence (AI) atau kecerdasan buatan itu pada dasarnya ialah suatu sistem komputasional yang dirancang supaya mesin bisa \"meniru\" kecerdasan manusia, walaupun tidak selalu sepenuhnya sadar seperti manusia, namun tetap mampu melakukan reasoning, learning, sampai decision-making secara otomatis (Russell & Norvig, 2021). Dalam perkembangannya, AI banyak memanfaatkan pendekatan machine learning dan deep learning yang mana algoritma dilatih menggunakan data skala besar agar dapat mengenali pola serta melakukan prediksi, meskipun terkadang output yang dihasilkan bersifat probabilistik dan tidak deterministik (Goodfellow, Bengio, & Courville, 2016)."

print("Original Text:\n", text_to_test)
print("\n--- Anti-Plagiarisme Mode ---")
result = paraphrase_text(DummyUser(), text_to_test, style="anti_plagiarisme")
print("Result:\n", result)
