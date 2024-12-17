import os

def write_config(config):
    """Escreve as configurações no arquivo `accel-ppp.conf`."""
    with open('/etc/accel-ppp.conf', 'w') as file:
        for section in config:
            file.write(f"[{section['name']}]\n")
            for item in section['items']:
                if item['type'] == 'note':
                    file.write(f"### {item['text']}\n")
                elif item['type'] == 'item':
                    prefix = '' if item['enabled'] else '#'
                    file.write(f"{prefix}{item['line']}\n")
            file.write('\n')
