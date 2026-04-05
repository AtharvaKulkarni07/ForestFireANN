# 🔥 Forest Fire Burned Area Predictor

![Forest Fire](https://img.shields.io/badge/Focus-Wildfire%20Prediction-orange)
![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![TensorFlow](https://img.shields.io/badge/Library-TensorFlow/Keras-red)
![Next.js](https://img.shields.io/badge/Frontend-Next.js-black)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)

An interactive web application for predicting forest fire burned areas using Artificial Neural Networks (ANN). Evaluates meteorological data and the Fire Weather Index (FWI) system to provide early insights into fire behavior and severity.

Recently upgraded from a monolithic Streamlit app to a modern, decoupled architecture with a **Next.js** frontend and a **FastAPI** backend!

## 📋 Table of Contents
- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation \u0026 Run Local](#-installation--run-local)
- [Usage](#-usage)
- [Model Details](#-model-details)
- [Dataset](#-dataset)
- [Results](#-results)
- [Deployment](#-deployment)

## 📌 Overview
This project implements a deep learning solution for forest fire prediction in the Montesinho Natural Park, Portugal. The ANN model analyzes meteorological conditions and FWI components to predict burned areas, helping in disaster management and resource allocation.

The web application provides:
- Real-time predictions via an intuitive, modern interface
- Exploratory data analysis visualizations
- Model performance metrics and insights
- Interactive feature exploration

## ✨ Features
- **🔮 Real-time Prediction**: Input meteorological conditions to predict burned area
- **📊 Exploratory Data Analysis**: Interactive visualizations of the dataset
- **🧠 Model Insights**: Detailed model architecture and performance metrics
- **📈 Training Analytics**: View training curves and hyperparameter optimization
- **🎯 Feature Importance**: Understand which factors most influence fire spread
- **📱 Responsive UI**: High-performance, modern interface built with Next.js

## 🛠️ Tech Stack
- **Frontend**: Next.js, React
- **Backend (API)**: FastAPI, Python 3.8+
- **Deep Learning**: TensorFlow/Keras
- **Data Processing**: Pandas, NumPy
- **Visualization Tooling**: Recharts (frontend) / Matplotlib, Seaborn (legacy backend gen)
- **Preprocessing**: Scikit-learn

## 📂 Project Structure
- `frontend/`: Contains the Next.js application, React components, and UI logic.
- `backend/`: Fast, robust backend built with FastAPI, handling REST API requests for model inference and datasets.
- `model/`: The Keras deep learning model artifacts, label encoders, preprocessors, datasets, and performance charts.

## 🚀 Installation & Run Local

### Prerequisites
- Node.js (v18+) and npm
- Python 3.8+

### 1. Clone the repository
```bash
git clone https://github.com/your-username/forest-fire-predictor.git
cd forest-fire-predictor
```

### 2. Run the Backend API
First, start the FastAPI server:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
The API should now be running on `http://localhost:8000`.

### 3. Run the Frontend App
Open a new terminal window or tab, and start the Next.js application:
```bash
cd frontend
npm install
npm run dev
```
The web app will open in your default browser at `http://localhost:3000`.

## 📖 Usage

### Making Predictions
1. Navigate to the "Predict" section.
2. Input meteorological conditions:
   - Map coordinates (X, Y)
   - Month and day
   - FWI components (FFMC, DMC, DC, ISI)
   - Temperature, humidity, wind speed
   - Rain amount
3. Click to predict and get results in real-time.

## 🧠 Model Details

### Architecture
- **Type**: Artificial Neural Network (ANN)
- **Layers**: 2 hidden layers (128 → 64 units)
- **Activation**: ReLU for hidden layers, Linear for output
- **Regularization**: L2 regularization + Dropout (0.3, 0.1)
- **Optimizer**: Adam with learning rate 0.01

### Target Transformation
- Uses `log1p(area)` transformation to handle skewed distribution.
- Predictions are inverse-transformed for interpretable results.

### Performance Metrics
- **R² Score**: -0.0719 (log-space)
- **MAE**: 7.39 hectares
- **RMSE**: 20.45 hectares
- **Training Epochs**: 25 (early stopping at epoch 10)

## 📊 Dataset

### Source
[UCI Machine Learning Repository - Forest Fires Dataset](https://archive.ics.uci.edu/ml/datasets/forest+fires)

### Key Features
| Feature | Description | Unit |
|---------|-------------|------|
| X, Y | Map coordinates | - |
| month, day | Temporal factors | - |
| FFMC | Fine Fuel Moisture Code | - |
| DMC | Duff Moisture Code | - |
| DC | Drought Code | - |
| ISI | Initial Spread Index | - |
| temp | Temperature | °C |
| RH | Relative Humidity | % |
| wind | Wind speed | km/h |
| rain | Rain amount | mm/m² |
| area | Burned area | hectares |

## 📈 Results

*Note: Results artifacts can be found internally in the `model/` directory.*

- **Training Performance**: `model/result_01_training_curves.png`
- **Prediction Analysis**: `model/result_02_prediction_analysis.png`
- **Feature Importance**: `model/result_03_feature_importance.png`

## 🌐 Deployment

### Frontend (Next.js)
The frontend application is optimized for deployment on **Vercel**:
1. Connect your GitHub repository to Vercel.
2. Vercel will automatically detect `frontend/` as a Next.js project.
3. Keep the Root Directory configured appropriately or change it to `frontend` depending on how Vercel manages monorepos if prompted.
4. Deploy!

### Backend (FastAPI)
The backend API can be deployed on services like **Render**, **Railway**, or **Heroku**:
1. Create a new Web Service pointing to `backend/main.py`.
2. Define the start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.

---
