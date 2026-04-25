import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_NAME = "loads.db"
MAX_WEIGHT = 24000
MAX_VOLUME = 90

TRAILER_TYPES = {
    "umpikaappi": {
        "side_loading": False,
        "temperature_controlled": True,
        "dual_zone": False,
        "supported_delivery_sites": ["laituri", "maataso"]
    },
    "sivusta lastattava kaappikärry": {
        "side_loading": True,
        "temperature_controlled": True,
        "dual_zone": False,
        "supported_delivery_sites": ["laituri", "maataso", "sivupurkualue"]
    },
    "umpikaappi 2:lla kylmäkoneella": {
        "side_loading": False,
        "temperature_controlled": True,
        "dual_zone": True,
        "supported_delivery_sites": ["laituri", "maataso"]
    }
}

DELIVERY_SITES = [
    "laituri",
    "maataso",
    "ahdas piha",
    "sivupurkualue"
]

COMPARTMENTS = [
    "koko kärry",
    "osasto ei väliä",
    "lastaus keulaan",
    "lastaus perään"
]


def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def get_candidate_compartments(load, trailer):
    required_compartment = load["required_compartment"]

    if trailer["dual_zone"]:
        if required_compartment == "osasto ei väliä":
            return ["keula", "takaosa"], None
        if required_compartment == "lastaus keulaan":
            return ["keula"], None
        if required_compartment == "lastaus perään":
            return ["takaosa"], None
        return [], (
            "2-koneisessa kärryssä osaston pitää olla "
            "'osasto ei väliä', 'lastaus keulaan' tai 'lastaus perään'"
        )

    return ["koko kärry"], None


def check_temperature_compatibility(load, selected_trailer_type, trailer_temperature_config):
    trailer = TRAILER_TYPES[selected_trailer_type]

    min_temp = load["min_temperature"]
    max_temp = load["max_temperature"]

    if min_temp is None and max_temp is None:
        return {
            "fits": True,
            "reason": "Kuorma ei vaadi lämpötilasäätöä",
            "assigned_compartment": None
        }

    candidate_compartments, error = get_candidate_compartments(load, trailer)
    if error:
        return {
            "fits": False,
            "reason": error,
            "assigned_compartment": None
        }

    matching_compartments = []
    failed_reasons = []

    for compartment in candidate_compartments:
        configured_temp = trailer_temperature_config.get(compartment)

        if configured_temp is None:
            failed_reasons.append(f"{compartment}-osaston lämpötilaa ei ole asetettu")
            continue

        if min_temp is not None and configured_temp < min_temp:
            failed_reasons.append(
                f"{compartment}-osaston lämpötila {configured_temp} °C alittaa minimin {min_temp} °C"
            )
            continue

        if max_temp is not None and configured_temp > max_temp:
            failed_reasons.append(
                f"{compartment}-osaston lämpötila {configured_temp} °C ylittää maksimin {max_temp} °C"
            )
            continue

        matching_compartments.append(compartment)

    if matching_compartments:
        if len(matching_compartments) == 1:
            return {
                "fits": True,
                "reason": f"Kuorma sopii osastoon: {matching_compartments[0]}",
                "assigned_compartment": matching_compartments[0]
            }

        return {
            "fits": True,
            "reason": f"Kuorma sopii useaan osastoon: {', '.join(matching_compartments)}",
            "assigned_compartment": matching_compartments[0]
        }

    return {
        "fits": False,
        "reason": " | ".join(failed_reasons) if failed_reasons else "Kuorma ei sovi lämpötilan perusteella",
        "assigned_compartment": None
    }


def load_fits_trailer(load, selected_trailer_type, trailer_temperature_config):
    trailer = TRAILER_TYPES.get(selected_trailer_type)

    if not trailer:
        return {
            "fits": False,
            "reason": "Tuntematon kärrytyyppi",
            "assigned_compartment": None
        }

    if load["required_trailer_type"] != selected_trailer_type:
        return {
            "fits": False,
            "reason": f"Kuorma vaatii kärrytyypin: {load['required_trailer_type']}",
            "assigned_compartment": None
        }

    if load["needs_side_loading"] and not trailer["side_loading"]:
        return {
            "fits": False,
            "reason": "Kuorma vaatii sivulastauksen",
            "assigned_compartment": None
        }

    required_delivery_site = load["required_delivery_site"]
    if required_delivery_site not in trailer["supported_delivery_sites"]:
        return {
            "fits": False,
            "reason": f"Purkupaikka '{required_delivery_site}' ei sovellu kärrylle",
            "assigned_compartment": None
        }

    if required_delivery_site == "ahdas piha":
        return {
            "fits": False,
            "reason": "Ahdas piha ei sovellu nykyisessä mallissa valitulle kärrylle",
            "assigned_compartment": None
        }

    temp_result = check_temperature_compatibility(
        load,
        selected_trailer_type,
        trailer_temperature_config
    )

    if not temp_result["fits"]:
        return temp_result

    return {
        "fits": True,
        "reason": temp_result["reason"],
        "assigned_compartment": temp_result.get("assigned_compartment")
    }


