from flask import Flask, request, jsonify, render_template, redirect, url_for, session, send_file
from utils import parse_config, write_config, create_backup, validate_config
from config import SECRET_KEY, CONFIG_PATH, USERS, BACKUP_DIR
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
    try:
        config = parse_config()  # Lê e retorna as configurações do arquivo
        return jsonify(config)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API para salvar configurações
@app.route('/api/config', methods=['POST'])
def save_config():
    if not session.get('logged_in'):
        return jsonify({"error": "Acesso não autorizado"}), 401
    
    config = request.json
    try:
        # Validar as configurações antes de salvar
        if validate_config(config):
            create_backup(CONFIG_PATH)  # Faz backup antes de salvar
            write_config(config)  # Chama a função de escrita para salvar as alterações no arquivo
            return jsonify({"message": "Configuração salva com sucesso!"})
        else:
            return jsonify({"error": "Configuração inválida"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API para baixar o arquivo de configuração
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
