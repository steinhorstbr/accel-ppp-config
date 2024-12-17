def write_config(config):
    """Salva as configurações no arquivo accel-ppp.conf."""
    try:
        with open(CONFIG_PATH, 'w') as file:
            for section in config:
                file.write(f"[{section['name']}]\n")
                for item in section['items']:
                    if item['type'] == 'note':
                        file.write(f"### {item['text']}\n")
                    elif item['type'] == 'item':
                        prefix = '' if item['enabled'] else '#'
                        file.write(f"{prefix}{item['line']}\n")
                file.write('\n')
        print("Configurações salvas com sucesso.")
    except Exception as e:
        print(f"Erro ao salvar o arquivo: {e}")
        raise
