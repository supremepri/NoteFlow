from flask import Flask, request, jsonify, render_template
import requests
import os
app = Flask(__name__, static_folder='static', template_folder='templates')
from flask_cors import CORS
CORS(app)

@app.route('/')
def home():
    return render_template('index.html')

@app.route("/query", methods=["POST"])
def query_ai():
    print("Query endpoint called")  # Debugging
    data = request.json
    print("Received data:", data)  # Debugging

    try:
        api_key = os.getenv("API_KEY")
        if not api_key:
            raise ValueError("API_KEY is missing!")

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={"messages": [{"role": "user", "content": data.get("message", "")}]}
        )
        if response.status_code != 200:
            print(f"Error: Received status code {response.status_code}")
            return jsonify({"reply": f"Error: Received status code {response.status_code} from API."}), response.status_code

        reply = response.json()["choices"][0]["message"]["content"]
        print("AI Response:", reply)  # Debugging

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
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
