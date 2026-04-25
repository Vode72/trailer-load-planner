import React from "react";
import LoadPlanner from "./components/LoadPlanner";

function App() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      padding: "24px"
    }}>
      <div style={{ maxWidth: "1250px", margin: "0 auto" }}>
        <LoadPlanner />
      </div>
    </div>
  );
}

export default App;