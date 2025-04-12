from flask import Flask, request, jsonify, render_template
import requests

app = Flask(__name__, static_folder='static', template_folder='templates')

@app.route('/')
def home():
    return render_template('index.html')

@app.route("/query", methods=["POST"])
def query_ai():
    print("Query endpoint called")
    try:
        # Hardcoded API key from your original working version
        api_key = "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"
        data = request.json
        user_message = data.get("message", "")
        if not user_message:
            return jsonify({"reply": "Message cannot be empty."}), 400

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/llama-3.3-70b-instruct:free",
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful assistant. Always give answers with proper spacing, line breaks between paragraphs, and use bullet points when appropriate. "
                            "Provide a summary first, then full details separated clearly."
                        )
                    },
                    {"role": "user", "content": user_message}
                ]
            }
        )

        if response.status_code != 200:
            print(f"Error: Received status code {response.status_code}")
            return jsonify({"reply": f"Error: Received status code {response.status_code} from API."}), response.status_code

        data = response.json()
        reply = data["choices"][0]["message"]["content"]

        # Format the reply for better readability
        formatted_reply = (
            reply.replace("\n", "\n\n")
                 .replace("•", "\n\n• ")
                 .replace("- ", "\n\n- ")
                 .strip()
        )

        # Chunk the response if it's too long
        def chunk_response(response_text, chunk_size=500):
            return [response_text[i:i+chunk_size] for i in range(0, len(response_text), chunk_size)]

        chunks = chunk_response(formatted_reply)
        if not formatted_reply.strip():
            formatted_reply = "🤖 Hmm, no response was generated. Try rephrasing your question."

        return jsonify({"reply": chunks})
    except Exception as e:
        print("Error:", e)
        return jsonify({"reply": "Something went wrong while processing your request."}), 500

if __name__ == '__main__':
    app.run(debug=True)
