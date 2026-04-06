import os
from flask import Flask, render_template, request, jsonify
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

app = Flask(__name__)

# --- Configurações do Supabase ---
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# --- Rotas de Navegação ---


@app.route('/')
def index():
    return render_template('login.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

# --- Rotas de API ---


@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        # Busca todos os registros para calcular o total
        # Se quiser filtrar apenas o mês atual, pode adicionar filtros de data aqui
        response = supabase.table('registros').select("km_total").execute()
        registros = response.data

        total_km = sum(item.get('km_total', 0) for item in registros)
        quantidade = len(registros)

        return jsonify({
            "total_km": total_km,
            "quantidade": quantidade
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    try:
        response = supabase.auth.sign_in_with_password({
            "email": data['email'],
            "password": data['password']
        })
        return jsonify({"user": response.user.id, "session": response.session.access_token}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 401


@app.route('/api/registrar_veiculo', methods=['POST'])
def salvar_veiculo():
    data = request.get_json()
    try:
        novo_veiculo = {
            "placa": data['placa'],
            "carro": data['numero_carro']
        }
        response = supabase.table('veiculos').insert(novo_veiculo).execute()
        return jsonify({"status": "sucesso", "dados": response.data}), 201
    except Exception as e:
        print(f"Erro no Flask (Veículo): {e}")
        return jsonify({"error": "Erro no banco", "detalhes": str(e)}), 400


@app.route('/api/veiculos', methods=['GET'])
def get_veiculos():
    try:
        response = supabase.table('veiculos').select(
            "id, placa, carro").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ ROTA DE REGISTRO AJUSTADA PARA A IMAGEM ENVIADA


@app.route('/api/registrar', methods=['POST'])
def registrar_km():
    data = request.get_json()
    try:
        # 1. Converte para float antes do cálculo para garantir precisão
        ki = float(data.get('km_inicial', 0))
        kf = float(data.get('km_final', 0))

        # 2. Calcula a diferença (KM Total do dia)
        calculo_total = kf - ki

        # 3. Validação: impede registros onde o KM final é menor que o inicial
        if calculo_total < 0:
            return jsonify({"error": "KM Final não pode ser menor que o Inicial"}), 400

        novo_registro = {
            "veiculo_id": data['veiculo_id'],
            "km_inicial": ki,
            "km_final": kf,
            "km_total": calculo_total,  # ✅ Gravando KF - KI corretamente
            "observacoes": data.get('observacao', ''),
            "data": "now()"
        }

        # 4. Insere no Supabase
        response = supabase.table('registros').insert(novo_registro).execute()

        return jsonify({
            "status": "sucesso",
            "dados": response.data,
            "km_rodado_hoje": calculo_total  # Retorno útil para o frontend
        }), 201

    except Exception as e:
        print(f"Erro no Flask (Registro): {e}")
        return jsonify({"error": "Erro ao processar dados", "detalhes": str(e)}), 400


@app.route('/api/historico', methods=['GET'])
def get_historico():
    try:
        # Busca os registros ordenando pela data mais recente (limitado a 5)
        # O 'veiculos(placa)' faz o "join" para trazer a placa do carro
        response = supabase.table('registros') \
            .select("*, veiculos(placa)") \
            .order('data', desc=True) \
            .limit(5) \
            .execute()

        return jsonify(response.data)
    except Exception as e:
        print(f"Erro ao buscar histórico: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/relatorios')
def pagina_relatorios():
    return render_template('relatorios.html')


@app.route('/api/relatorio/filtrar', methods=['POST'])
def filtrar_relatorio():
    data = request.get_json()
    inicio = data.get('inicio')
    fim = data.get('fim')

    try:
        query = supabase.table('registros').select("*, veiculos(placa)")

        # Filtros de data (formato ISO YYYY-MM-DD)
        if inicio:
            query = query.gte('data', f"{inicio}T00:00:00")
        if fim:
            query = query.lte('data', f"{fim}T23:59:59")

        response = query.order('data', desc=False).execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/perfil')
def pagina_perfil():
    return render_template('perfil.html')


@app.route('/api/perfil/atualizar', methods=['POST'])
def atualizar_perfil():
    data = request.get_json()
    try:
        # O Supabase identifica o usuário pela sessão ativa ou e-mail/senha
        # Aqui enviamos os campos que desejamos atualizar
        updates = {}
        if 'email' in data and data['email']:
            updates['email'] = data['email']
        if 'password' in data and data['password']:
            updates['password'] = data['password']

        if not updates:
            return jsonify({"error": "Nenhum dado informado"}), 400

        # Importante: O Supabase enviará um e-mail de confirmação para o novo e-mail
        response = supabase.auth.update_user(updates)

        return jsonify({"status": "sucesso", "msg": "Dados atualizados! Verifique seu e-mail se alterou o endereço."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/motoristas', methods=['GET'])
def get_motoristas():
    try:
        # Ajustado para a tabela 'motoristas' e coluna 'truno'
        response = supabase.table('motoristas').select(
            "id, nome, turno").execute()
        return jsonify(response.data)
    except Exception as e:
        print(f"ERRO NO SUPABASE: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/relatorio/detalhado', methods=['POST'])
def relatorio_detalhado():
    data = request.get_json()
    motorista_id = data.get('motorista_id')
    inicio = data.get('inicio')
    fim = data.get('fim')

    try:
        # Ajustado para buscar na tabela 'motoristas'
        mot = supabase.table('motoristas').select(
            "*").eq("id", motorista_id).single().execute()

        query = supabase.table('registros').select("*, veiculos(placa)")
        if inicio:
            query = query.gte('data', f"{inicio}T00:00:00")
        if fim:
            query = query.lte('data', f"{fim}T23:59:59")

        reg_response = query.order('data', desc=False).execute()

        return jsonify({
            "motorista": mot.data,
            "registros": reg_response.data
        }), 200
    except Exception as e:
        print(f"Erro no Relatório: {e}")
        return jsonify({"error": str(e)}), 400


if __name__ == '__main__':
    app.run(debug=True)
