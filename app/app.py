from flask import Flask, request, jsonify, render_template, redirect, url_for, session, send_file
import os
import subprocess
import time

app = Flask(__name__)
app.secret_key = 'supersecretkey'
CONFIG_PATH = '/etc/accel-ppp.conf'

ADMIN_USER = 'admin'
ADMIN_PASS = 'admin1234'


def parse_config():
    """Função para ler e processar o arquivo de configuração."""
    config = []
    current_section = None
    with open(CONFIG_PATH, 'r') as file:
        for line in file:
            stripped = line.strip()
            if stripped.startswith('[') and stripped.endswith(']'):
                if current_section:
                    config.append(current_section)
                current_section = {'type': 'section', 'name': stripped[1:-1], 'content': []}
            elif stripped.startswith('###'):
                if current_section:
                    current_section['content'].append({'type': 'note', 'text': stripped[3:].strip()})
            elif stripped.startswith('#'):
                if current_section:
                    current_section['content'].append({'type': 'item', 'line': stripped[1:].strip(), 'enabled': False})
            elif stripped:
                if current_section:
                    current_section['content'].append({'type': 'item', 'line': stripped, 'enabled': True})
        
        if current_section:
            config.append(current_section)
    return config


def write_config(config):
    """Função para salvar o arquivo de configuração."""
    with open(CONFIG_PATH, 'w') as file:
        for section in config:
            file.write(f"[{section['name']}]\n")
            for item in section['content']:
                if item['type'] == 'note':
                    file.write(f"### {item['text']}\n")
                elif item['type'] == 'item':
                    prefix = '' if item['enabled'] else '#'
                    file.write(f"{prefix}{item['line']}\n")
            file.write('\n')


def run_host_command(command, timeout=30):
    """Executa comando no HOST usando nsenter."""
    try:
        # nsenter para executar no namespace do HOST (PID 1)
        if isinstance(command, str):
            command = command.split()
        
        # Comando completo com nsenter
        host_command = ['nsenter', '-t', '1', '-m', '-p'] + command
        
        result = subprocess.run(host_command, capture_output=True, text=True, timeout=timeout)
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Timeout"
    except FileNotFoundError:
        return -2, "", f"nsenter ou comando não encontrado: {command[0] if command else 'unknown'}"
    except Exception as e:
        return -3, "", str(e)


def run_host_command_chroot(command, timeout=30):
    """Executa comando no HOST usando chroot (alternativa)."""
    try:
        if isinstance(command, str):
            command = command.split()
        
        # Comando usando chroot para acessar o sistema host
        host_command = ['chroot', '/host'] + command
        
        result = subprocess.run(host_command, capture_output=True, text=True, timeout=timeout)
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Timeout"
    except Exception as e:
        return -3, "", str(e)


