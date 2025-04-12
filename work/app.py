from flask import Flask, request, jsonify, render_template
import requests
from flask_dance.contrib.google import make_google_blueprint, google
import os
api_key = os.getenv("API_KEY")

app = Flask(__name__)  # Default configuration works perfectly for this structure

@app.route('/')
def home():
    return render_template('index.html')
    

@app.route("/query", methods=["POST"])
def query_ai():
    print("Query endpoint called")  # Debug statement
     api_key = os.getenv("API_KEY")
         data = request.json
    try:
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
                            "You are a helpful assistant. "
                            "Always give answers with proper spacing, line breaks between paragraphs, and use bullet points when appropriate. "
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

        # Formatting the reply for better readability
        formatted_reply = (
            reply.replace("\n", "\n\n")  # Double line breaks for paragraph separation
                 .replace("•", "\n\n• ")  # Ensure bullet points have proper spacing
                 .replace("- ", "\n\n- ")  # Handle hyphenated lists (optional)
                 .strip()  # Remove any leading or trailing spaces
        )

        # Chunk the response if it's too long
        def chunk_response(response, chunk_size=500):
            return [response[i:i+chunk_size] for i in range(0, len(response), chunk_size)]

        chunks = chunk_response(formatted_reply)

        if not formatted_reply.strip():
            formatted_reply = "🤖 Hmm, no response was generated. Try rephrasing your question."

        return jsonify({"reply": chunks})

    except Exception as e:
        print("Error:", e)
        return jsonify({"reply": "Something went wrong while processing your request."}), 500
    
if __name__ == '__main__':
    app.run(debug=True)
