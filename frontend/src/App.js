import React from "react";
import LoadPlanner from "./components/LoadPlanner";

function App() {
  return (
    <div
      style={{
        maxWidth: "1250px",
        margin: "0 auto",
        padding: "24px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <h1>Trailer Load Planner</h1>
      <LoadPlanner />
    </div>
  );
}

export default App;