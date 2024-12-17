from flask import Flask, request, jsonify, render_template, redirect, url_for, session, send_file
from utils import parse_config, write_config, create_backup, validate_config
from config import SECRET_KEY, CONFIG_PATH, USERS
import os

app = Flask(__name__)
app.secret_key = SECRET_KEY

# Página de login
@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username in USERS and USERS[username] == password:
            session['logged_in'] = True
            return redirect(url_for('index'))
        return render_template('login.html', error="Usuário ou senha incorretos.")
    return render_template('login.html')

# Página principal
@app.route('/config', methods=['GET'])
def index():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return render_template('index.html')

# API para carregar configurações
@app.route('/api/config', methods=['GET'])
def get_config():
    if not session.get('logged_in'):
        return jsonify({"error": "Acesso não autorizado"}), 401
    return jsonify(parse_config())

# API para salvar configurações
@app.route('/api/config', methods=['POST'])
def save_config():
    if not session.get('logged_in'):
        return jsonify({"error": "Acesso não autorizado"}), 401
    try:
        config = request.json
        print("Configurações recebidas:", config)  # Log para depuração

        if validate_config(config):
            create_backup(CONFIG_PATH)  # Criar backup antes de salvar
            write_config(config)  # Salvar as configurações
            return jsonify({"message": "Configuração salva com sucesso!"})
        return jsonify({"error": "Configuração inválida"}), 400
    except Exception as e:
        print(f"Erro no backend ao salvar: {e}")
        return jsonify({"error": f"Erro ao salvar configurações: {str(e)}"}), 500

# API para baixar o arquivo
@app.route('/api/download', methods=['GET'])
def download_config():
    if not session.get('logged_in'):
        return jsonify({"error": "Acesso não autorizado"}), 401
    return send_file(CONFIG_PATH, as_attachment=True)

# API para logout
@app.route('/logout', methods=['GET'])
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
