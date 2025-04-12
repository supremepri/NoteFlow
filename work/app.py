from flask import Flask, request, jsonify, render_template
import requests
from dotenv import load_dotenv
import os



app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/query', methods=["POST"])
def query_ai():
    try:
        # Load environment variables from new.env
        load_dotenv("work/new.env")
        api_key = os.getenv("API_KEY")  # Ensure the API key is loaded securely
        if not api_key:
            raise ValueError("API_KEY is missing!")

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
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": user_message}
                ]
            }
        )

        if response.status_code != 200:
            print(f"Error: Received status code {response.status_code}")
            return jsonify({"reply": f"Error: {response.status_code}"}), response.status_code

        data = response.json()
        reply = data.get("choices", [{}])[0].get("message", {}).get("content", "🤖 No response.")
        return jsonify({"reply": reply})

    except Exception as e:
        print("Error in /query endpoint:", str(e))
        return jsonify({"reply": "Internal server error occurred."}), 500

@app.route('/api/chat', methods=["POST"])
def chat_with_ai():
    try:
        api_key = os.getenv("API_KEY")  # Ensure API key is loaded securely
        if not api_key:
            raise ValueError("API_KEY is missing!")

        data = request.json
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json=data  # Forward the JSON payload from the frontend
        )

        if response.status_code != 200:
            print(f"Error: Received status code {response.status_code}")
            return jsonify({"reply": f"Error: {response.status_code}"}), response.status_code

        return jsonify(response.json())

    except Exception as e:
        print("Error in /api/chat endpoint:", str(e))
        return jsonify({"reply": "Internal server error occurred."}), 500

if __name__ == '__main__':
    app.run(debug=True)