def restart_accel_ppp():
    """Função para reiniciar o serviço accel-ppp no HOST."""
    log_output = "🔄 Iniciando restart do accel-ppp no HOST...\n\n"
    
    # Verificar se nsenter está disponível
    nsenter_check = subprocess.run(['which', 'nsenter'], capture_output=True)
    if nsenter_check.returncode != 0:
        log_output += "❌ nsenter não disponível, tentando método alternativo...\n"
        use_nsenter = False
    else:
        log_output += "✅ nsenter disponível\n"
        use_nsenter = True
    
    # Função para executar comandos baseada na disponibilidade
    exec_cmd = run_host_command if use_nsenter else run_host_command_chroot
    
    # 1. Verificar se accel-ppp está rodando no host
    log_output += "\n🔍 Verificando processos no host...\n"
    pgrep_code, pgrep_out, pgrep_err = exec_cmd(['pgrep', '-f', 'accel-ppp'])
    log_output += f"Processos accel-ppp: código={pgrep_code}, out='{pgrep_out.strip()}', err='{pgrep_err}'\n"
    
    processes_running = pgrep_code == 0 and pgrep_out.strip()
    if processes_running:
        log_output += f"📊 Processos encontrados: {pgrep_out.strip()}\n"
    else:
        log_output += "📊 Nenhum processo accel-ppp encontrado\n"
    
    # 2. Tentar parar com systemctl
    log_output += "\n🔧 Tentativa 1: systemctl stop no host\n"
    stop_code, stop_out, stop_err = exec_cmd(['systemctl', 'stop', 'accel-ppp'])
    log_output += f"Stop: código={stop_code}, out='{stop_out}', err='{stop_err}'\n"
    
    # Aguardar
    time.sleep(2)
    
    # 3. Tentar iniciar com systemctl
    log_output += "\n🔧 Tentativa 2: systemctl start no host\n"
    start_code, start_out, start_err = exec_cmd(['systemctl', 'start', 'accel-ppp'])
    log_output += f"Start: código={start_code}, out='{start_out}', err='{start_err}'\n"
    
    # Aguardar
    time.sleep(3)
    
    # 4. Verificar se funcionou
    status_code, status_out, status_err = exec_cmd(['systemctl', 'is-active', 'accel-ppp'])
    log_output += f"Status systemctl: '{status_out.strip()}'\n"
    
    if status_out.strip() == 'active':
        # Verificar processos para confirmar
        pgrep_code2, pgrep_out2, _ = exec_cmd(['pgrep', '-f', 'accel-ppp'])
        log_output += f"Verificação final: {pgrep_out2.strip()}\n"
        return True, log_output + "\n✅ Accel-PPP reiniciado com sucesso via systemctl!"
    
    # 5. Se systemctl falhou, tentar service
    log_output += "\n🔧 Tentativa 3: service no host\n"
    service_stop_code, service_stop_out, service_stop_err = exec_cmd(['service', 'accel-ppp', 'stop'])
    log_output += f"Service stop: código={service_stop_code}, out='{service_stop_out}', err='{service_stop_err}'\n"
    
    time.sleep(2)
    
    service_start_code, service_start_out, service_start_err = exec_cmd(['service', 'accel-ppp', 'start'])
    log_output += f"Service start: código={service_start_code}, out='{service_start_out}', err='{service_start_err}'\n"
    
    time.sleep(3)
    
    # Verificar se service funcionou
    pgrep_code3, pgrep_out3, _ = exec_cmd(['pgrep', '-f', 'accel-ppp'])
    if pgrep_code3 == 0 and pgrep_out3.strip():
        log_output += f"Processos após service: {pgrep_out3.strip()}\n"
        return True, log_output + "\n✅ Accel-PPP reiniciado com sucesso via service!"
    
    # 6. Último recurso: kill + start direto
    log_output += "\n🔧 Tentativa 4: kill + start direto no host\n"
    
    # Matar processos
    kill_code, kill_out, kill_err = exec_cmd(['pkill', '-f', 'accel-ppp'])
    log_output += f"Kill: código={kill_code}, out='{kill_out}', err='{kill_err}'\n"
    
    time.sleep(2)
    
    # Tentar encontrar o binário no host
    possible_paths = [
        '/usr/sbin/accel-pppd',
        '/usr/bin/accel-pppd',
        '/sbin/accel-pppd'
    ]
    
    binary_found = None
    for path in possible_paths:
        which_code, which_out, which_err = exec_cmd(['test', '-x', path])
        if which_code == 0:
            binary_found = path
            break
    
    if binary_found:
        log_output += f"Binário encontrado: {binary_found}\n"
        start_direct_code, start_direct_out, start_direct_err = exec_cmd([binary_found, '-d', '-c', CONFIG_PATH])
        log_output += f"Start direto: código={start_direct_code}, out='{start_direct_out}', err='{start_direct_err}'\n"
        
        time.sleep(3)
        
        # Verificação final
        pgrep_code4, pgrep_out4, _ = exec_cmd(['pgrep', '-f', 'accel-ppp'])
        if pgrep_code4 == 0 and pgrep_out4.strip():
            log_output += f"Processos finais: {pgrep_out4.strip()}\n"
            return True, log_output + f"\n✅ Accel-PPP reiniciado diretamente com {binary_found}!"
    else:
        log_output += "❌ Binário accel-pppd não encontrado em caminhos padrão\n"
    
    # 7. Verificação com which para debug
    log_output += "\n🔍 Debug - procurando accel-pppd...\n"
    which_code, which_out, which_err = exec_cmd(['which', 'accel-pppd'])
    if which_code == 0:
        log_output += f"which encontrou: {which_out.strip()}\n"
        # Tentar com o caminho encontrado
        start_which_code, start_which_out, start_which_err = exec_cmd([which_out.strip(), '-d', '-c', CONFIG_PATH])
        log_output += f"Start com which: código={start_which_code}, out='{start_which_out}', err='{start_which_err}'\n"
        
        if start_which_code == 0:
            time.sleep(3)
            pgrep_code5, pgrep_out5, _ = exec_cmd(['pgrep', '-f', 'accel-ppp'])
            if pgrep_code5 == 0 and pgrep_out5.strip():
                return True, log_output + f"\n✅ Accel-PPP reiniciado com which: {which_out.strip()}!"
    
    return False, log_output + "\n❌ Todos os métodos falharam no host!"


