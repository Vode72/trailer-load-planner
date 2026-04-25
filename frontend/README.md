# Trailer Load Planner

A full stack logistics load planning tool built with React, Python, Flask and SQLite.

## About

This application helps logistics planners manage and validate cargo loads for different trailer types. The system checks temperature requirements, delivery site compatibility, side-loading requirements, and weight/volume capacity.

The project is based on real-world logistics experience in temperature-controlled transport planning.

## Features

- Add and remove cargo loads
- Three trailer types supported:
  - Standard closed trailer
  - Side-loading trailer
  - Dual-zone refrigerated trailer (two independent temperature zones)
- Temperature range validation (min/max °C per load)
- Automatic compartment suggestion for dual-zone trailers
- Delivery site compatibility check
- Weight and volume capacity tracking

## Tech Stack

- **Frontend:** React
- **Backend:** Python, Flask
- **Database:** SQLite
- **API:** REST

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python init_db.py
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm start
```

Backend runs at http://127.0.0.1:5000  
Frontend runs at http://localhost:3000
