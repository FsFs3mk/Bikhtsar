from flask import Flask, request, jsonify, render_template
import whisper
import openai
import tiktoken

tiktoken.get_encoding()

app = Flask(__name__)

model = whisper.load_model("large-v2")
openai.api_key = ("")#provide your api key

def count_tokens(text, model_name="cl100k_base"):
    tiktoken_model = tiktoken.Encoding(model_name)
    tokenizer = tiktoken.Tokenizer(tiktoken_model)
    tokens = tokenizer.tokenize(text)
    return len(tokens)
    
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/en')
def en():
    return render_template('en.html')

@app.route('/ar')
def ar():
    return render_template('ar.html')

def transcribe_and_summarize(audio_file, language):
    audio_file.save("temp_audio.webm")
    result = model.transcribe("temp_audio.webm")
    transcription = result["text"]

    if language == 'en':
        prompt = f"Summarize this: {transcription}"
        system_message = "You are a helpful assistant for text summarization."
    elif language == 'ar':
        prompt = f"لخص هذا: {transcription}"
        system_message = "برنامج يساعد على تلخيص النصوص"
    else:
        raise ValueError("Invalid language")
    
    token_count = count_tokens(transcription)
    if token_count < 4000:
        selected_model = "gpt-3.5-turbo"
    else:
        selected_model = "gpt-4"

    response = openai.ChatCompletion.create(
        model=selected_model,
        messages=[
            {
                "role": "system",
                "content": system_message
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0,
    )

    summary = response['choices'][0]['message']['content']
    return transcription, summary

@app.route('/summarize', methods=['POST'])
def summarize_text():
    audio_file = request.files['audio']
    language = request.form.get('language', 'en')

    try:
        transcription, summary = transcribe_and_summarize(audio_file, language)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"transcription": transcription, "summary": summary})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
