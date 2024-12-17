import os

def parse_config():
    """Lê o arquivo accel-ppp.conf e organiza as configurações."""
    config = []
    current_section = None
    with open(CONFIG_PATH, 'r') as file:
        for line in file:
            stripped = line.strip()
            if stripped.startswith('[') and stripped.endswith(']'):
                if current_section:
                    config.append(current_section)
                current_section = {'name': stripped[1:-1], 'items': []}
            elif stripped.startswith('###'):
                current_section['items'].append({'type': 'note', 'text': stripped[3:]})
            elif stripped.startswith('#'):
                current_section['items'].append({'type': 'item', 'line': stripped[1:], 'enabled': False})
            elif stripped:
                current_section['items'].append({'type': 'item', 'line': stripped, 'enabled': True})
        if current_section:
            config.append(current_section)
    return config

def write_config(config):
    """Salva as configurações no arquivo."""
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
