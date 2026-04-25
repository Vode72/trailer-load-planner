import React, { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:5000/api/loads";
const TRAILER_TYPES_URL = "http://127.0.0.1:5000/api/trailer-types";
const DELIVERY_SITES_URL = "http://127.0.0.1:5000/api/delivery-sites";
const COMPARTMENTS_URL = "http://127.0.0.1:5000/api/compartments";

function LoadPlanner() {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [volume, setVolume] = useState("");
  const [requiredTrailerType, setRequiredTrailerType] = useState("umpikaappi");
  const [requiredDeliverySite, setRequiredDeliverySite] = useState("laituri");
  const [requiresTemperature, setRequiresTemperature] = useState(false);
  const [minTemperature, setMinTemperature] = useState("");
  const [maxTemperature, setMaxTemperature] = useState("");
  const [requiredCompartment, setRequiredCompartment] = useState("koko kärry");
  const [needsSideLoading, setNeedsSideLoading] = useState(false);

  const [selectedTrailerType, setSelectedTrailerType] = useState("umpikaappi");
  const [wholeTemp, setWholeTemp] = useState("");
  const [frontTemp, setFrontTemp] = useState("");
  const [rearTemp, setRearTemp] = useState("");

  const [trailerTypes, setTrailerTypes] = useState([]);
  const [deliverySites, setDeliverySites] = useState([]);
  const [compartments, setCompartments] = useState([]);

  const [loads, setLoads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const fetchInitialData = async () => {
    try {
      const [trailerRes, siteRes, compartmentRes] = await Promise.all([
        fetch(TRAILER_TYPES_URL),
        fetch(DELIVERY_SITES_URL),
        fetch(COMPARTMENTS_URL)
      ]);

      const trailerData = await trailerRes.json();
      const siteData = await siteRes.json();
      const compartmentData = await compartmentRes.json();

      setTrailerTypes(trailerData.trailer_types || []);
      setDeliverySites(siteData.delivery_sites || []);
      setCompartments(compartmentData.compartments || []);
    } catch (err) {
      console.error(err);
      setError("Alkutietojen haku epäonnistui.");
    }
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.append("trailer_type", selectedTrailerType);

    if (wholeTemp !== "") params.append("whole_temp", wholeTemp);
    if (frontTemp !== "") params.append("front_temp", frontTemp);
    if (rearTemp !== "") params.append("rear_temp", rearTemp);

    return params.toString();
  };

  const fetchLoads = async () => {
    try {
      const response = await fetch(`${API_URL}?${buildQuery()}`);
      const data = await response.json();
      setLoads(data.loads || []);
      setSummary(data.summary || null);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Kuormien haku epäonnistui.");
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchLoads();
  }, [selectedTrailerType, wholeTemp, frontTemp, rearTemp]);

  const isDualZone = selectedTrailerType === "umpikaappi 2:lla kylmäkoneella";

  const availableCompartments = isDualZone
    ? compartments.filter(
        (c) =>
          c === "osasto ei väliä" ||
          c === "lastaus keulaan" ||
          c === "lastaus perään"
      )
    : compartments.filter((c) => c === "koko kärry");

  const handleAddLoad = async () => {
    setError("");

    if (!name || !weight || !volume) {
      setError("Täytä nimi, paino ja tilavuus.");
      return;
    }

    if (requiresTemperature) {
      if (minTemperature === "" && maxTemperature === "") {
        setError("Anna minimilämpötila, maksimilämpötila tai molemmat.");
        return;
      }

      if (minTemperature !== "" && maxTemperature !== "") {
        if (Number(minTemperature) > Number(maxTemperature)) {
          setError("Minimilämpötila ei voi olla suurempi kuin maksimilämpötila.");
          return;
        }
      }
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          weight: Number(weight),
          volume: Number(volume),
          required_trailer_type: requiredTrailerType,
          required_delivery_site: requiredDeliverySite,
          min_temperature:
            requiresTemperature && minTemperature !== ""
              ? Number(minTemperature)
              : null,
          max_temperature:
            requiresTemperature && maxTemperature !== ""
              ? Number(maxTemperature)
              : null,
          required_compartment:
            requiresTemperature
              ? requiredCompartment
              : (requiredTrailerType === "umpikaappi 2:lla kylmäkoneella"
                  ? "osasto ei väliä"
                  : "koko kärry"),
          needs_side_loading: needsSideLoading
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Kuorman lisäys epäonnistui.");
        return;
      }

      setName("");
      setWeight("");
      setVolume("");
      setRequiredTrailerType("umpikaappi");
      setRequiredDeliverySite("laituri");
      setRequiresTemperature(false);
      setMinTemperature("");
      setMaxTemperature("");
      setRequiredCompartment("koko kärry");
      setNeedsSideLoading(false);

      fetchLoads();
    } catch (err) {
      console.error(err);
      setError("Palvelinyhteys epäonnistui.");
    }
  };

  const handleDeleteLoad = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Kuorman poisto epäonnistui.");
        return;
      }

      fetchLoads();
    } catch (err) {
      console.error(err);
      setError("Kuorman poisto epäonnistui.");
    }
  };

  const handleClearLoads = async () => {
    try {
      await fetch(API_URL, {
        method: "DELETE"
      });
      fetchLoads();
    } catch (err) {
      console.error(err);
      setError("Kuormien tyhjennys epäonnistui.");
    }
  };

  return (
    <div>
      <h2>Valitse käytettävä kärrytyyppi</h2>
      <select
        value={selectedTrailerType}
        onChange={(e) => setSelectedTrailerType(e.target.value)}
        style={{ padding: "8px", marginBottom: "12px" }}
      >
        {trailerTypes.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>

      <h3>Lämpötila-asetukset valitulle kärrylle</h3>
      {isDualZone ? (
        <div style={{ display: "grid", gap: "8px", maxWidth: "320px", marginBottom: "20px" }}>
          <input
            type="number"
            placeholder="Keula °C"
            value={frontTemp}
            onChange={(e) => setFrontTemp(e.target.value)}
          />
          <input
            type="number"
            placeholder="Takaosa °C"
            value={rearTemp}
            onChange={(e) => setRearTemp(e.target.value)}
          />
        </div>
      ) : (
        <div style={{ maxWidth: "320px", marginBottom: "20px" }}>
          <input
            type="number"
            placeholder="Koko kärry °C"
            value={wholeTemp}
            onChange={(e) => setWholeTemp(e.target.value)}
          />
        </div>
      )}

      <h2>Lisää kuorma</h2>

      <div style={{ display: "grid", gap: "10px", maxWidth: "650px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Kuorman nimi"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="number"
          placeholder="Paino (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />

        <input
          type="number"
          placeholder="Tilavuus (m³)"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
        />

        <label>Vaadittu kärrytyyppi</label>
        <select
          value={requiredTrailerType}
          onChange={(e) => {
            const newType = e.target.value;
            setRequiredTrailerType(newType);
            setRequiredCompartment(
              newType === "umpikaappi 2:lla kylmäkoneella"
                ? "osasto ei väliä"
                : "koko kärry"
            );
          }}
        >
          {trailerTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <label>Vaadittu purkupaikka</label>
        <select
          value={requiredDeliverySite}
          onChange={(e) => setRequiredDeliverySite(e.target.value)}
        >
          {deliverySites.map((site) => (
            <option key={site} value={site}>{site}</option>
          ))}
        </select>

        <label>
          <input
            type="checkbox"
            checked={requiresTemperature}
            onChange={(e) => {
              setRequiresTemperature(e.target.checked);
              if (!e.target.checked) {
                setMinTemperature("");
                setMaxTemperature("");
                setRequiredCompartment(
                  requiredTrailerType === "umpikaappi 2:lla kylmäkoneella"
                    ? "osasto ei väliä"
                    : "koko kärry"
                );
              } else {
                setRequiredCompartment(
                  requiredTrailerType === "umpikaappi 2:lla kylmäkoneella"
                    ? "osasto ei väliä"
                    : "koko kärry"
                );
              }
            }}
          />
          Vaatii lämpötilasäädellyn kuljetuksen
        </label>

        {requiresTemperature && (
          <>
            <input
              type="number"
              placeholder="Minimilämpötila °C"
              value={minTemperature}
              onChange={(e) => setMinTemperature(e.target.value)}
            />

            <input
              type="number"
              placeholder="Maksimilämpötila °C"
              value={maxTemperature}
              onChange={(e) => setMaxTemperature(e.target.value)}
            />

            <label>Kuorman sijoitus</label>
            <select
              value={requiredCompartment}
              onChange={(e) => setRequiredCompartment(e.target.value)}
            >
              {(
                requiredTrailerType === "umpikaappi 2:lla kylmäkoneella"
                  ? compartments.filter(
                      (c) =>
                        c === "osasto ei väliä" ||
                        c === "lastaus keulaan" ||
                        c === "lastaus perään"
                    )
                  : compartments.filter((c) => c === "koko kärry")
              ).map((compartment) => (
                <option key={compartment} value={compartment}>
                  {compartment}
                </option>
              ))}
            </select>
          </>
        )}

        <label>
          <input
            type="checkbox"
            checked={needsSideLoading}
            onChange={(e) => setNeedsSideLoading(e.target.checked)}
          />
          Vaatii sivulastauksen
        </label>

        <button onClick={handleAddLoad}>Lisää kuorma</button>
        <button onClick={handleClearLoads}>Tyhjennä kaikki</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Kuormat</h2>
      {loads.length === 0 ? (
        <p>Ei kuormia.</p>
      ) : (
        <table
          border="1"
          cellPadding="8"
          style={{ borderCollapse: "collapse", width: "100%", marginBottom: "20px" }}
        >
          <thead>
            <tr>
              <th>Nimi</th>
              <th>Paino</th>
              <th>Tilavuus</th>
              <th>Vaadittu kärry</th>
              <th>Purkupaikka</th>
              <th>Min °C</th>
              <th>Max °C</th>
              <th>Sijoitus</th>
              <th>Sivulastaus</th>
              <th>Toiminto</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((load) => (
              <tr key={load.id}>
                <td>{load.name}</td>
                <td>{load.weight}</td>
                <td>{load.volume}</td>
                <td>{load.required_trailer_type}</td>
                <td>{load.required_delivery_site}</td>
                <td>{load.min_temperature ?? "-"}</td>
                <td>{load.max_temperature ?? "-"}</td>
                <td>{load.required_compartment}</td>
                <td>{load.needs_side_loading ? "Kyllä" : "Ei"}</td>
                <td>
                  <button onClick={() => handleDeleteLoad(load.id)}>Poista</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {summary && (
        <div style={{ border: "1px solid #ccc", borderRadius: "8px", padding: "16px" }}>
          <h2>Yhteenveto</h2>
          <p>Valittu kärry: {summary.selected_trailer_type}</p>

          <p>Kärryn lämpötila-asetukset:</p>
          <ul>
            <li>koko kärry: {summary.trailer_temperature_config["koko kärry"] ?? "-"} °C</li>
            <li>keula: {summary.trailer_temperature_config["keula"] ?? "-"} °C</li>
            <li>takaosa: {summary.trailer_temperature_config["takaosa"] ?? "-"} °C</li>
          </ul>

          <p>Kokonaispaino: {summary.total_weight} kg / {summary.max_weight} kg</p>
          <p>Kokonaistilavuus: {summary.total_volume} m³ / {summary.max_volume} m³</p>
          <p>Painon käyttöaste: {summary.weight_usage_percent}%</p>
          <p>Tilavuuden käyttöaste: {summary.volume_usage_percent}%</p>
          <p>Kapasiteetti ok: {summary.fits_capacity ? "Kyllä" : "Ei"}</p>
          <p>Muut säännöt ok: {summary.fits_trailer_rules ? "Kyllä" : "Ei"}</p>
          <p>
            Kokonaisstatus:{" "}
            <strong>{summary.fits ? "Kuormat sopivat" : "Kuormat eivät sovi"}</strong>
          </p>

          <h3>Kuormakohtainen tarkistus</h3>
          <ul>
            {summary.load_checks.map((check) => (
              <li key={check.id}>
                {check.name}: {check.fits_trailer ? "OK" : "Ei sovi"} - {check.reason}
                {check.assigned_compartment && ` (valittu osasto: ${check.assigned_compartment})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default LoadPlanner;