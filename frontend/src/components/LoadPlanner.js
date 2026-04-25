import React, { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:5000/api/loads";
const TRAILER_TYPES_URL = "http://127.0.0.1:5000/api/trailer-types";
const DELIVERY_SITES_URL = "http://127.0.0.1:5000/api/delivery-sites";
const COMPARTMENTS_URL = "http://127.0.0.1:5000/api/compartments";

const styles = {
  section: {
    background: "rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)"
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#f1f5f9",
    marginBottom: "16px",
    paddingBottom: "8px",
    borderBottom: "2px solid rgba(255,255,255,0.1)"
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "4px"
  },
  select: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    marginBottom: "4px"
  },
  label: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#94a3b8",
    marginBottom: "4px",
    display: "block"
  },
  btnPrimary: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#3b82f6",
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    marginRight: "8px"
  },
  btnDanger: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#ef4444",
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer"
  },
  btnSmallDanger: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    background: "#ef4444",
    color: "#fff",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px"
  },
  th: {
    background: "#1e293b",
    color: "#fff",
    padding: "12px 14px",
    textAlign: "left",
    fontWeight: "600"
  },
  tdEven: {
    padding: "10px 14px",
    background: "rgba(255,255,255,0.05)",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    color: "#f1f5f9"
  },
  tdOdd: {
    padding: "10px 14px",
    background: "rgba(255,255,255,0.02)",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    color: "#f1f5f9"
  },
  badgeGreen: {
    background: "#dcfce7",
    color: "#16a34a",
    padding: "4px 10px",
    borderRadius: "999px",
    fontWeight: "600",
    fontSize: "13px"
  },
  badgeRed: {
    background: "#fee2e2",
    color: "#dc2626",
    padding: "4px 10px",
    borderRadius: "999px",
    fontWeight: "600",
    fontSize: "13px"
  },
  errorBox: {
    background: "#fee2e2",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontWeight: "500"
  },
  statBox: {
    background: "rgba(255,255,255,0.05)",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "12px"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#cbd5e1",
    cursor: "pointer",
    marginBottom: "4px"
  }
};

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
      setError("Kuormien haku epäonnistui.");
    }
  };

  useEffect(() => { fetchInitialData(); }, []);
  useEffect(() => { fetchLoads(); }, [selectedTrailerType, wholeTemp, frontTemp, rearTemp]);

  const isDualZone = selectedTrailerType === "umpikaappi 2:lla kylmäkoneella";

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          weight: Number(weight),
          volume: Number(volume),
          required_trailer_type: requiredTrailerType,
          required_delivery_site: requiredDeliverySite,
          min_temperature: requiresTemperature && minTemperature !== "" ? Number(minTemperature) : null,
          max_temperature: requiresTemperature && maxTemperature !== "" ? Number(maxTemperature) : null,
          required_compartment: requiresTemperature
            ? requiredCompartment
            : (requiredTrailerType === "umpikaappi 2:lla kylmäkoneella" ? "osasto ei väliä" : "koko kärry"),
          needs_side_loading: needsSideLoading
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Kuorman lisäys epäonnistui.");
        return;
      }
      setName(""); setWeight(""); setVolume("");
      setRequiredTrailerType("umpikaappi");
      setRequiredDeliverySite("laituri");
      setRequiresTemperature(false);
      setMinTemperature(""); setMaxTemperature("");
      setRequiredCompartment("koko kärry");
      setNeedsSideLoading(false);
      fetchLoads();
    } catch (err) {
      setError("Palvelinyhteys epäonnistui.");
    }
  };

  const handleDeleteLoad = async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      fetchLoads();
    } catch (err) {
      setError("Kuorman poisto epäonnistui.");
    }
  };

  const handleClearLoads = async () => {
    try {
      await fetch(API_URL, { method: "DELETE" });
      fetchLoads();
    } catch (err) {
      setError("Kuormien tyhjennys epäonnistui.");
    }
  };

  return (
    <div style={{ background: "transparent", minHeight: "100vh", padding: "24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#f1f5f9", margin: 0 }}>
            🚛 Trailer Load Planner
          </h1>
          <p style={{ color: "#94a3b8", marginTop: "4px" }}>
            Logistiikan kuormasuunnittelutyökalu
          </p>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Käytettävä kärrytyyppi</div>
          <span style={styles.label}>Valitse kärry</span>
          <select value={selectedTrailerType}
            onChange={(e) => setSelectedTrailerType(e.target.value)}
            style={{ ...styles.select, maxWidth: "400px" }}>
            {trailerTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <div style={{ marginTop: "16px" }}>
            <span style={styles.label}>Lämpötila-asetukset</span>
            {isDualZone ? (
              <div style={{ display: "flex", gap: "12px", maxWidth: "400px" }}>
                <input type="number" placeholder="Keula °C" value={frontTemp}
                  onChange={(e) => setFrontTemp(e.target.value)} style={styles.input} />
                <input type="number" placeholder="Takaosa °C" value={rearTemp}
                  onChange={(e) => setRearTemp(e.target.value)} style={styles.input} />
              </div>
            ) : (
              <input type="number" placeholder="Koko kärry °C" value={wholeTemp}
                onChange={(e) => setWholeTemp(e.target.value)}
                style={{ ...styles.input, maxWidth: "200px" }} />
            )}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Lisää kuorma</div>
          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <span style={styles.label}>Kuorman nimi</span>
              <input type="text" placeholder="Kuorman nimi" value={name}
                onChange={(e) => setName(e.target.value)} style={styles.input} />
            </div>
            <div>
              <span style={styles.label}>Paino (kg)</span>
              <input type="number" placeholder="Paino (kg)" value={weight}
                onChange={(e) => setWeight(e.target.value)} style={styles.input} />
            </div>
            <div>
              <span style={styles.label}>Tilavuus (m³)</span>
              <input type="number" placeholder="Tilavuus (m³)" value={volume}
                onChange={(e) => setVolume(e.target.value)} style={styles.input} />
            </div>
            <div>
              <span style={styles.label}>Vaadittu kärrytyyppi</span>
              <select value={requiredTrailerType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setRequiredTrailerType(newType);
                  setRequiredCompartment(
                    newType === "umpikaappi 2:lla kylmäkoneella" ? "osasto ei väliä" : "koko kärry"
                  );
                }} style={styles.select}>
                {trailerTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <span style={styles.label}>Vaadittu purkupaikka</span>
              <select value={requiredDeliverySite}
                onChange={(e) => setRequiredDeliverySite(e.target.value)} style={styles.select}>
                {deliverySites.map((site) => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: "12px" }}>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={requiresTemperature}
                onChange={(e) => {
                  setRequiresTemperature(e.target.checked);
                  if (!e.target.checked) {
                    setMinTemperature(""); setMaxTemperature("");
                    setRequiredCompartment(
                      requiredTrailerType === "umpikaappi 2:lla kylmäkoneella" ? "osasto ei väliä" : "koko kärry"
                    );
                  }
                }} />
              Vaatii lämpötilasäädellyn kuljetuksen
            </label>

            {requiresTemperature && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "12px" }}>
                <div>
                  <span style={styles.label}>Min lämpötila °C</span>
                  <input type="number" placeholder="Min °C" value={minTemperature}
                    onChange={(e) => setMinTemperature(e.target.value)} style={styles.input} />
                </div>
                <div>
                  <span style={styles.label}>Max lämpötila °C</span>
                  <input type="number" placeholder="Max °C" value={maxTemperature}
                    onChange={(e) => setMaxTemperature(e.target.value)} style={styles.input} />
                </div>
                <div>
                  <span style={styles.label}>Kuorman sijoitus</span>
                  <select value={requiredCompartment}
                    onChange={(e) => setRequiredCompartment(e.target.value)} style={styles.select}>
                    {(requiredTrailerType === "umpikaappi 2:lla kylmäkoneella"
                      ? compartments.filter((c) => c === "osasto ei väliä" || c === "lastaus keulaan" || c === "lastaus perään")
                      : compartments.filter((c) => c === "koko kärry")
                    ).map((compartment) => (
                      <option key={compartment} value={compartment}>{compartment}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <label style={{ ...styles.checkboxLabel, marginTop: "12px" }}>
              <input type="checkbox" checked={needsSideLoading}
                onChange={(e) => setNeedsSideLoading(e.target.checked)} />
              Vaatii sivulastauksen
            </label>
          </div>

          <div style={{ marginTop: "16px" }}>
            <button onClick={handleAddLoad} style={styles.btnPrimary}>Lisää kuorma</button>
            <button onClick={handleClearLoads} style={styles.btnDanger}>Tyhjennä kaikki</button>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Kuormat</div>
          {loads.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>Ei kuormia.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["Nimi", "Paino", "Tilavuus", "Vaadittu kärry", "Purkupaikka", "Min °C", "Max °C", "Sijoitus", "Sivulastaus", "Toiminto"].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loads.map((load, index) => {
                    const td = index % 2 === 0 ? styles.tdEven : styles.tdOdd;
                    return (
                      <tr key={load.id}>
                        <td style={td}>{load.name}</td>
                        <td style={td}>{load.weight}</td>
                        <td style={td}>{load.volume}</td>
                        <td style={td}>{load.required_trailer_type}</td>
                        <td style={td}>{load.required_delivery_site}</td>
                        <td style={td}>{load.min_temperature ?? "-"}</td>
                        <td style={td}>{load.max_temperature ?? "-"}</td>
                        <td style={td}>{load.required_compartment}</td>
                        <td style={td}>{load.needs_side_loading ? "Kyllä" : "Ei"}</td>
                        <td style={td}>
                          <button onClick={() => handleDeleteLoad(load.id)} style={styles.btnSmallDanger}>Poista</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {summary && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Yhteenveto</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div style={styles.statBox}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Kokonaispaino</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#f1f5f9" }}>
                  {summary.total_weight} kg
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>/ {summary.max_weight} kg ({summary.weight_usage_percent}%)</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Kokonaistilavuus</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#f1f5f9" }}>
                  {summary.total_volume} m³
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>/ {summary.max_volume} m³ ({summary.volume_usage_percent}%)</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Kokonaisstatus</div>
                <div style={{ marginTop: "4px" }}>
                  <span style={summary.fits ? styles.badgeGreen : styles.badgeRed}>
                    {summary.fits ? "✓ Kuormat sopivat" : "✗ Kuormat eivät sovi"}
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.sectionTitle}>Kuormakohtainen tarkistus</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {summary.load_checks.map((check) => (
                <div key={check.id} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 16px", borderRadius: "8px",
                  background: check.fits_trailer ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${check.fits_trailer ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`
                }}>
                  <span style={check.fits_trailer ? styles.badgeGreen : styles.badgeRed}>
                    {check.fits_trailer ? "✓ OK" : "✗ Ei sovi"}
                  </span>
                  <span style={{ fontWeight: "600", color: "#f1f5f9" }}>{check.name}</span>
                  <span style={{ color: "#94a3b8", fontSize: "13px" }}>{check.reason}</span>
                  {check.assigned_compartment && (
                    <span style={{ color: "#38bdf8", fontSize: "13px", fontWeight: "500" }}>
                      → {check.assigned_compartment}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadPlanner;