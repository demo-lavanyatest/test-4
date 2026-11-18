const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const errorMessage = document.getElementById("error-message");
const loadingIndicator = document.getElementById("loading-indicator");
const weatherResult = document.getElementById("weather-result");

const locationNameEl = document.getElementById("location-name");
const locationRegionEl = document.getElementById("location-region");
const weatherUpdatedEl = document.getElementById("weather-updated");
const weatherIconEl = document.getElementById("weather-icon");
const temperatureEl = document.getElementById("temperature");
const weatherConditionEl = document.getElementById("weather-condition");
const feelsLikeEl = document.getElementById("feels-like");
const humidityEl = document.getElementById("humidity");
const windSpeedEl = document.getElementById("wind-speed");
const coordinatesEl = document.getElementById("coordinates");

// WMO Weather interpretation codes
const WEATHER_CODES = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Depositing rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Moderate drizzle", icon: "🌦️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  56: { label: "Light freezing drizzle", icon: "🌧️" },
  57: { label: "Dense freezing drizzle", icon: "🌧️" },
  61: { label: "Slight rain", icon: "🌧️" },
  63: { label: "Moderate rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Light freezing rain", icon: "🌨️" },
  67: { label: "Heavy freezing rain", icon: "🌨️" },
  71: { label: "Slight snow fall", icon: "🌨️" },
  73: { label: "Moderate snow fall", icon: "❄️" },
  75: { label: "Heavy snow fall", icon: "❄️" },
  77: { label: "Snow grains", icon: "❄️" },
  80: { label: "Slight rain showers", icon: "🌦️" },
  81: { label: "Moderate rain showers", icon: "🌧️" },
  82: { label: "Violent rain showers", icon: "⛈️" },
  85: { label: "Slight snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with slight hail", icon: "⛈️" },
  99: { label: "Thunderstorm with heavy hail", icon: "⛈️" },
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { label: "Unknown conditions", icon: "🌡️" };
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
  weatherResult.classList.add("hidden");
}

function clearError() {
  errorMessage.textContent = "";
  errorMessage.classList.add("hidden");
}

function setLoading(isLoading) {
  searchBtn.disabled = isLoading;
  searchBtn.textContent = isLoading ? "Searching..." : "Get Weather";
  if (isLoading) {
    loadingIndicator.classList.remove("hidden");
  } else {
    loadingIndicator.classList.add("hidden");
  }
}

async function fetchCityCoordinates(cityQuery) {
  const url = `${GEOCODING_API}?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to reach location service. Please try again.");
  }
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    const notFoundErr = new Error(`City not found: "${cityQuery}". Please check the spelling and try again.`);
    notFoundErr.code = "CITY_NOT_FOUND";
    throw notFoundErr;
  }
  return data.results[0];
}

async function fetchWeatherForCoords(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    wind_speed_unit: "kmh",
  });
  const res = await fetch(`${WEATHER_API}?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch weather data. Please try again later.");
  }
  const data = await res.json();
  if (!data || !data.current) {
    throw new Error("Incomplete weather data received from server.");
  }
  return data.current;
}

function renderWeather(place, current) {
  const info = getWeatherInfo(current.weather_code);
  const regionParts = [place.admin1, place.country].filter(Boolean);

  locationNameEl.textContent = place.name;
  locationRegionEl.textContent = regionParts.join(", ") || "Global";
  weatherUpdatedEl.textContent = "Live";

  weatherIconEl.textContent = info.icon;
  temperatureEl.textContent = Math.round(current.temperature_2m);
  weatherConditionEl.textContent = info.label;

  feelsLikeEl.textContent = `${Math.round(current.apparent_temperature)} °C`;
  humidityEl.textContent = `${current.relative_humidity_2m}%`;
  windSpeedEl.textContent = `${current.wind_speed_10m} km/h`;
  coordinatesEl.textContent = `${Number(place.latitude).toFixed(2)}, ${Number(place.longitude).toFixed(2)}`;

  weatherResult.classList.remove("hidden");
}

async function handleSearch(event) {
  if (event) event.preventDefault();
  clearError();

  const query = cityInput.value.trim();
  if (!query) {
    showError("Please enter a city name.");
    cityInput.focus();
    return;
  }

  if (query.length < 2 || !/[a-zA-Z\u00C0-\u024F]/.test(query)) {
    showError("Please enter a valid city name (at least 2 letters).");
    cityInput.focus();
    return;
  }

  setLoading(true);
  try {
    const place = await fetchCityCoordinates(query);
    const current = await fetchWeatherForCoords(place.latitude, place.longitude);
    renderWeather(place, current);
  } catch (err) {
    showError(err.message || "Unable to retrieve weather information.");
  } finally {
    setLoading(false);
  }
}

searchForm.addEventListener("submit", handleSearch);