def calculate_summary(loads, selected_trailer_type, trailer_temperature_config):
    total_weight = sum(load["weight"] for load in loads)
    total_volume = sum(load["volume"] for load in loads)

    fits_capacity = total_weight <= MAX_WEIGHT and total_volume <= MAX_VOLUME

    load_checks = []
    all_rules_ok = True

    for load in loads:
        result = load_fits_trailer(load, selected_trailer_type, trailer_temperature_config)

        load_checks.append({
            "id": load["id"],
            "name": load["name"],
            "fits_trailer": result["fits"],
            "reason": result["reason"],
            "assigned_compartment": result.get("assigned_compartment")
        })

        if not result["fits"]:
            all_rules_ok = False

    overall_fits = fits_capacity and all_rules_ok

    return {
        "total_weight": round(total_weight, 2),
        "total_volume": round(total_volume, 2),
        "weight_usage_percent": round((total_weight / MAX_WEIGHT) * 100, 2),
        "volume_usage_percent": round((total_volume / MAX_VOLUME) * 100, 2),
        "fits_capacity": fits_capacity,
        "fits_trailer_rules": all_rules_ok,
        "fits": overall_fits,
        "max_weight": MAX_WEIGHT,
        "max_volume": MAX_VOLUME,
        "selected_trailer_type": selected_trailer_type,
        "trailer_temperature_config": trailer_temperature_config,
        "load_checks": load_checks
    }


@app.route("/api/trailer-types", methods=["GET"])
def get_trailer_types():
    return jsonify({
        "trailer_types": list(TRAILER_TYPES.keys())
    })


@app.route("/api/delivery-sites", methods=["GET"])
def get_delivery_sites():
    return jsonify({
        "delivery_sites": DELIVERY_SITES
    })


@app.route("/api/compartments", methods=["GET"])
def get_compartments():
    return jsonify({
        "compartments": COMPARTMENTS
    })


@app.route("/api/loads", methods=["GET"])
def get_loads():
    selected_trailer_type = request.args.get("trailer_type", "umpikaappi")

    trailer_temperature_config = {
        "koko kärry": request.args.get("whole_temp", type=float),
        "keula": request.args.get("front_temp", type=float),
        "takaosa": request.args.get("rear_temp", type=float)
    }

    conn = get_db_connection()
    rows = conn.execute("""
        SELECT id, name, weight, volume, required_trailer_type,
               needs_side_loading, required_delivery_site,
               min_temperature, max_temperature, required_compartment
        FROM loads
        ORDER BY id ASC
    """).fetchall()
    conn.close()

    loads = []
    for row in rows:
        load = dict(row)
        load["needs_side_loading"] = bool(load["needs_side_loading"])
        loads.append(load)

    summary = calculate_summary(loads, selected_trailer_type, trailer_temperature_config)

    return jsonify({
        "loads": loads,
        "summary": summary
    })