@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username == ADMIN_USER and password == ADMIN_PASS:
            session['logged_in'] = True
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error="Usuário ou senha incorretos.")
    return render_template('login.html')


@app.route('/config', methods=['GET'])
def index():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return render_template('index.html')


@app.route('/get-config', methods=['GET'])
def get_config():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    try:
        return jsonify(parse_config())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/save-config', methods=['POST'])
def save_config():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    try:
        # Salva a configuração
        write_config(request.json)
        
        # Reinicia o accel-ppp automaticamente
        restart_success, restart_log = restart_accel_ppp()
        
        if restart_success:
            return jsonify({
                "message": "✅ Configuração salva e Accel-PPP reiniciado com sucesso!",
                "restart_log": restart_log,
                "status": "success"
            })
        else:
            return jsonify({
                "message": "⚠️ Configuração salva, mas falha no restart do Accel-PPP",
                "restart_log": restart_log,
                "status": "warning"
            }), 206
            
    except Exception as e:
        return jsonify({
            "error": f"❌ Erro ao salvar configuração: {str(e)}",
            "status": "error"
        }), 500


@app.route('/upload-config', methods=['POST'])
def upload_config():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    try:
        file = request.files['file']
        file.save(CONFIG_PATH)
        
        restart_success, restart_log = restart_accel_ppp()
        
        if restart_success:
            return jsonify({
                "message": "✅ Configuração carregada e Accel-PPP reiniciado com sucesso!",
                "restart_log": restart_log,
                "status": "success"
            })
        else:
            return jsonify({
                "message": "⚠️ Configuração carregada, mas falha no restart do Accel-PPP",
                "restart_log": restart_log,
                "status": "warning"
            })
            
    except Exception as e:
        return jsonify({
            "error": f"❌ Erro ao fazer upload: {str(e)}",
            "status": "error"
        }), 500


@app.route('/download-config', methods=['GET'])
def download_config():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    try:
        return send_file(CONFIG_PATH, as_attachment=True, download_name='accel-ppp.conf')
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/reload-config', methods=['POST'])
def reload_config():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    try:
        # Tentar accel-cmd no host
        code, out, err = run_host_command(['accel-cmd', 'reload'])
        return jsonify({"message": "Comando executado!", "log": f"código: {code}\nout: {out}\nerr: {err}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/restart-service', methods=['POST'])
def restart_service():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    
    restart_success, restart_log = restart_accel_ppp()
    
    if restart_success:
        return jsonify({
            "message": "✅ Accel-PPP reiniciado com sucesso!",
            "log": restart_log,
            "status": "success"
        })
    else:
        return jsonify({
            "message": "❌ Falha ao reiniciar o Accel-PPP",
            "log": restart_log,
            "status": "error"
        }), 500


@app.route('/debug-info', methods=['GET'])
def debug_info():
    """Informações de debug do host"""
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    
    info = {}
    
    # Verificar nsenter
    nsenter_check = subprocess.run(['which', 'nsenter'], capture_output=True)
    info['nsenter_available'] = nsenter_check.returncode == 0
    
    # Verificar processos no host
    if info['nsenter_available']:
        pgrep_code, pgrep_out, _ = run_host_command(['pgrep', '-af', 'accel'])
        info['host_processes'] = pgrep_out
        
        # Verificar systemctl no host
        systemctl_code, _, _ = run_host_command(['which', 'systemctl'])
        info['host_systemctl'] = systemctl_code == 0
        
        # Verificar service no host
        service_code, _, _ = run_host_command(['which', 'service'])
        info['host_service'] = service_code == 0
        
        # Procurar binário accel-pppd
        which_code, which_out, _ = run_host_command(['which', 'accel-pppd'])
        info['accel_binary_path'] = which_out.strip() if which_code == 0 else "não encontrado"
    else:
        info['error'] = "nsenter não disponível - container não pode acessar host"
    
    return jsonify(info)


@app.route('/logout', methods=['GET'])
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