@app.route("/api/loads", methods=["POST"])
def add_load():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Puuttuva JSON-data"}), 400

    name = data.get("name", "").strip()
    weight = data.get("weight")
    volume = data.get("volume")
    required_trailer_type = data.get("required_trailer_type", "").strip()
    required_delivery_site = data.get("required_delivery_site", "").strip()
    min_temperature = data.get("min_temperature")
    max_temperature = data.get("max_temperature")
    required_compartment = data.get("required_compartment", "koko kärry").strip()
    needs_side_loading = bool(data.get("needs_side_loading", False))

    if not name:
        return jsonify({"error": "Kuorman nimi on pakollinen"}), 400

    if required_trailer_type not in TRAILER_TYPES:
        return jsonify({"error": "Virheellinen kärrytyyppi"}), 400

    if required_delivery_site not in DELIVERY_SITES:
        return jsonify({"error": "Virheellinen purkupaikka"}), 400

    if required_compartment not in COMPARTMENTS:
        return jsonify({"error": "Virheellinen osasto"}), 400

    try:
        weight = float(weight)
        volume = float(volume)
    except (TypeError, ValueError):
        return jsonify({"error": "Painon ja tilavuuden pitää olla numeroita"}), 400

    if weight <= 0 or volume <= 0:
        return jsonify({"error": "Painon ja tilavuuden pitää olla positiivisia"}), 400

    if min_temperature not in [None, ""]:
        try:
            min_temperature = float(min_temperature)
        except (TypeError, ValueError):
            return jsonify({"error": "Minimilämpötilan pitää olla numero"}), 400
    else:
        min_temperature = None

    if max_temperature not in [None, ""]:
        try:
            max_temperature = float(max_temperature)
        except (TypeError, ValueError):
            return jsonify({"error": "Maksimilämpötilan pitää olla numero"}), 400
    else:
        max_temperature = None

    if min_temperature is not None and max_temperature is not None:
        if min_temperature > max_temperature:
            return jsonify({"error": "Minimilämpötila ei voi olla suurempi kuin maksimilämpötila"}), 400

    conn = get_db_connection()
    conn.execute("""
        INSERT INTO loads (
            name, weight, volume, required_trailer_type,
            needs_side_loading, required_delivery_site,
            min_temperature, max_temperature, required_compartment
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        name,
        weight,
        volume,
        required_trailer_type,
        int(needs_side_loading),
        required_delivery_site,
        min_temperature,
        max_temperature,
        required_compartment
    ))
    conn.commit()
    conn.close()

    return jsonify({"message": "Kuorma lisätty"}), 201


@app.route("/api/loads/<int:load_id>", methods=["DELETE"])
def delete_load(load_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM loads WHERE id = ?", (load_id,))
    conn.commit()
    deleted_count = cursor.rowcount
    conn.close()

    if deleted_count == 0:
        return jsonify({"error": "Kuormaa ei löytynyt"}), 404

    return jsonify({"message": "Kuorma poistettu"})


@app.route("/api/loads", methods=["DELETE"])
def clear_loads():
    conn = get_db_connection()
    conn.execute("DELETE FROM loads")
    conn.commit()
    conn.close()

    return jsonify({"message": "Kaikki kuormat poistettu"})

@app.route("/api/loads/<int:load_id>", methods=["PUT"])
def update_load(load_id):
    data = request.get_json()

    if not data:
        return jsonify({"error": "Puuttuva JSON-data"}), 400

    name = data.get("name", "").strip()
    weight = data.get("weight")
    volume = data.get("volume")
    required_trailer_type = data.get("required_trailer_type", "").strip()
    required_delivery_site = data.get("required_delivery_site", "").strip()
    min_temperature = data.get("min_temperature")
    max_temperature = data.get("max_temperature")
    required_compartment = data.get("required_compartment", "koko kärry").strip()
    needs_side_loading = bool(data.get("needs_side_loading", False))

    if not name:
        return jsonify({"error": "Kuorman nimi on pakollinen"}), 400

    if required_trailer_type not in TRAILER_TYPES:
        return jsonify({"error": "Virheellinen kärrytyyppi"}), 400

    if required_delivery_site not in DELIVERY_SITES:
        return jsonify({"error": "Virheellinen purkupaikka"}), 400

    if required_compartment not in COMPARTMENTS:
        return jsonify({"error": "Virheellinen osasto"}), 400

    try:
        weight = float(weight)
        volume = float(volume)
    except (TypeError, ValueError):
        return jsonify({"error": "Painon ja tilavuuden pitää olla numeroita"}), 400

    if weight <= 0 or volume <= 0:
        return jsonify({"error": "Painon ja tilavuuden pitää olla positiivisia"}), 400

    if min_temperature not in [None, ""]:
        try:
            min_temperature = float(min_temperature)
        except (TypeError, ValueError):
            return jsonify({"error": "Minimilämpötilan pitää olla numero"}), 400
    else:
        min_temperature = None

    if max_temperature not in [None, ""]:
        try:
            max_temperature = float(max_temperature)
        except (TypeError, ValueError):
            return jsonify({"error": "Maksimilämpötilan pitää olla numero"}), 400
    else:
        max_temperature = None

    if min_temperature is not None and max_temperature is not None:
        if min_temperature > max_temperature:
            return jsonify({"error": "Minimilämpötila ei voi olla suurempi kuin maksimilämpötila"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE loads SET
            name = ?,
            weight = ?,
            volume = ?,
            required_trailer_type = ?,
            needs_side_loading = ?,
            required_delivery_site = ?,
            min_temperature = ?,
            max_temperature = ?,
            required_compartment = ?
        WHERE id = ?
    """, (
        name,
        weight,
        volume,
        required_trailer_type,
        int(needs_side_loading),
        required_delivery_site,
        min_temperature,
        max_temperature,
        required_compartment,
        load_id
    ))
    conn.commit()
    updated = cursor.rowcount
    conn.close()

    if updated == 0:
        return jsonify({"error": "Kuormaa ei löytynyt"}), 404

    return jsonify({"message": "Kuorma päivitetty"})

if __name__ == "__main__":
    app.run(debug=True)